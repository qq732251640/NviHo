# 学习成绩分析系统

基于 React + FastAPI + SQLite 构建的学习成绩分析网站。

## 技术栈

- **前端**: React 18 + TypeScript + Vite 5 + Ant Design + ECharts
- **后端**: Python FastAPI + SQLAlchemy + Pydantic
- **数据库**: SQLite（零配置，自动创建）
- **AI**: Google Gemini API（可选，不配置则使用 Mock 模式）

## 功能特性

### 学生板块
- 成绩录入（按科目批量录入，支持覆盖更新）
- 成绩查看、修改、删除
- AI 成绩分析报告（支持按科目/考试精细化分析）
- 成绩排名、趋势、分布、对比、预测
- 试卷上传与 AI 分析
- 会员体系（免费2次 + 付费额度）

### 教师板块
- CSV/Excel 批量上传成绩（支持全部科目/单科模式）
- 成绩管理（修改、删除、批量删除）
- 上传模板下载
- 班级整体分析报告（按班级/科目/考试组合分析）
- 为学生生成个人分析报告
- 成绩排名、趋势、分布、对比、预测

### 系统功能
- 全国 34 个省级行政区完整区域数据
- 支持小学/初中/高中学段切换
- 不同学段成绩独立隔离
- 学生/教师角色切换
- JWT 认证与权限控制
- 学校自定义创建与模糊搜索

---

## 快速开始

### 环境要求

| 工具 | 版本要求 | 说明 |
|------|---------|------|
| Python | 3.9+ | 后端运行 |
| Node.js | 18+ | 前端运行 |
| npm | 8+ | 前端包管理 |

> 无需安装数据库！本项目使用 SQLite，自动创建数据库文件。

---

### macOS / Linux

```bash
# 1. 启动后端
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python seed_data.py
python seed_regions_full.py
uvicorn app.main:app --reload --port 8000

# 2. 新开终端，启动前端
cd frontend
npm install
npm run dev
```

### Windows（CMD 命令提示符）

```cmd
:: 1. 启动后端
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python seed_data.py
python seed_regions_full.py
uvicorn app.main:app --reload --port 8000

:: 2. 新开 CMD 窗口，启动前端
cd frontend
npm install
npm run dev
```

### Windows（PowerShell）

```powershell
# 1. 启动后端
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python seed_data.py
python seed_regions_full.py
uvicorn app.main:app --reload --port 8000

# 2. 新开 PowerShell 窗口，启动前端
cd frontend
npm install
npm run dev
```

> **PowerShell 执行策略提示**：如果 `Activate.ps1` 报错，先执行：
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

---

### 访问地址

- 前端页面: http://localhost:5173
- 后端 API 文档: http://localhost:8000/docs

---

## 使用流程

1. 打开 http://localhost:5173/register 注册账号
   - 选择角色（学生/教师）、学段、地区、学校（可自定义输入）
2. 登录后进入对应板块
3. **学生**：上传成绩 → 查看分析/排名/趋势
4. **教师**：批量上传 CSV → 查看班级分析/学生管理

### 教师批量上传文件格式

**全部科目模式**（默认）：

| student_name | student_no | subject | score | total_score |
|-------------|-----------|---------|-------|-------------|
| 张三 | 2024001 | 语文 | 92 | 100 |
| 张三 | 2024001 | 数学 | 88 | 100 |
| 李四 | 2024002 | 语文 | 85 | 100 |

**单科模式**：

| student_name | student_no | score | total_score |
|-------------|-----------|-------|-------------|
| 张三 | 2024001 | 92 | 100 |
| 李四 | 2024002 | 85 | 100 |

---

## 配置说明

编辑 `backend/.env`：

```env
# 数据库（默认 SQLite，无需修改）
DATABASE_URL=sqlite:///./grade_analysis.db

# JWT 密钥（生产环境请修改）
SECRET_KEY=your-secret-key-change-in-production

# Gemini API Key（可选，不配置则使用模拟分析）
GEMINI_API_KEY=your-gemini-api-key
```

---

## 项目结构

