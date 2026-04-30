# photographer / miniapp

摄影师预约小程序的微信小程序前端,Taro 4 + React + TypeScript + Zustand。

## 启动

```bash
cd NviHo/photographer/miniapp/photographer-mp
npm install
npm run dev:weapp
```

然后用微信开发者工具导入这个 `photographer-mp` 目录(注意:**导入根目录,不是 `dist/`**, `project.config.json` 已配置 `miniprogramRoot: dist/`)。

## 工程结构

```
miniapp/photographer-mp/
├── src/
│   ├── app.ts / app.config.ts / app.scss
│   ├── api/
│   │   ├── client.ts          HTTP 封装,BASE_URL 在文件头
│   │   ├── auth.ts            微信登录 / 开发期免登
│   │   ├── categories.ts
│   │   ├── photographers.ts
│   │   └── orders.ts
│   ├── stores/
│   │   └── user.ts            Zustand 用户状态
│   ├── types/index.ts         TS 类型(对齐后端 schemas)
│   ├── pages/
│   │   ├── home/              首页(品类入口 + 摄影师瀑布流)
│   │   ├── photographer/list  列表(品类筛选 + 排序)
│   │   ├── photographer/detail 详情(作品瀑布流 + 套餐 + 评价)
│   │   ├── order/create       下单
│   │   ├── order/list         我的订单(tab 切换状态)
│   │   ├── order/detail       订单详情(支付 / 取消 / 确认 / 评价入口)
│   │   ├── order/review       评价(星级+标签+文字)
│   │   ├── profile            我的(收藏/订单/退出)
│   │   └── login              登录(微信 / 开发期免登)
│   └── components/
│       ├── PhotographerCard/   摄影师卡片(列表用)
│       ├── WorkCard/           作品大图卡片(参考"路明摄影"风格,黑底+日期+#标签)
│       ├── CategoryDrawer/     左侧抽屉式分类菜单
│       ├── PackageItem/        套餐价格项
│       ├── RatingStars/        星级评分
│       └── Empty/              空状态
├── config/index.ts             Taro 编译配置
├── project.config.json         微信小程序配置(AppID 待第 0 周申请后填入)
├── package.json
└── tsconfig.json
```

## 核心 UX 决策

### 作品展示风格(摄影师详情页)

参考飞机发的"路明摄影"小程序设计:

- **黑底 + 大图卡片瀑布流**:每张作品占满宽度,高度 700px
- **元信息悬浮在图下**:拍摄日期(`3/21/2026`)+ 分类标签(`#订婚`)
- **左侧抽屉式分类菜单**:点击右上角 `≡` 弹出,深色风格,黄点表示当前选中
- **底部固定预约按钮**:黑色胶囊按钮,左侧起拍价,右侧"立即预约"

### 订单状态流转

订单详情底部按钮根据状态自动切换:

| 状态 | 按钮 |
|---|---|
| `pending_pay` | 取消订单 / **立即支付** |
| `pending_confirm` / `accepted` | 取消订单 |
| `shooting_done` | 仅确认 / **评价** |
| `reviewed` / `auto_settled` / `settled` | (无操作,已完结) |

### 微信支付占位模式

后端商户号未配置时,前端调 `Taro.requestPayment` 会失败,会自动弹 modal 询问"是否使用 Mock 支付推进订单"。点击确认后调 `POST /api/pm/orders/{id}/mock-pay` 把状态推进到 `pending_confirm`,方便端到端联调摄影师接单流程。

## API 地址

`src/api/client.ts` 顶部:

```ts
// 本地开发(把 IP 改成你 Mac 的局域网 IP)
// const BASE_URL = 'http://192.168.1.100:8001/api/pm';
// 正式环境
const BASE_URL = 'https://www.xinweijia.net/api/pm';
```

切到本地后注意:微信开发者工具"详情 → 本地设置"勾选**不校验合法域名**。

## 与现有 grade-mp 的差异

| 维度 | grade-mp | photographer-mp |
|---|---|---|
| 设计基调 | 紫色教育风 | 黑色 + 暖金(摄影行业 cliché 但管用) |
| 主导航 | 5 个 tab(成绩分析为主) | 3 个 tab(浏览/订单/我的) |
| API 前缀 | `/api/*` | `/api/pm/*` |
| AppID | `wx9526eae4fdd0b157` | (待第 0 周申请) |

## TODO

- [ ] 第 0 周拿到新 AppID 后填进 `project.config.json`
- [ ] 摄影师端页面(`pages/pgr/*`):入驻申请、作品管理、套餐管理、档期日历、订单处理
- [ ] 集成京东云 OSS 直传(等 backend `services/jd_oss.py` 接通后)
- [ ] 订阅消息授权 + 接单/拍摄日提醒
- [ ] 首页 banner 轮播 + 搜索框
