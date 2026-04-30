# photographer / backend

摄影师预约小程序的后端,FastAPI + SQLAlchemy + SQLite,API 前缀 `/api/pm/*`。

## 快速启动

```bash
cd NviHo/photographer/backend
./start.sh
```

脚本会自动:
1. 创建虚拟环境(首次)
2. 安装依赖
3. 复制 `.env.example` → `.env`(首次)
4. 跑 `seed_data.py`(首次)创建品类字典 + 10 位示例摄影师
5. 起 uvicorn 监听 **8001** 端口

启动后:
- API 文档: <http://localhost:8001/docs>
- 健康检查: <http://localhost:8001/api/pm/health>

## 工程结构

```
backend/
├── app/
│   ├── main.py              入口,注册所有路由 + StaticFiles
│   ├── config.py            读 .env(微信/支付/OSS 配置可空)
│   ├── database.py          独立 photographer.db engine
│   ├── deps.py              get_current_user / require_photographer / require_admin
│   ├── models/              SQLAlchemy 模型(pm_* 表)
│   │   ├── user.py          复用 users 表 + pm_role/pm_phone 字段
│   │   ├── category.py      pm_categories
│   │   ├── photographer.py  pm_photographers + 多对多 pm_photographer_categories
│   │   ├── work.py          pm_works
│   │   ├── package.py       pm_packages(套餐/价格表)
│   │   ├── schedule.py      pm_schedules(档期日历)
│   │   ├── order.py         pm_orders + OrderStatus 状态机
│   │   ├── payment.py       pm_payments(支付流水)
│   │   ├── review.py        pm_reviews
│   │   └── favorite.py      pm_favorites
│   ├── schemas/             Pydantic 模型(请求/响应)
│   ├── routers/
│   │   ├── auth.py          /api/pm/auth/*       微信登录 / 开发期免登
│   │   ├── categories.py    /api/pm/categories
│   │   ├── photographers.py /api/pm/photographers/*  列表/详情/档期/收藏
│   │   ├── orders.py        /api/pm/orders/*     完整订单状态机
│   │   ├── payments.py      /api/pm/pay/*        微信支付回调
│   │   ├── uploads.py       /api/pm/uploads/*    OSS 直传签名 + 本地兜底
│   │   ├── pgr.py           /api/pm/pgr/*        摄影师自助管理
│   │   └── admin.py         /api/pm/admin/*      运营审核
│   ├── services/
│   │   ├── jd_oss.py        京东云 OSS 上传(占位/正式 双模式)
│   │   ├── wxpay.py         微信支付(占位/正式 双模式)
│   │   └── hot_score.py     热度算法
│   └── utils/security.py    JWT + bcrypt
├── seed_data.py             初始化品类 + 10 位示例摄影师 + 作品/套餐/档期
├── requirements.txt
├── .env.example
└── start.sh
```

## 占位/正式 双模式说明

为了在第 0 周资质串行(微信支付商户号 / 京东云 OSS)拿到之前就能跑通端到端,以下两个服务支持自动降级:

| 服务 | 占位模式触发条件 | 占位行为 |
|---|---|---|
| 京东云 OSS | `JD_OSS_ACCESS_KEY` 为空 | 上传 PUT 落到本地 `uploads/` 目录,public_url 走 `/uploads/*` |
| 微信支付 | `WX_MCH_ID` 为空 | `prepay` 接口返回 mock 参数;额外提供 `POST /api/pm/orders/{id}/mock-pay` 用于联调 |

填完 `.env` 中的 OSS / 微信支付配置后,服务自动切换到正式模式,无需改代码。

## 部署到京东云服务器

```bash
# 服务器上
cd /data
git clone <repo> NviHo
cd NviHo/photographer/backend
./start.sh   # 测试可启动后改用 systemd

# 配置 systemd:
sudo cp ../docs/photographer-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable photographer-backend
sudo systemctl start photographer-backend
```

Nginx 在 `xinweijia.net` 上分流:

```nginx
location /api/pm/ {
    proxy_pass http://127.0.0.1:8001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
location /uploads/ {
    proxy_pass http://127.0.0.1:8001;
}
location /api/ {
    proxy_pass http://127.0.0.1:8000;  # 成绩分析后端,保持不变
}
```

## 默认账号

`seed_data.py` 跑完后:

| 用户名 | 密码 | 角色 | 用途 |
|---|---|---|---|
| `admin` | `admin` | 平台管理员 | 摄影师审核、热度刷新、代为录入 |
| `lunar_photo` | `123456` | 摄影师 | 示例,共 10 位摄影师 |

开发期联调可调 `POST /api/pm/auth/dev-login` 任意创建普通用户(生产环境应关闭)。

---

## 运营后台手动操作指南

> 用户场景:飞机帮你拉来摄影师,你需要在后台**代为**录入他们的资料、作品、套餐。
>
> MVP 阶段不做单独的 React 后台页面,直接用 FastAPI 自带的 Swagger UI 就够了。
>
> 入口:浏览器打开 <http://localhost:8001/docs>(本地)或 <https://www.xinweijia.net/docs>(线上)。

### 步骤 0:用 admin 账号登录

1. 找到 `POST /api/pm/auth/dev-login` → 点 **Try it out**
2. 请求体:
   ```json
   { "username": "admin", "password": "admin" }
   ```
3. **Execute** → 从响应里复制 `access_token`
4. 点页面右上角 🔓 **Authorize** 按钮
5. 在弹窗 Value 框里输入 `Bearer <粘贴刚才的 access_token>`(注意 Bearer 后有个空格)
6. **Authorize** → **Close**