```
grade-analysis-web/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI 入口
│   │   ├── config.py         # 配置
│   │   ├── database.py       # 数据库连接
│   │   ├── models/           # SQLAlchemy 数据模型
│   │   ├── routers/          # API 路由
│   │   ├── schemas/          # Pydantic 请求/响应模型
│   │   ├── services/         # 业务逻辑（AI分析等）
│   │   └── utils/            # 工具函数（认证/额度/学校）
│   ├── seed_data.py          # 基础种子数据（科目）
│   ├── seed_regions_full.py  # 全国省市区数据
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── api/              # API 请求封装
│   │   ├── components/       # 通用组件（布局/路由守卫）
│   │   ├── pages/            # 页面（auth/student/teacher）
│   │   ├── stores/           # Zustand 状态管理
│   │   ├── types/            # TypeScript 类型定义
│   │   └── utils/
│   ├── package.json
│   └── vite.config.ts
├── start.sh                  # macOS/Linux 一键启动
└── README.md
```

## Windows 常见问题

**Q: `python` 命令找不到？**
A: 确认已安装 Python 并勾选了 "Add to PATH"。也可以尝试 `python3` 或 `py`。

**Q: `pip install` 报错 `Microsoft Visual C++ required`？**
A: 安装 [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)，勾选 "C++ build tools" 工作负载。

**Q: PowerShell 无法执行 `Activate.ps1`？**
A: 执行 `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` 后重试。

**Q: `npm install` 很慢？**
A: 设置淘宝镜像：`npm config set registry https://registry.npmmirror.com`

**Q: 端口被占用？**
A: 后端改端口：`uvicorn app.main:app --reload --port 9000`；前端改端口：编辑 `vite.config.ts` 中的 `server.port`。

---

## Ubuntu 生产部署

### 架构

```
用户浏览器 → Nginx(:80) → 静态文件(前端dist)
                        → 反向代理 /api/ → uvicorn(:8000) → SQLite
```

### 方式一：一键部署脚本

将整个项目上传到 Ubuntu 服务器后执行：

```bash
# 上传项目到服务器（在本地执行）
scp -r grade-analysis-web user@your-server-ip:/tmp/

# SSH 登录服务器后执行
cd /tmp/grade-analysis-web
sudo bash deploy/deploy.sh
```

脚本会自动完成：安装依赖 → 构建前端 → 初始化数据库 → 配置 Nginx → 配置 systemd 服务。

### 方式二：手动分步部署

#### 1. 安装系统依赖

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nginx

# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

#### 2. 部署项目文件

```bash
sudo mkdir -p /opt/grade-analysis-web
sudo cp -r backend frontend /opt/grade-analysis-web/
sudo chown -R www-data:www-data /opt/grade-analysis-web
```

#### 3. 安装后端依赖 & 初始化

```bash
cd /opt/grade-analysis-web/backend
sudo -u www-data python3 -m venv venv
sudo -u www-data venv/bin/pip install -r requirements.txt

# 编辑配置（可选：配置 Gemini API Key）
sudo nano .env

# 初始化种子数据
sudo -u www-data venv/bin/python seed_data.py
sudo -u www-data venv/bin/python seed_regions_full.py
```

#### 4. 构建前端

```bash
cd /opt/grade-analysis-web/frontend
sudo -u www-data npm install
sudo -u www-data npm run build
```

#### 5. 配置 Nginx

```bash
# 创建配置文件
sudo nano /etc/nginx/sites-available/grade-analysis
```

写入以下内容：

```nginx
server {
    listen 80;
    server_name _;  # 替换为你的域名

    client_max_body_size 20M;

    # 前端静态文件
    location / {
        root /opt/grade-analysis-web/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    # 上传文件访问
    location /uploads/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
    }
}
```

启用配置：

```bash
sudo ln -sf /etc/nginx/sites-available/grade-analysis /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

#### 6. 配置 systemd 后台服务

```bash
sudo nano /etc/systemd/system/grade-analysis.service
```

写入以下内容：

```ini
[Unit]
Description=Grade Analysis Web Backend
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/grade-analysis-web/backend
Environment=PATH=/opt/grade-analysis-web/backend/venv/bin:/usr/bin
ExecStart=/opt/grade-analysis-web/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable grade-analysis
sudo systemctl start grade-analysis
```

#### 7. 验证

```bash
# 检查后端服务状态
sudo systemctl status grade-analysis

# 检查 Nginx 状态
sudo systemctl status nginx

