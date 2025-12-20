/**
 * 单词本管理路由 - 本地JSON文件存储
 * 支持增删改查、导出功能
 * 集成免费词典API自动查询音标和释义
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

// 单词本JSON文件路径
const WORDBOOK_PATH = path.join(__dirname, '../../data/wordbook.json');

/**
 * 从有道词典API查询单词信息（返回中文释义，适合考研）
 * @param {string} word - 要查询的单词
 * @returns {Promise<{phonetic: string, meaning: string}>}
 */
async function lookupWord(word) {
  // 首先尝试有道词典获取中文释义
  const youdaoResult = await lookupYoudao(word);
  
  // 如果有道词典没有音标，尝试从Free Dictionary补充
  if (!youdaoResult.phonetic && youdaoResult.meaning) {
    const freeResult = await lookupFreeDict(word);
    youdaoResult.phonetic = freeResult.phonetic || '';
  }
  
  return youdaoResult;
}

/**
 * 有道词典查询（中文释义）
 */
async function lookupYoudao(word) {
  return new Promise((resolve) => {
    // 使用有道词典的免费查询接口
    const url = `http://dict.youdao.com/suggest?q=${encodeURIComponent(word.toLowerCase())}&le=eng&num=1&doctype=json`;
    
    http.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            resolve({ phonetic: '', meaning: '' });
            return;
          }
          
          const json = JSON.parse(data);
          
          // 使用另一个接口获取详细释义
          lookupYoudaoDetail(word).then(result => {
            resolve(result);
          });
        } catch (e) {
          console.error('有道词典解析错误:', e);
          resolve({ phonetic: '', meaning: '' });
        }
      });
    }).on('error', (e) => {
      console.error('有道词典请求错误:', e);
      resolve({ phonetic: '', meaning: '' });
    }).on('timeout', () => {
      resolve({ phonetic: '', meaning: '' });
    });
  });
}

/**
 * 有道词典详细查询（获取中文释义和音标）
 */
async function lookupYoudaoDetail(word) {
  return new Promise((resolve) => {
    // 使用有道词典的jsonp接口
    const url = `http://dict.youdao.com/jsonapi?q=${encodeURIComponent(word.toLowerCase())}&doctype=json`;
    
    http.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            resolve({ phonetic: '', meaning: '' });
            return;
          }
          
          const json = JSON.parse(data);
          let phonetic = '';
          let meaning = '';
          
          // 提取音标
          if (json.ec && json.ec.word && json.ec.word[0]) {
            const wordInfo = json.ec.word[0];
            if (wordInfo.ukphone) {
              phonetic = `/${wordInfo.ukphone}/`;
            } else if (wordInfo.usphone) {
              phonetic = `/${wordInfo.usphone}/`;
            }
            
            // 提取中文释义
            if (wordInfo.trs && wordInfo.trs.length > 0) {
              const meanings = wordInfo.trs.slice(0, 4).map(tr => {
                if (tr.tr && tr.tr[0] && tr.tr[0].l && tr.tr[0].l.i) {
                  return tr.tr[0].l.i.join('');
                }
                return '';
              }).filter(m => m);
              meaning = meanings.join('；');
            }
          }
          
          // 备用：从simple dict提取
          if (!meaning && json.simple && json.simple.word && json.simple.word[0]) {
            const simpleWord = json.simple.word[0];
            if (simpleWord.trs) {
              meaning = simpleWord.trs.map(tr => tr.tr[0]?.l?.i?.join('') || '').filter(m => m).join('；');
            }
          }
          
          // 如果还是没有，尝试从web翻译获取
          if (!meaning && json.web_trans && json.web_trans['web-translation']) {
            const webTrans = json.web_trans['web-translation'][0];
            if (webTrans && webTrans.trans) {
              meaning = webTrans.trans.slice(0, 3).map(t => t.value).filter(v => v).join('；');
            }
          }
          
          resolve({ phonetic, meaning });
        } catch (e) {
          console.error('有道词典详细解析错误:', e);
          resolve({ phonetic: '', meaning: '' });
        }
      });
    }).on('error', (e) => {
      console.error('有道词典详细请求错误:', e);
      resolve({ phonetic: '', meaning: '' });
    }).on('timeout', () => {
      resolve({ phonetic: '', meaning: '' });
    });
  });
}

/**
 * Free Dictionary API（补充音标）
 */