之后所有 `🔒` 标记的接口都自动带上鉴权。

### 步骤 1:查看品类 ID(只需查一次)

调 `GET /api/pm/categories`(不需要登录),记下 ID:

| ID | 名称 |
|---|---|
| 1 | 婚礼 |
| 2 | 订婚 |
| 3 | 生日 |
| 4 | 写真 |
| 5 | 全家福 |
| 6 | 儿童 |
| 7 | 孕妇 |
| 8 | 商务 |
| 9 | 跟拍 |
| 10 | 毕业季 |

### 步骤 2:上传图片(头像/封面/作品图都走这一个接口)

1. 找到 `POST /api/pm/uploads/direct` → **Try it out**
2. **file** 字段:点击 **Choose File** 选择本地图片(微信压缩过的图就行,不用很大)
3. **scope** 字段:填 `avatar` / `cover` / `work` 之一(只是分文件夹用,不影响功能)
4. **Execute** → 从响应里复制 `public_url`,形如 `/uploads/work/20260430/abc123.jpg`
5. 每张图片重复上面步骤,**把所有 URL 先记到文档里**(便签/Notes/Excel)

> 第 0 周拿到京东云 OSS 凭证后,这一步会自动切换为「客户端直传 OSS」,不再经过本服务器,但操作流程一样。

### 步骤 3:创建摄影师档案

找到 `POST /api/pm/admin/photographers` → **Try it out**,请求体示例:

```json
{
  "username": "luming_zhao",
  "nickname": "路明摄影",
  "intro": "10 年婚礼跟拍经验,擅长自然光与情绪捕捉,作品风格简洁干净。",
  "avatar": "/uploads/avatar/20260430/xxx.jpg",
  "cover_image": "/uploads/cover/20260430/yyy.jpg",
  "base_city": "太原",
  "service_radius_km": 50,
  "service_extra_fee": 200,
  "contact_phone": "13800138000",
  "contact_wechat": "luming_wx",
  "external_portfolio_url": "https://example.com/timebox/luming",
  "years_of_experience": 10,
  "category_ids": [1, 2, 9],
  "auto_approve": true
}
```

**Execute** 后从响应里记下 `id`(摄影师 ID,后面要用)。

字段说明:
- `username`:摄影师登录用户名,英文/拼音,**唯一不能重复**。默认密码 `123456`,告诉摄影师本人后他可自行登录小程序修改资料。
- `category_ids`:从步骤 1 的表里挑(数组)。
- `auto_approve`:`true` = 直接上架; `false` = 进 pending,需要后续点审核才能被搜到(适合质量没把关时)。

### 步骤 4:添加作品(支持单传/批量)

#### 单张
`POST /api/pm/admin/photographers/{photographer_id}/works`,把上一步拿到的摄影师 id 填进 URL:

```json
{
  "image_url": "/uploads/work/20260430/img1.jpg",
  "category_id": 1,
  "is_cover": 1,
  "shoot_date": "2026-03-21",
  "sort": 100
}
```

- `is_cover=1`:在摄影师列表卡片的封面位置展示这张
- `shoot_date`:格式 `YYYY-MM-DD`,小程序作品瀑布流会展示成 `3/21/2026`
- `sort`:数字越大越靠前

#### 批量(推荐,9 张图一次提交)
`POST /api/pm/admin/photographers/{photographer_id}/works/batch`:

```json
{
  "works": [
    { "image_url": "/uploads/work/20260430/1.jpg", "category_id": 1, "is_cover": 1, "shoot_date": "2026-03-21", "sort": 100 },
    { "image_url": "/uploads/work/20260430/2.jpg", "category_id": 1, "shoot_date": "2026-03-15", "sort": 99 },
    { "image_url": "/uploads/work/20260430/3.jpg", "category_id": 2, "shoot_date": "2026-02-28", "sort": 98 }
  ]
}
```

### 步骤 5:添加套餐(必填,否则用户无法下单)

`POST /api/pm/admin/photographers/{photographer_id}/packages`:

```json
{
  "category_id": 1,
  "name": "婚礼半日跟拍 4h",
  "duration_hours": 4,
  "photos_count": 80,
  "description": "婚礼仪式 / 接亲 / 主桌敬酒,单机位",
  "price": 59900
}
```

**`price` 单位是分**(59900 = 599 元)。

一个摄影师在不同品类下都可以加多档套餐,详情页会按品类分组显示。

### 步骤 6:验证录入结果

直接在小程序首页就能看到刚录入的摄影师。或者用浏览器打开:

- <http://localhost:8001/api/pm/photographers> ← 列表
- <http://localhost:8001/api/pm/photographers/{id}> ← 详情(含作品和套餐)

### 修改 / 删除

| 操作 | 接口 |
|---|---|
| 改资料 | `PUT /api/pm/admin/photographers/{id}`(只填要改的字段即可,其余保留) |
| 删作品 | `DELETE /api/pm/admin/photographers/{id}/works/{work_id}` |
| 删套餐 | `DELETE /api/pm/admin/photographers/{id}/packages/{package_id}` |
| 上架 | `POST /api/pm/admin/photographers/{id}/approve` |
| 下架 | `POST /api/pm/admin/photographers/{id}/freeze` |
| 重算所有摄影师热度值 | `POST /api/pm/admin/refresh-hot-score` |

### 一个摄影师典型录入耗时

熟练后约 **5–7 分钟/位**:1 分钟传 8 张作品 + 2 分钟整理 URL + 2 分钟填创建表单 + 1 分钟批量加作品 + 1 分钟加套餐。

10 位种子摄影师 ≈ 1 个晚上能搞定。
