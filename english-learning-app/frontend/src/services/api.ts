/**
 * API服务配置
 * 统一管理前端与后端的通信
 */

import axios from 'axios';

// API基础URL（开发环境通过Vite代理，生产环境直连）
const API_BASE_URL = '/api';

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60秒超时（TTS生成可能较慢）
  headers: {
    'Content-Type': 'application/json'
  }
});

// ==================== 文档解析API ====================

/**
 * 上传并解析文档
 * @param file - 文件对象 (PDF/Word/TXT)
 */
export const uploadDocument = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/document/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

/**
 * 解析文本内容
 * @param text - 原始文本
 */
export const parseText = async (text: string) => {
  const response = await api.post('/document/parse-text', { text });
  return response.data;
};

// ==================== TTS语音合成API ====================

/**
 * 获取可用音色列表
 */
export const getVoices = async () => {
  const response = await api.get('/tts/voices');
  return response.data;
};

/**
 * 生成单条音频
 * @param text - 文本内容
 * @param voice - 音色ID
 * @param rate - 语速调整
 */
export const generateAudio = async (
  text: string, 
  voice?: string, 
  rate?: string
) => {
  const response = await api.post('/tts/generate', { text, voice, rate });
  return response.data;
};

/**
 * 批量生成音频
 * @param sentences - 句子数组
 * @param voice - 音色ID
 * @param rate - 语速调整
 */
export const generateBatchAudio = async (
  sentences: string[], 
  voice?: string, 
  rate?: string
) => {
  const response = await api.post('/tts/generate-batch', { sentences, voice, rate });
  return response.data;
};

/**
 * 为单词生成发音音频
 * @param word - 单词
 * @param voice - 音色ID
 */
export const generateWordAudio = async (word: string, voice?: string) => {
  const response = await api.post('/tts/generate-word', { word, voice });
  return response.data;
};

/**
 * 检查TTS服务状态
 */
export const checkTtsStatus = async () => {
  const response = await api.get('/tts/status');
  return response.data;
};

// ==================== 单词本API ====================

export interface Word {
  word: string;
  phonetic: string;
  meaning: string;
  source: string;
  addedAt: string;
  audioPath: string;
}

export interface WordLookupResult {
  success: boolean;
  word: string;
  phonetic: string;
  meaning: string;
}

/**
 * 查询单词的音标和释义（从词典API）
 * @param word - 要查询的单词
 */
export const lookupWord = async (word: string): Promise<WordLookupResult> => {
  const response = await api.get(`/wordbook/lookup/${encodeURIComponent(word)}`);
  return response.data;
};

/**
 * 获取所有单词
 */
export const getWordBook = async () => {
  const response = await api.get('/wordbook');
  return response.data;
};

/**
 * 搜索单词本中的单词
 * @param query - 搜索关键词
 */
export const searchWords = async (query: string) => {
  const response = await api.get('/wordbook/search', { params: { q: query } });
  return response.data;
};

/**
 * 添加单词
 * @param word - 单词信息
 */
export const addWord = async (word: Omit<Word, 'addedAt' | 'audioPath'>) => {
  const response = await api.post('/wordbook', word);
  return response.data;
};

/**
 * 更新单词
 * @param targetWord - 目标单词
 * @param updates - 更新内容
 */
export const updateWord = async (
  targetWord: string, 
  updates: Partial<Word>
) => {
  const response = await api.put(`/wordbook/${encodeURIComponent(targetWord)}`, updates);
  return response.data;
};

/**
 * 删除单词
 * @param word - 要删除的单词
 */
export const deleteWord = async (word: string) => {
  const response = await api.delete(`/wordbook/${encodeURIComponent(word)}`);
  return response.data;
};

/**
 * 创建单词本备份
 */
export const backupWordBook = async () => {
  const response = await api.post('/wordbook/backup');
  return response.data;
};

/**
 * 导入单词本
 * @param words - 单词数组
 * @param merge - 是否合并（默认true）
 */
export const importWordBook = async (words: Word[], merge = true) => {
  const response = await api.post('/wordbook/import', { words, merge });
  return response.data;
};

// 导出CSV和JSON的下载链接
export const EXPORT_CSV_URL = `${API_BASE_URL}/wordbook/export/csv`;
export const EXPORT_JSON_URL = `${API_BASE_URL}/wordbook/export/json`;

// ==================== 健康检查 ====================

export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;
