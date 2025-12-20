# 🎓 四六级/考研英语学习应用

一个专为四六级和考研英语学习打造的本地应用，支持文档解析、单词本管理、TTS发音等功能，完全离线运行，数据本地存储。

---

## ✨ 功能特性

### 📄 文档学习模块

#### 1. 文档上传与解析
- **支持格式**: PDF、Word (`.docx`, `.doc`)、TXT
- **上传方式**: 
  - 点击上传按钮选择文件
  - 直接拖拽文件到上传区域
  - 直接粘贴文本内容
- **智能分句**: 自动将文档内容按句子分段，便于逐句学习

#### 2. 句子展示与交互
- 逐句显示文档内容
- 每个句子可独立播放TTS语音
- 支持单词点选，快速添加到单词本
- 实时音频播放进度显示

#### 3. TTS语音合成
- 基于 Edge-TTS 的高质量语音合成
- 美式英语标准发音 (Jenny Neural)
- 支持整句播放和单词发音
- 音频自动缓存，重复播放无需重新生成

---

### 📚 单词本模块

#### 1. 单词管理
- **添加单词**:
  - 从文档句子中点击单词快速添加
  - 手动输入新单词
  - 自动查询音标和中文释义（有道词典 + Free Dictionary API）
  - 可自定义来源标记（如：四级真题、考研阅读等）

- **编辑单词**:
  - 修改音标、释义、来源
  - 支持原地编辑，无需删除重建

- **删除单词**:
  - 一键删除不需要的单词
  - 确认弹窗防止误删

#### 2. 搜索与过滤
- 实时搜索单词、音标或释义
- 模糊匹配，支持部分关键词查询
- 按添加时间倒序显示（最新添加在最前）

#### 3. 发音功能
- 每个单词独立播放按钮
- 支持单词级 TTS 语音合成
- 播放状态实时反馈

#### 4. 数据导出
- **CSV 格式**: 适用于 Excel、Anki 等工具
  - 包含字段: 单词、音标、释义、来源、添加时间
  - 一键下载，方便制作单词卡片

- **JSON 格式**: 完整数据备份
  - 保留所有字段和元数据
  - 可用于数据迁移或程序化处理

#### 5. 自动备份
- 每次修改单词本时自动生成备份
- 备份文件存储在 `backend/data/backups/` 目录
- 文件名格式: `wordbook_backup_YYYY-MM-DDTHH-MM-SS-SSSZ.json`

---

## 🚀 安装与启动

### 环境要求

- **Node.js**: v14 或更高版本
- **Python**: 3.7+ (用于 Edge-TTS，已集成虚拟环境)
- **操作系统**: Windows (已配置批处理脚本)

### 初次安装

1. **克隆或下载项目**到本地目录（如 `D:\English change\`）

2. **安装依赖**:

   ```bash
   # 安装后端依赖
   cd english-learning-app/backend
   npm install

   # 安装前端依赖
   cd ../frontend
   npm install
   ```

3. **配置 Edge-TTS** (如未安装):
   
   项目已预配置 Python 虚拟环境，Edge-TTS 应该已经安装。如需重新安装：

   ```bash
   # 确保在项目根目录的虚拟环境中
   cd "D:\English change"
   .venv\Scripts\Activate.ps1
   pip install edge-tts
   ```

---

## 🎬 如何开启应用

### 方法一：一键启动（推荐）

1. 双击运行 **`启动应用.bat`**
2. 等待约 5 秒，程序会自动：
   - 启动后端服务（端口 3001）
   - 启动前端开发服务器（端口 5173）
   - 打开默认浏览器访问 `http://localhost:5173`
3. 启动完成后会打开两个命令行窗口：
   - **英语学习-后端服务**: 保持运行，提供 API 服务
   - **英语学习-前端服务**: 保持运行，提供网页界面

> 📌 **注意**: 启动期间不要关闭弹出的命令行窗口！

### 方法二：手动启动

<!-- # 先进入项目根目录
cd "D:\English change\english-learning-app" -->
**终端 1 - 后端**:
```bash
cd "D:\English change\english-learning-app\backend"
npm start
```

**终端 2 - 前端**:
```bash
cd "D:\English change\english-learning-app\frontend"
npm run dev
```

然后在浏览器访问: `http://localhost:5173`

---

## 🛑 如何关闭应用

### 方法一：一键关闭（推荐）

1. 双击运行 **`关闭应用.bat`**
2. 脚本会自动关闭所有 Node.js 进程（后端和前端服务）
3. 按任意键退出关闭脚本

### 方法二：手动关闭

