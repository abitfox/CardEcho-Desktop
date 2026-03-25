<div align="center">
  <h1>CardEcho Desktop</h1>
  
  <p align="center">
    🎧 智能闪卡学习应用 · AI 驱动的听力训练平台
  </p>
  
  <p align="center">
    <a href="#功能特性">功能特性</a> ·
    <a href="#技术栈">技术栈</a> ·
    <a href="#快速开始">快速开始</a> ·
    <a href="#部署指南">部署指南</a> ·
    <a href="#项目结构">项目结构</a>
  </p>
</div>

---

## 📖 项目简介

**CardEcho Desktop** 是一款基于 AI 的闪卡学习应用，专为语言学习者设计。通过集成 DeepSeek AI 和语音合成技术，为用户提供个性化的听力训练、单词解析和语境学习体验。

主要特点：
- 🤖 **AI 驱动**：使用 DeepSeek AI 生成单词解析、训练内容和语法注释
- 🎯 **个性化学习**：支持自定义学习目标和每日学习量
- 📚 **商城系统**：订阅和分享优质学习卡组
- 👥 **用户管理**：支持管理员、VIP 和普通用户三级权限
- 🔐 **数据同步**：基于 Supabase 实现云端数据同步

---

## ✨ 功能特性

### 核心功能
| 功能模块 | 描述 |
|---------|------|
| 📖 卡片学习 | 逐句精听、逐词解析、语境学习 |
| 🎧 听力训练 | AI 生成的挑战模式，逐词填空训练 |
| 📊 学习统计 | 学习时长、完成卡片数、连续打卡天数 |
| 🏪 商城系统 | 浏览、订阅、发布学习卡组 |
| 👤 个人中心 | 学习进度、订阅管理、账户设置 |
| ⚙️ 系统设置 | AI 模型配置、语速调节、语言切换 |

### 管理员功能
- 🛠️ 卡组编辑与管理
- 👥 用户管理界面
- 📈 数据库测试工具
- 🔍 Debug 调试窗口

---

## 🛠️ 技术栈

| 类别 | 技术 |
|-----|------|
| **前端框架** | React 19 + TypeScript |
| **构建工具** | Vite 6 |
| **UI 组件** | Lucide React 图标库 |
| **动画库** | Motion |
| **后端服务** | Supabase |
| **AI 服务** | DeepSeek API |
| **语音合成** | 豆包 TTS |

---

## 🚀 快速开始

### 前置要求
- Node.js 18+ 
- npm 或 pnpm
- Supabase 账号（用于数据同步）
- DeepSeek API Key

### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/abitfox/CardEcho-Desktop.git
cd CardEcho-Desktop

# 2. 安装依赖
npm install

# 3. 配置环境变量
# 复制 .env.local 并修改以下配置
```

### 环境变量配置

编辑 `.env.local` 文件：

```bash
# DeepSeek AI API Key
DEEPSEEK_API_KEY=your_deepseek_api_key

# Gemini API Key (可选)
GEMINI_API_KEY=your_gemini_api_key

# Supabase 配置
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 启动开发服务器

```bash
# 启动开发环境
npm run dev

# 访问 http://localhost:5173
```

### 构建生产版本

```bash
# 构建
npm run build

# 预览构建结果
npm run preview
```

---

## 📦 部署指南

### 方式一：Vercel 部署（推荐）

1. 安装 Vercel CLI：
```bash
npm install -g vercel
```

2. 登录并部署：
```bash
vercel login
vercel --prod
```

3. 在 Vercel 控制台配置环境变量：
   - `DEEPSEEK_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

### 方式二：Docker 部署

1. 创建 `Dockerfile`：
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 4173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
```

2. 构建并运行：
```bash
docker build -t cardecho-desktop .
docker run -p 4173:4173 cardecho-desktop
```

### 方式三：静态托管

```bash
# 构建生产版本
npm run build

# 将 dist/ 目录部署到任意静态主机
# 如：Netlify, GitHub Pages, Cloudflare Pages 等
```

---

## 📁 项目结构

```
CardEcho-Desktop/
├── components/           # React 组件
│   ├── App.tsx          # 主应用组件
│   ├── Auth.tsx         # 认证组件
│   ├── CardPlayer.tsx   # 卡片播放器
│   ├── ChallengeMode.tsx # 挑战模式
│   ├── ContentCreator.tsx # 内容创作
│   ├── DeckEditor.tsx   # 卡组编辑器
│   ├── Library.tsx      # 卡组库
│   ├── Settings.tsx     # 设置页面
│   ├── Store.tsx        # 商城页面
│   ├── Statistics.tsx   # 统计数据
│   └── UserManagement.tsx # 用户管理
├── services/            # 服务层
│   ├── aiService.ts     # AI 服务
│   ├── cloudService.ts  # 云服务
│   ├── database.ts      # 数据库
│   ├── i18n.ts          # 国际化
│   └── doubaoService.ts # 豆包语音服务
├── docs/                # 文档
├── types.ts             # TypeScript 类型定义
├── constants.ts         # 常量配置
├── package.json         # 项目配置
└── vite.config.ts       # Vite 配置
```

---

## 👥 用户角色

| 角色 | 权限 |
|-----|------|
| 👑 管理员 (role=1) | 所有功能 + 用户管理 + 数据库测试 |
| ⭐ VIP 用户 (role=2) | 高级功能 + 无限订阅 |
| 👤 普通用户 | 基础学习功能 |

默认管理员用户名：`cardecho`, `kimi`, `jack`, `admin`

---

## 🔧 开发命令

```bash
# 开发环境
npm run dev          # 启动开发服务器

# 代码质量
npm run lint         # TypeScript 类型检查

# 构建
npm run build        # 构建生产版本
npm run preview      # 预览构建结果
```

---

## 📝 许可证

MIT License

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

<div align="center">
  <sub>Built with ❤️ by CardEcho Team</sub>
</div>
