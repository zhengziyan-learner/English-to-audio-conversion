/**
 * 四六级/考研英语学习应用 - 后端主入口
 * 端口: 3001
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// 路由导入
const documentRoutes = require('./routes/documentRoutes');
const ttsRoutes = require('./routes/ttsRoutes');
const wordBookRoutes = require('./routes/wordBookRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件配置
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], // Vite开发服务器
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务 - 音频文件
const audioDir = path.join(__dirname, '../public/audio');
const uploadsDir = path.join(__dirname, '../uploads');
const dataDir = path.join(__dirname, '../data');

// 确保必要目录存在
[audioDir, uploadsDir, dataDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ 创建目录: ${dir}`);
  }
});

// 初始化单词本JSON文件
const wordBookPath = path.join(dataDir, 'wordbook.json');
if (!fs.existsSync(wordBookPath)) {
  fs.writeFileSync(wordBookPath, '[]', 'utf-8');
  console.log('✅ 初始化单词本文件');
}

app.use('/audio', express.static(audioDir));
app.use('/uploads', express.static(uploadsDir));

// API路由
app.use('/api/document', documentRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/wordbook', wordBookRoutes);

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: '英语学习应用后端运行正常',
    timestamp: new Date().toISOString()
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('❌ 服务器错误:', err);
  res.status(500).json({ 
    error: '服务器内部错误', 
    message: err.message 
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════╗
  ║   四六级/考研英语学习应用 - 后端服务        ║
  ╠════════════════════════════════════════════╣
  ║   🚀 服务地址: http://localhost:${PORT}       ║
  ║   📁 音频目录: ${audioDir}   ║
  ║   📚 单词本: ${wordBookPath}   ║
  ╚════════════════════════════════════════════╝
  `);
});
