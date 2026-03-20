# 学习成绩分析 - 微信小程序

基于 Taro 4 + React 开发的微信小程序，复用现有 FastAPI 后端。

## 项目结构

```
grade-mp/
├── src/
│   ├── api/          # API 请求（复用后端接口）
│   ├── stores/       # Zustand 状态管理
│   ├── pages/
│   │   ├── index/    # 启动页（自动跳转）
│   │   ├── login/    # 登录
│   │   ├── register/ # 注册
│   │   ├── student/  # 学生板块（含图表页面）
│   │   ├── teacher/  # 教师板块
│   │   └── profile/  # 我的（角色/学段/学校切换）
│   ├── assets/       # TabBar 图标
│   ├── app.ts        # 入口
│   ├── app.config.ts # 路由配置
│   └── app.scss      # 全局样式
├── config/           # Taro 编译配置
├── project.config.json  # 微信小程序配置
└── package.json
```

## API 地址配置

编辑 `src/api/client.ts`：

```typescript
// 本地开发（Mac 局域网 IP）
// const BASE_URL = 'http://172.17.8.225:8000/api';

// 正式环境
const BASE_URL = 'https://www.xinweijia.net/api';
```

---

## 常用命令速查

### Mac 本地开发

```bash
# 启动本地后端（小程序和 Web 共用）
cd ~/郝英伟/github_nviho/NviHo/grade-analysis-web/backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 小程序开发模式（watch 自动编译）
cd ~/郝英伟/github_nviho/NviHo/grade-analysis-miniapp/grade-mp
npm run dev:weapp

# 完整重新编译（修改了 config 文件后必须执行）
rm -rf dist && npx taro build --type weapp

# 生产构建（上传前执行）
rm -rf dist && NODE_ENV=production npx taro build --type weapp

# 推送代码到 GitHub
cd ~/郝英伟/github_nviho/NviHo
git add . && git commit -m "改动说明" && git push
```

### 微信开发者工具

```
导入目录: ~/郝英伟/github_nviho/NviHo/grade-analysis-miniapp/grade-mp
（不是 dist 目录，project.config.json 中已配置 miniprogramRoot: dist/）

常用操作:
- 编译按钮: 刷新项目（代码改动后点这个）
- 上传按钮: 发布到微信服务器（右上角）
- 预览按钮: 生成二维码手机扫码预览
- 真机调试: 连接手机调试（注意需同一 WiFi 或用 HTTPS 地址）
```

### 切换本地/线上 API

```bash
# 切换到本地开发
# 编辑 src/api/client.ts，取消注释本地 IP 行，注释线上行

# 切换到线上
# 编辑 src/api/client.ts，注释本地 IP 行，取消注释线上行

# 切换后需要重新编译
rm -rf dist && npx taro build --type weapp
```

### 云服务器操作

```bash
# ---------- 代理管理（科学上网）----------

# 临时取消代理（apt install 前执行）
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY

# 恢复代理
source ~/.bashrc

# ---------- 拉取最新代码 ----------

cd /data/NviHo
git -c http.proxy=http://127.0.0.1:7890 -c https.proxy=http://127.0.0.1:7890 pull

# ---------- 更新后端（小程序和 Web 共用后端）----------

# 重启后端
systemctl restart grade-analysis

# 查看状态
systemctl status grade-analysis

# 查看日志
journalctl -u grade-analysis -f

# 安装新依赖后
cd /data/grade-analysis-backend
source venv/bin/activate
pip install -r requirements.txt
systemctl restart grade-analysis

# ---------- 完整更新流程（一键） ----------

cd /data/NviHo && \
git -c http.proxy=http://127.0.0.1:7890 -c https.proxy=http://127.0.0.1:7890 pull && \
systemctl restart grade-analysis && \
echo "✅ 后端更新完成"
```

### 发布流程

```
1. Mac 上修改代码并测试
2. git push 推到 GitHub
3. 服务器上 git pull + systemctl restart（后端改动）
4. Mac 上 npx taro build（前端改动）
5. 微信开发者工具上传新版本
6. 微信公众平台设为体验版或提交审核
```

---

## 微信后台配置

| 配置项 | 值 |
|--------|------|
| request 合法域名 | https://www.xinweijia.net |
| uploadFile 合法域名 | https://www.xinweijia.net |

## 注意事项

- 本地开发时在微信开发者工具「详情」→「本地设置」勾选「不校验合法域名」
- 手机真机调试需要 Mac 和手机在同一 WiFi，且后端监听 0.0.0.0
- 修改 `app.config.ts`（TabBar 等）后必须完整重编译（`rm -rf dist && npx taro build`）
- TabBar 图标要求 81x81px PNG，路径在 `src/assets/`
