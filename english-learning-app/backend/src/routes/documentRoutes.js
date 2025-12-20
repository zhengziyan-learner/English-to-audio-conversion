/**
 * 文档解析路由 - 支持PDF和Word文档
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { v4: uuidv4 } = require('uuid');

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../../uploads');
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // 保留原始文件扩展名
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB限制
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.doc', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件格式，仅支持PDF、Word、TXT文件'));
    }
  }
});

/**
 * 解析PDF文档
 * @param {string} filePath - PDF文件路径
 * @returns {Promise<string>} 提取的文本内容
 */
async function parsePDF(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

/**
 * 解析Word文档 (docx)
 * @param {string} filePath - Word文件路径
 * @returns {Promise<string>} 提取的文本内容
 */
async function parseWord(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

/**
 * 解析TXT文本文件
 * @param {string} filePath - TXT文件路径
 * @returns {string} 文本内容
 */
function parseTXT(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * 英文文本分句
 * 按句号、问号、感叹号分割，适用于英语学习场景
 * @param {string} text - 原始文本
 * @returns {string[]} 分句后的数组
 */
function splitIntoSentences(text) {
  // 清理文本：移除多余空白和换行
  const cleanedText = text
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 按句号、问号、感叹号分割（保留分隔符）
  const sentences = cleanedText
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return sentences;
}

/**
 * POST /api/document/upload
 * 上传并解析文档
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传文件' });
    }

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    let text = '';

    console.log(`📄 解析文档: ${req.file.originalname}`);

    // 根据文件类型选择解析方法
    switch (ext) {
      case '.pdf':
        text = await parsePDF(filePath);
        break;
      case '.docx':
      case '.doc':
        text = await parseWord(filePath);
        break;
      case '.txt':
        text = parseTXT(filePath);
        break;
      default:
        return res.status(400).json({ error: '不支持的文件格式' });
    }

    // 分句处理
    const sentences = splitIntoSentences(text);

    console.log(`✅ 解析完成，共 ${sentences.length} 句`);

    res.json({
      success: true,
      filename: req.file.originalname,
      totalSentences: sentences.length,
      sentences,
      rawText: text
    });
  } catch (error) {
    console.error('❌ 文档解析错误:', error);
    res.status(500).json({ error: '文档解析失败', message: error.message });
  }
});

/**
 * POST /api/document/parse-text
 * 直接解析文本内容（无需上传文件）
 */
router.post('/parse-text', (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: '请提供有效的文本内容' });
    }

    const sentences = splitIntoSentences(text);

    res.json({
      success: true,
      totalSentences: sentences.length,
      sentences
    });
  } catch (error) {
    console.error('❌ 文本解析错误:', error);
    res.status(500).json({ error: '文本解析失败', message: error.message });
  }
});

module.exports = router;
