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
│   │   ├── student/  # 学生板块（10个页面）
│   │   └── teacher/  # 教师板块（9个页面）
│   ├── assets/       # TabBar 图标
│   ├── app.ts        # 入口
│   ├── app.config.ts # 路由配置
│   └── app.scss      # 全局样式
├── config/           # Taro 编译配置
├── project.config.json  # 微信小程序配置
└── package.json
```

## 开发步骤

### 1. 确保后端运行中

```bash
cd ~/grade-analysis-web/backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### 2. 修改 API 地址

编辑 `src/api/client.ts`，将 `BASE_URL` 改为你的后端地址：

```typescript
// 本地开发
const BASE_URL = 'http://localhost:8000/api';

// 部署后改为服务器地址
// const BASE_URL = 'https://your-domain.com/api';
```

### 3. 启动开发

```bash
cd grade-mp
npm install
npm run dev:weapp
```

### 4. 微信开发者工具预览

1. 打开[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 导入项目，目录选择 `grade-mp/dist`
3. AppID 填 `touristappid`（体验版）或你的真实 AppID

## 注意事项

- 微信小程序本地开发时需在开发者工具中开启「不校验合法域名」
- 正式发布需在微信后台配置服务器域名白名单
- TabBar 图标为占位符，正式使用请替换 `src/assets/` 下的 PNG 图片（建议 81x81px）
