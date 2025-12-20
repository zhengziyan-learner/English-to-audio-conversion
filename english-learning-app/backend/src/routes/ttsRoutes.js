/**
 * TTS语音合成路由 - 基于edge-tts
 * 支持多种英语音色，逐句生成音频
 * 优化：并行生成 + 超时处理
 */

const express = require('express');
const router = express.Router();
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// 音频输出目录
const audioDir = path.join(__dirname, '../../public/audio');

// 并行生成数量限制（避免系统资源耗尽）
const MAX_CONCURRENT = 5;

/**
 * 可用的英语音色列表
 * 适用于四六级/考研英语学习场景
 */
const VOICE_OPTIONS = {
  // 美式英语
  'en-US-JennyNeural': { name: 'Jenny (美式女声)', gender: 'female', locale: 'en-US' },
  'en-US-GuyNeural': { name: 'Guy (美式男声)', gender: 'male', locale: 'en-US' },
  'en-US-AriaNeural': { name: 'Aria (美式女声-自然)', gender: 'female', locale: 'en-US' },
  'en-US-DavisNeural': { name: 'Davis (美式男声-自然)', gender: 'male', locale: 'en-US' },
  // 英式英语
  'en-GB-SoniaNeural': { name: 'Sonia (英式女声)', gender: 'female', locale: 'en-GB' },
  'en-GB-RyanNeural': { name: 'Ryan (英式男声)', gender: 'male', locale: 'en-GB' },
  // 澳式英语
  'en-AU-NatashaNeural': { name: 'Natasha (澳式女声)', gender: 'female', locale: 'en-AU' },
  'en-AU-WilliamNeural': { name: 'William (澳式男声)', gender: 'male', locale: 'en-AU' }
};

// 默认音色（美式英语女声，适合四六级听力练习）
const DEFAULT_VOICE = 'en-US-JennyNeural';

// 检查edge-tts是否可用
let edgeTtsAvailable = false;
let edgeTtsPath = 'edge-tts';

function checkEdgeTts() {
  try {
    // 尝试多种可能的路径
    const possiblePaths = [
      'edge-tts',
      'python -m edge_tts',
      'python3 -m edge_tts'
    ];
    
    for (const cmd of possiblePaths) {
      try {
        execSync(`${cmd} --version`, { stdio: 'ignore', timeout: 5000 });
        edgeTtsPath = cmd;
        edgeTtsAvailable = true;
        console.log(`✅ edge-tts 可用: ${cmd}`);
        return true;
      } catch (e) {
        continue;
      }
    }
    
    console.error('❌ edge-tts 未找到，请安装: pip install edge-tts');
    return false;
  } catch (error) {
    console.error('❌ edge-tts 检查失败:', error.message);
    return false;
  }
}

// 启动时检查
checkEdgeTts();

/**
 * 使用edge-tts生成音频（使用execSync同步执行，更可靠）
 * @param {string} text - 要转换的文本
 * @param {string} voice - 音色ID
 * @param {string} outputPath - 输出文件路径
 * @param {string} rate - 语速调整（如 +10% 或 -20%）
 * @returns {Promise<string>} 生成的音频文件路径
 */
function generateAudio(text, voice, outputPath, rate = '+0%') {
  return new Promise((resolve, reject) => {
    // 清理文本中的特殊字符，处理引号和换行
    const cleanText = text
      .replace(/"/g, "'")
      .replace(/\n/g, ' ')
      .replace(/\r/g, '')
      .trim();
    
    if (!cleanText) {
      reject(new Error('文本内容为空'));
      return;
    }

    // 构建完整命令行（Windows兼容）
    const command = `edge-tts --text "${cleanText}" --voice ${voice} --rate ${rate} --write-media "${outputPath}"`;

    console.log(`🎤 生成音频: "${cleanText.substring(0, 40)}..."`);

    try {
      execSync(command, { 
        stdio: 'pipe',
        timeout: 60000,  // 60秒超时
        windowsHide: true
      });
      
      // 检查文件是否生成成功
      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        if (stats.size > 0) {
          console.log(`✅ 音频生成成功: ${path.basename(outputPath)} (${stats.size} bytes)`);
          resolve(outputPath);
        } else {
          reject(new Error('生成的音频文件为空'));
        }
      } else {
        reject(new Error('音频文件未生成'));
      }
    } catch (err) {
      console.error(`❌ edge-tts执行失败:`, err.message);
      reject(new Error(`edge-tts执行失败: ${err.message}`));
    }
  });
}

/**
 * 并行执行任务（限制并发数）
 */