# 测试 API
curl http://localhost/api/health
```

浏览器访问 `http://服务器IP` 即可。

### 日常运维命令

```bash
# 查看后端日志
sudo journalctl -u grade-analysis -f

# 重启后端
sudo systemctl restart grade-analysis

# 重启 Nginx
sudo systemctl restart nginx

# 更新代码后重新部署
cd /opt/grade-analysis-web/backend
sudo -u www-data venv/bin/pip install -r requirements.txt
sudo systemctl restart grade-analysis

cd /opt/grade-analysis-web/frontend
sudo -u www-data npm install && sudo -u www-data npm run build
sudo systemctl reload nginx
```

### 配置 HTTPS（可选）

```bash
# 安装 certbot
sudo apt install -y certbot python3-certbot-nginx

# 申请证书（替换为你的域名）
sudo certbot --nginx -d grades.example.com

# 自动续签
sudo crontab -e
# 添加：0 3 * * * certbot renew --quiet
```

### 防火墙配置

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 常用命令速查

### Mac 本地开发

```bash
# 启动后端
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 启动前端
cd frontend
npm run dev

# 前端编译检查
cd frontend && npx tsc --noEmit

# 前端生产构建
cd frontend && npm run build

# 推送代码到 GitHub
git add . && git commit -m "改动说明" && git push
```

### 云服务器操作

```bash
# SSH 登录
ssh root@111.235.10.86

# ---------- 代理管理（科学上网）----------

# 查看当前代理
echo $http_proxy

# 临时取消代理（apt install 前执行）
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY

# 恢复代理（apt install 后执行）
source ~/.bashrc

# ---------- 拉取最新代码 ----------

cd /data/NviHo
git -c http.proxy=http://127.0.0.1:7890 -c https.proxy=http://127.0.0.1:7890 pull

# ---------- 后端更新 ----------

# 重启后端服务
systemctl restart grade-analysis

# 查看后端状态
systemctl status grade-analysis

# 查看后端日志（实时）
journalctl -u grade-analysis -f

# 查看最近30条日志
journalctl -u grade-analysis -n 30 --no-pager

# 进入后端虚拟环境（安装依赖等）
cd /data/grade-analysis-backend
source venv/bin/activate
pip install -r requirements.txt

# 初始化/重置数据库
python seed_data.py
python seed_regions_full.py

# ---------- Web 前端更新 ----------

cd /data/NviHo/grade-analysis-web/frontend
npm install
npx vite build
systemctl reload nginx

# ---------- Nginx 管理 ----------

# 测试配置
nginx -t

# 重载配置（不中断服务）
systemctl reload nginx

# 查看配置
cat /etc/nginx/sites-available/aipic

# 编辑配置
nano /etc/nginx/sites-available/aipic

# ---------- SSL 证书 ----------

# 查看证书状态
certbot certificates

# 手动续期
certbot renew

# ---------- 服务管理 ----------

# 查看所有自定义服务
systemctl list-units --type=service | grep -E 'grade|aipic|nginx'

# 查看端口占用
ss -tlnp | grep -E ':80|:443|:8000|:7861'

# ---------- 完整更新流程（一键） ----------
npm run build:weapp
一次性编译，改完代码要手动再执行
npm run dev:weapp
监听模式，保存文件后自动重新编译，微信开发者工具也会自动刷新
本地手动编译
cd "/Users/haoyingwei/郝英伟/github_nviho/NviHo/grade-analysis-miniapp/grade-mp" && npm run build:weapp



# 服务器上执行（你之前的部署命令 + 安装新依赖 httpx）
cd /data/NviHo && \
git -c http.proxy=http://127.0.0.1:7890 -c https.proxy=http://127.0.0.1:7890 pull && \
cd grade-analysis-web/backend && pip install httpx && \
systemctl restart grade-analysis && \
cd ../frontend && npx vite build && \
systemctl reload nginx && \
echo "✅ 更新完成"
```

### 访问地址

| 服务 | 地址 |
|------|------|
| Web 版 | https://www.xinweijia.net/app/ |
| API 文档 | https://www.xinweijia.net/api/docs |
| API 健康检查 | https://www.xinweijia.net/api/health |
| 原有 aipic 服务 | https://www.xinweijia.net/ |