async function lookupFreeDict(word) {
  return new Promise((resolve) => {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`;
    
    https.get(url, { timeout: 8000 }, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            resolve({ phonetic: '', meaning: '' });
            return;
          }
          
          const json = JSON.parse(data);
          if (!Array.isArray(json) || json.length === 0) {
            resolve({ phonetic: '', meaning: '' });
            return;
          }
          
          const entry = json[0];
          let phonetic = entry.phonetic || '';
          if (!phonetic && entry.phonetics && entry.phonetics.length > 0) {
            phonetic = entry.phonetics.find(p => p.text)?.text || '';
          }
          
          resolve({ phonetic, meaning: '' });
        } catch (e) {
          resolve({ phonetic: '', meaning: '' });
        }
      });
    }).on('error', () => {
      resolve({ phonetic: '', meaning: '' });
    }).on('timeout', () => {
      resolve({ phonetic: '', meaning: '' });
    });
  });
}

/**
 * 读取单词本数据
 * @returns {Array} 单词列表
 */
function readWordBook() {
  try {
    const data = fs.readFileSync(WORDBOOK_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取单词本失败:', error);
    return [];
  }
}

/**
 * 保存单词本数据
 * @param {Array} words - 单词列表
 */
function saveWordBook(words) {
  fs.writeFileSync(WORDBOOK_PATH, JSON.stringify(words, null, 2), 'utf-8');
}

/**
 * GET /api/wordbook
 * 获取所有单词
 */
router.get('/', (req, res) => {
  try {
    const words = readWordBook();
    res.json({
      success: true,
      total: words.length,
      words
    });
  } catch (error) {
    res.status(500).json({ error: '获取单词本失败', message: error.message });
  }
});

/**
 * GET /api/wordbook/lookup/:word
 * 查询单词的音标和释义（从免费词典API）
 */
router.get('/lookup/:word', async (req, res) => {
  try {
    const { word } = req.params;
    
    if (!word || typeof word !== 'string') {
      return res.status(400).json({ error: '请提供有效的单词' });
    }

    console.log(`🔍 查询单词: ${word}`);
    
    const result = await lookupWord(word);
    
    res.json({
      success: true,
      word: word.toLowerCase(),
      phonetic: result.phonetic,
      meaning: result.meaning
    });
  } catch (error) {
    console.error('单词查询失败:', error);
    res.status(500).json({ error: '单词查询失败', message: error.message });
  }
});

/**
 * GET /api/wordbook/search
 * 搜索单词本中的单词
 */
router.get('/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: '请提供搜索关键词' });
    }

    const words = readWordBook();
    const keyword = q.toLowerCase();
    
    const results = words.filter(word => 
      word.word.toLowerCase().includes(keyword) ||
      word.meaning.includes(keyword) ||
      (word.source && word.source.includes(keyword))
    );

    res.json({
      success: true,
      total: results.length,
      words: results
    });
  } catch (error) {
    res.status(500).json({ error: '搜索单词失败', message: error.message });
  }
});

/**
 * POST /api/wordbook
 * 添加新单词
 */
router.post('/', (req, res) => {
  try {
    const { word, phonetic, meaning, source } = req.body;

    if (!word || !meaning) {
      return res.status(400).json({ error: '单词和释义为必填项' });
    }

    const words = readWordBook();
    
    // 检查是否已存在
    const existingIndex = words.findIndex(
      w => w.word.toLowerCase() === word.toLowerCase()
    );

    const newWord = {
      word: word.trim(),
      phonetic: phonetic || '',
      meaning: meaning.trim(),
      source: source || '',
      addedAt: new Date().toISOString(),
      audioPath: `/audio/word_${word.toLowerCase().replace(/[^a-z0-9]/g, '_')}.mp3`
    };

    if (existingIndex !== -1) {
      // 更新已存在的单词
      words[existingIndex] = { ...words[existingIndex], ...newWord };
    } else {
      // 添加新单词
      words.push(newWord);
    }

    saveWordBook(words);

    res.json({
      success: true,
      message: existingIndex !== -1 ? '单词已更新' : '单词已添加',
      word: newWord
    });
  } catch (error) {
    res.status(500).json({ error: '添加单词失败', message: error.message });
  }
});

/**
 * PUT /api/wordbook/:word
 * 更新单词信息
 */
router.put('/:word', (req, res) => {
  try {
    const { word: targetWord } = req.params;
    const { phonetic, meaning, source } = req.body;

    const words = readWordBook();
    const index = words.findIndex(
      w => w.word.toLowerCase() === targetWord.toLowerCase()
    );

    if (index === -1) {
      return res.status(404).json({ error: '单词不存在' });
    }

    // 更新字段
    if (phonetic !== undefined) words[index].phonetic = phonetic;
    if (meaning !== undefined) words[index].meaning = meaning;
    if (source !== undefined) words[index].source = source;

    saveWordBook(words);

    res.json({
      success: true,
      message: '单词已更新',
      word: words[index]
    });
  } catch (error) {
    res.status(500).json({ error: '更新单词失败', message: error.message });
  }
});

/**
 * DELETE /api/wordbook/:word
 * 删除单词
 */
router.delete('/:word', (req, res) => {
  try {
    const { word: targetWord } = req.params;

    const words = readWordBook();
    const index = words.findIndex(
      w => w.word.toLowerCase() === targetWord.toLowerCase()
    );

    if (index === -1) {
      return res.status(404).json({ error: '单词不存在' });
    }

    const deletedWord = words.splice(index, 1)[0];
    saveWordBook(words);

    res.json({
      success: true,
      message: '单词已删除',
      word: deletedWord
    });
  } catch (error) {
    res.status(500).json({ error: '删除单词失败', message: error.message });
  }
});

/**
 * GET /api/wordbook/export/json
 * 导出单词本为JSON
 */
router.get('/export/json', (req, res) => {
  try {
    const words = readWordBook();
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=wordbook_${Date.now()}.json`);
    res.send(JSON.stringify(words, null, 2));
  } catch (error) {
    res.status(500).json({ error: '导出失败', message: error.message });
  }
});