在启动应用时打开的两个命令行窗口中：
- 按 `Ctrl + C` 停止服务
- 或直接关闭窗口

---

## 📁 项目结构

```
english-learning-app/
├── 启动应用.bat           # 一键启动脚本
├── 关闭应用.bat           # 一键关闭脚本
├── README.md             # 项目说明文档（本文件）
│
├── backend/              # 后端服务（Node.js + Express）
│   ├── src/
│   │   ├── index.js                 # 主入口，启动服务器
│   │   └── routes/
│   │       ├── documentRoutes.js    # 文档解析路由
│   │       ├── ttsRoutes.js         # TTS语音合成路由
│   │       └── wordBookRoutes.js    # 单词本管理路由
│   ├── data/
│   │   ├── wordbook.json            # 单词本数据（JSON格式）
│   │   └── backups/                 # 自动备份目录
│   ├── public/
│   │   └── audio/                   # TTS生成的音频文件缓存
│   ├── uploads/                     # 上传的文档临时存储
│   └── package.json
│
└── frontend/             # 前端界面（React + TypeScript + Vite）
    ├── src/
    │   ├── App.tsx                  # 主应用组件
    │   ├── main.tsx                 # 入口文件
    │   ├── components/              # 功能组件
    │   │   ├── DocumentUploader.tsx # 文档上传组件
    │   │   ├── SentenceList.tsx     # 句子列表组件
    │   │   └── WordBook.tsx         # 单词本组件
    │   ├── hooks/                   # 自定义 Hooks
    │   │   ├── useAudioPlayer.ts    # 音频播放逻辑
    │   │   └── useWordSelection.ts  # 单词选择逻辑
    │   ├── services/
    │   │   └── api.ts               # API 请求封装
    │   └── styles/                  # 样式文件
    └── package.json
```

---

## 🔧 技术栈

### 后端
- **Node.js + Express**: 轻量级 Web 服务器
- **Multer**: 文件上传处理
- **pdf-parse**: PDF 解析
- **mammoth**: Word 文档解析
- **Edge-TTS**: 微软免费 TTS 引擎（Python）
- **有道词典 API**: 中文释义查询（免费）
- **Free Dictionary API**: 英文释义和音标补充

### 前端
- **React 18**: 用户界面框架
- **TypeScript**: 类型安全
- **Vite**: 快速开发构建工具
- **Axios**: HTTP 请求库

---

## 📊 数据存储

所有数据均存储在本地，无需联网（除查词和 TTS）：

- **单词本数据**: `backend/data/wordbook.json`
- **自动备份**: `backend/data/backups/`
- **音频缓存**: `backend/public/audio/`
- **上传文档**: `backend/uploads/` (临时)

---

## ❓ 常见问题

### Q1: 启动后浏览器显示"无法访问此网站"？
**A**: 等待 5-10 秒让服务完全启动，然后刷新页面。或检查终端是否有报错信息。

### Q2: 单词发音不出声？
**A**: 确保：
1. 系统音量未静音
2. Edge-TTS 已正确安装（运行 `edge-tts --version` 检查）
3. 网络连接正常（首次生成需要联网）

### Q3: 单词查询不到释义？
**A**: 
1. 检查网络连接
2. 确认输入的单词拼写正确
3. 可以手动输入释义后添加

### Q4: 如何导入已有单词本？
**A**: 
1. 关闭应用
2. 用已有的 `wordbook.json` 替换 `backend/data/wordbook.json`
3. 重新启动应用

### Q5: 找不到 `backend` 或 `frontend` 目录？
**A**: 确保在 `english-learning-app` 项目根目录下运行命令，而不是 `D:\English change\` 目录。

---

## 🔐 隐私说明

- ✅ 所有单词本数据存储在本地，不会上传到任何服务器
- ✅ 文档解析完全在本地进行
- ⚠️ TTS 语音合成需要联网调用微软 Edge-TTS 服务
- ⚠️ 单词查询需要联网调用有道词典和 Free Dictionary API

---

## 📝 更新日志

### v1.0.0 (2025-12-19)
- ✨ 初始版本发布
- ✅ 支持 PDF/Word/TXT 文档解析
- ✅ 完整的单词本管理功能
- ✅ TTS 语音合成
- ✅ 自动查词和备份
- ✅ CSV/JSON 导出功能

---

## 📧 反馈与建议

如有问题或建议，欢迎通过以下方式反馈：
- 在项目目录创建 `feedback.txt` 记录问题
- 或直接修改代码提交改进

---

## 📄 许可证

本项目仅供个人学习使用，请勿用于商业用途。

---

**🎉 祝学习顺利，考试成功！**