async function parallelLimit(tasks, limit) {
  const results = [];
  const executing = [];
  
  for (const task of tasks) {
    const p = Promise.resolve().then(() => task());
    results.push(p);
    
    if (limit <= tasks.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  
  return Promise.allSettled(results);
}

/**
 * GET /api/tts/voices
 * 获取可用的音色列表
 */
router.get('/voices', (req, res) => {
  const voices = Object.entries(VOICE_OPTIONS).map(([id, info]) => ({
    id,
    ...info
  }));
  res.json({ voices, default: DEFAULT_VOICE });
});

/**
 * POST /api/tts/generate
 * 生成单条文本的音频
 */
router.post('/generate', async (req, res) => {
  try {
    const { text, voice = DEFAULT_VOICE, rate = '+0%' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: '请提供有效的文本内容' });
    }

    // 验证音色
    if (!VOICE_OPTIONS[voice]) {
      return res.status(400).json({ 
        error: '无效的音色ID', 
        available: Object.keys(VOICE_OPTIONS) 
      });
    }

    // 生成唯一文件名
    const filename = `${uuidv4()}.mp3`;
    const outputPath = path.join(audioDir, filename);

    await generateAudio(text, voice, outputPath, rate);

    res.json({
      success: true,
      audioPath: `/audio/${filename}`,
      text,
      voice: VOICE_OPTIONS[voice].name
    });
  } catch (error) {
    console.error('❌ TTS生成错误:', error);
    res.status(500).json({ error: 'TTS生成失败', message: error.message });
  }
});

/**
 * GET /api/tts/status
 * 检查TTS服务状态
 */
router.get('/status', (req, res) => {
  res.json({
    available: edgeTtsAvailable,
    command: edgeTtsPath,
    message: edgeTtsAvailable ? 'edge-tts 服务正常' : '请安装 edge-tts: pip install edge-tts'
  });
});

/**
 * POST /api/tts/generate-batch
 * 批量生成多句文本的音频（并行生成，大幅提速）
 */
router.post('/generate-batch', async (req, res) => {
  try {
    const { sentences, voice = DEFAULT_VOICE, rate = '+0%' } = req.body;

    if (!Array.isArray(sentences) || sentences.length === 0) {
      return res.status(400).json({ error: '请提供有效的句子数组' });
    }

    // 验证音色
    if (!VOICE_OPTIONS[voice]) {
      return res.status(400).json({ 
        error: '无效的音色ID', 
        available: Object.keys(VOICE_OPTIONS) 
      });
    }

    // 检查edge-tts是否可用
    if (!edgeTtsAvailable) {
      checkEdgeTts(); // 再次检查
      if (!edgeTtsAvailable) {
        return res.status(500).json({ 
          error: 'edge-tts 未安装', 
          message: '请运行: pip install edge-tts' 
        });
      }
    }

    const batchId = uuidv4();
    console.log(`📚 开始并行生成 ${sentences.length} 条音频 (批次: ${batchId})`);

    // 准备任务列表
    const tasks = sentences.map((sentence, i) => {
      return async () => {
        const text = sentence.trim();
        if (!text) {
          return { index: i, text: '', audioPath: null, success: false, error: '空文本' };
        }

        const filename = `${batchId}_${String(i + 1).padStart(3, '0')}.mp3`;
        const outputPath = path.join(audioDir, filename);

        try {
          await generateAudio(text, voice, outputPath, rate);
          return {
            index: i,
            text,
            audioPath: `/audio/${filename}`,
            success: true
          };
        } catch (err) {
          console.error(`❌ 第 ${i + 1} 句生成失败:`, err.message);
          return {
            index: i,
            text,
            audioPath: null,
            success: false,
            error: err.message
          };
        }
      };
    });

    // 并行执行（限制并发数）
    const settledResults = await parallelLimit(tasks, MAX_CONCURRENT);
    
    // 整理结果
    const results = settledResults.map((r, i) => {
      if (r.status === 'fulfilled') {
        return r.value;
      }
      return {
        index: i,
        text: sentences[i],
        audioPath: null,
        success: false,
        error: r.reason?.message || '未知错误'
      };
    });

    // 按索引排序
    results.sort((a, b) => a.index - b.index);

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ 批量生成完成: ${successCount}/${sentences.length} 成功`);

    res.json({
      success: true,
      batchId,
      total: sentences.length,
      successCount,
      results
    });
  } catch (error) {
    console.error('❌ 批量TTS生成错误:', error);
    res.status(500).json({ error: '批量TTS生成失败', message: error.message });
  }
});

/**
 * POST /api/tts/generate-word
 * 为单词生成发音音频（用于单词本）
 */
router.post('/generate-word', async (req, res) => {
  try {
    const { word, voice = DEFAULT_VOICE } = req.body;

    if (!word || typeof word !== 'string') {
      return res.status(400).json({ error: '请提供有效的单词' });
    }

    // 使用单词作为文件名（清理特殊字符）
    const safeWord = word.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `word_${safeWord}.mp3`;
    const outputPath = path.join(audioDir, filename);

    // 检查是否已存在（避免重复生成）
    if (fs.existsSync(outputPath)) {
      return res.json({
        success: true,
        audioPath: `/audio/${filename}`,
        word,
        cached: true
      });
    }

    await generateAudio(word, voice, outputPath, '+0%');

    res.json({
      success: true,
      audioPath: `/audio/${filename}`,
      word,
      cached: false
    });
  } catch (error) {
    console.error('❌ 单词TTS生成错误:', error);
    res.status(500).json({ error: '单词TTS生成失败', message: error.message });
  }
});

module.exports = router;