/**
 * GET /api/wordbook/export/csv
 * 导出单词本为CSV（可用Excel打开）
 */
router.get('/export/csv', (req, res) => {
  try {
    const words = readWordBook();
    
    // CSV表头
    const headers = ['单词', '音标', '释义', '来源', '添加时间', '音频路径'];
    
    // 生成CSV内容（使用UTF-8 BOM确保中文正常显示）
    const BOM = '\uFEFF';
    const csvRows = [
      headers.join(','),
      ...words.map(w => [
        `"${w.word}"`,
        `"${w.phonetic || ''}"`,
        `"${w.meaning.replace(/"/g, '""')}"`,
        `"${w.source || ''}"`,
        `"${w.addedAt}"`,
        `"${w.audioPath || ''}"`
      ].join(','))
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=wordbook_${Date.now()}.csv`);
    res.send(BOM + csvRows.join('\n'));
  } catch (error) {
    res.status(500).json({ error: '导出失败', message: error.message });
  }
});

/**
 * POST /api/wordbook/import
 * 导入单词本（JSON格式）
 */
router.post('/import', (req, res) => {
  try {
    const { words: importWords, merge = true } = req.body;

    if (!Array.isArray(importWords)) {
      return res.status(400).json({ error: '请提供有效的单词数组' });
    }

    let currentWords = merge ? readWordBook() : [];
    let addedCount = 0;
    let updatedCount = 0;

    importWords.forEach(importWord => {
      if (!importWord.word || !importWord.meaning) return;

      const existingIndex = currentWords.findIndex(
        w => w.word.toLowerCase() === importWord.word.toLowerCase()
      );

      const wordData = {
        word: importWord.word.trim(),
        phonetic: importWord.phonetic || '',
        meaning: importWord.meaning.trim(),
        source: importWord.source || '',
        addedAt: importWord.addedAt || new Date().toISOString(),
        audioPath: importWord.audioPath || `/audio/word_${importWord.word.toLowerCase().replace(/[^a-z0-9]/g, '_')}.mp3`
      };

      if (existingIndex !== -1) {
        currentWords[existingIndex] = wordData;
        updatedCount++;
      } else {
        currentWords.push(wordData);
        addedCount++;
      }
    });

    saveWordBook(currentWords);

    res.json({
      success: true,
      message: `导入完成：新增 ${addedCount} 个，更新 ${updatedCount} 个`,
      total: currentWords.length
    });
  } catch (error) {
    res.status(500).json({ error: '导入失败', message: error.message });
  }
});

/**
 * POST /api/wordbook/backup
 * 创建单词本备份
 */
router.post('/backup', (req, res) => {
  try {
    const words = readWordBook();
    const backupDir = path.join(__dirname, '../../data/backups');
    
    // 确保备份目录存在
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `wordbook_backup_${timestamp}.json`);
    
    fs.writeFileSync(backupPath, JSON.stringify(words, null, 2), 'utf-8');

    res.json({
      success: true,
      message: '备份创建成功',
      backupPath: backupPath,
      wordCount: words.length
    });
  } catch (error) {
    res.status(500).json({ error: '备份失败', message: error.message });
  }
});

module.exports = router;
