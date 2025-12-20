/**
 * 单词本组件
 * 支持单词的增删改查、搜索、导入导出
 * 自动查询音标和释义
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  getWordBook, 
  searchWords, 
  addWord, 
  updateWord,
  deleteWord, 
  generateWordAudio,
  backupWordBook,
  lookupWord,
  EXPORT_CSV_URL,
  EXPORT_JSON_URL,
  Word
} from '../services/api';
import './WordBook.css';

interface WordBookProps {
  initialWord?: string;
  onClose?: () => void;
}

export const WordBook: React.FC<WordBookProps> = ({ initialWord, onClose }) => {
  const [words, setWords] = useState<Word[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 新单词表单
  const [newWord, setNewWord] = useState({
    word: '',
    phonetic: '',
    meaning: '',
    source: ''
  });

  // 编辑单词表单
  const [editWord, setEditWord] = useState<{
    originalWord: string;
    word: string;
    phonetic: string;
    meaning: string;
    source: string;
  } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // 当前播放的单词音频
  const [playingWord, setPlayingWord] = useState<string | null>(null);

  // 加载单词本
  const loadWords = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = searchQuery.trim() 
        ? await searchWords(searchQuery)
        : await getWordBook();
      setWords(data.words);
    } catch (err) {
      console.error('加载单词本失败:', err);
      showMessage('error', '加载单词本失败');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  // 如果传入了初始单词，自动打开添加弹窗并查询
  useEffect(() => {
    if (initialWord) {
      setNewWord(prev => ({ ...prev, word: initialWord, phonetic: '', meaning: '' }));
      setShowAddModal(true);
      // 自动查询单词信息
      autoLookupWord(initialWord);
    }
  }, [initialWord]);

  // 自动查询单词音标和释义
  const autoLookupWord = async (word: string) => {
    if (!word.trim()) return;
    
    setIsLookingUp(true);
    try {
      const result = await lookupWord(word);
      if (result.success) {
        setNewWord(prev => ({
          ...prev,
          phonetic: result.phonetic || prev.phonetic,
          meaning: result.meaning || prev.meaning
        }));
        if (result.phonetic || result.meaning) {
          showMessage('success', '已自动填充音标和释义');
        }
      }
    } catch (err) {
      console.error('查询单词失败:', err);
    } finally {
      setIsLookingUp(false);
    }
  };

  // 手动触发查询
  const handleLookup = () => {
    if (newWord.word.trim()) {
      autoLookupWord(newWord.word);
    }
  };

  // 显示消息提示
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // 添加单词
  const handleAddWord = async () => {
    if (!newWord.word.trim()) {
      showMessage('error', '请输入单词');
      return;
    }
    
    // 如果没有释义，自动查询后再添加
    if (!newWord.meaning.trim()) {
      setIsLookingUp(true);
      try {
        const result = await lookupWord(newWord.word);
        if (result.meaning) {
          setNewWord(prev => ({
            ...prev,
            phonetic: result.phonetic || prev.phonetic,
            meaning: result.meaning
          }));
          // 更新后继续添加
          await doAddWord({
            ...newWord,
            phonetic: result.phonetic || newWord.phonetic,
            meaning: result.meaning
          });
          return;
        } else {
          showMessage('error', '未找到释义，请手动输入');
          setIsLookingUp(false);
          return;
        }
      } catch (err) {
        showMessage('error', '查询失败，请手动输入释义');
        setIsLookingUp(false);
        return;
      }
    }
    
    await doAddWord(newWord);
  };

  // 实际添加单词的函数
  const doAddWord = async (wordData: typeof newWord) => {
    if (!wordData.word.trim() || !wordData.meaning.trim()) {
      showMessage('error', '单词和释义为必填项');
      setIsLookingUp(false);
      return;
    }

    try {
      await addWord(wordData);
      
      // 为单词生成发音
      try {
        await generateWordAudio(wordData.word);
      } catch (err) {
        console.warn('单词发音生成失败:', err);
      }

      showMessage('success', '单词已添加');
      setShowAddModal(false);
      setNewWord({ word: '', phonetic: '', meaning: '', source: '' });
      setIsLookingUp(false);
      loadWords();
      
      // 清除待添加状态，防止再次打开弹窗
      if (onClose) {
        onClose();
      }
    } catch (err) {
      showMessage('error', '添加单词失败');
      setIsLookingUp(false);
    }
  };

  // 删除单词
  const handleDeleteWord = async (word: string) => {
    if (!window.confirm(`确定要删除单词 "${word}" 吗？`)) return;

    try {
      await deleteWord(word);
      showMessage('success', '单词已删除');
      loadWords();
    } catch (err) {
      showMessage('error', '删除单词失败');
    }
  };

  // 打开编辑弹窗
  const handleEditWord = (word: Word) => {
    setEditWord({
      originalWord: word.word,
      word: word.word,
      phonetic: word.phonetic || '',
      meaning: word.meaning,
      source: word.source || ''
    });
    setShowEditModal(true);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editWord) return;
    
    if (!editWord.meaning.trim()) {
      showMessage('error', '释义不能为空');
      return;
    }

    try {
      await updateWord(editWord.originalWord, {
        phonetic: editWord.phonetic,
        meaning: editWord.meaning,
        source: editWord.source
      });
      showMessage('success', '单词已更新');
      setShowEditModal(false);
      setEditWord(null);
      loadWords();
    } catch (err) {
      showMessage('error', '更新单词失败');
    }
  };

  // 编辑弹窗中查询单词信息
  const handleEditLookup = async () => {
    if (!editWord?.word.trim()) return;
    
    setIsLookingUp(true);
    try {
      const result = await lookupWord(editWord.word);
      if (result.success) {
        setEditWord(prev => prev ? {
          ...prev,
          phonetic: result.phonetic || prev.phonetic,
          meaning: result.meaning || prev.meaning
        } : null);
        if (result.phonetic || result.meaning) {
          showMessage('success', '已填充音标和释义');
        }
      }
    } catch (err) {
      console.error('查询单词失败:', err);
    } finally {
      setIsLookingUp(false);
    }
  };

  // 播放单词发音
  const handlePlayWord = async (word: Word) => {
    try {
      setPlayingWord(word.word);
      
      // 确保音频存在
      const result = await generateWordAudio(word.word);
      
      // 播放音频
      const audio = new Audio(result.audioPath);
      audio.onended = () => setPlayingWord(null);
      audio.onerror = () => {
        setPlayingWord(null);
        showMessage('error', '音频播放失败');
      };
      audio.play();
    } catch (err) {
      setPlayingWord(null);
      showMessage('error', '获取发音失败');
    }
  };

  // 创建备份
  const handleBackup = async () => {
    try {
      await backupWordBook();
      showMessage('success', '备份创建成功');
    } catch (err) {
      showMessage('error', '备份失败');
    }
  };

  // 格式化日期
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <div className="wordbook">
      {/* 消息提示 */}
      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* 头部 */}
      <div className="wordbook-header">
        <div className="header-left">
          <h2>📚 单词本 ({words.length})</h2>
        </div>
        <div className="header-right">
          <button className="btn-add" onClick={() => setShowAddModal(true)}>
            ➕ 添加单词
          </button>
          {onClose && (
            <button className="btn-close" onClick={onClose}>✕</button>
          )}
        </div>
      </div>

      {/* 搜索和工具栏 */}
      <div className="wordbook-toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="搜索单词、释义或来源..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
        <div className="toolbar-actions">
          <a href={EXPORT_CSV_URL} className="btn-export" download>
            📊 导出CSV
          </a>
          <a href={EXPORT_JSON_URL} className="btn-export" download>
            📄 导出JSON
          </a>
          <button className="btn-backup" onClick={handleBackup}>
            💾 备份
          </button>
        </div>
      </div>

      {/* 单词列表 */}
      <div className="wordbook-list">
        {isLoading ? (
          <div className="loading-state">加载中...</div>
        ) : words.length === 0 ? (
          <div className="empty-state">
            {searchQuery ? '没有找到匹配的单词' : '单词本是空的，开始添加你的第一个单词吧！'}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>单词</th>
                <th>音标</th>
                <th>释义</th>
                <th>来源</th>
                <th>添加日期</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {words.map((word) => (
                <tr key={word.word}>
                  <td className="word-cell">
                    <span className="word-text">{word.word}</span>
                    <button 
                      className={`btn-play ${playingWord === word.word ? 'playing' : ''}`}
                      onClick={() => handlePlayWord(word)}
                      title="播放发音"
                    >
                      {playingWord === word.word ? '🔊' : '🔈'}
                    </button>
                  </td>
                  <td className="phonetic-cell">{word.phonetic || '-'}</td>
                  <td className="meaning-cell">{word.meaning}</td>
                  <td className="source-cell">{word.source || '-'}</td>
                  <td className="date-cell">{formatDate(word.addedAt)}</td>
                  <td className="actions-cell">
                    <button 
                      className="btn-edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditWord(word);
                      }}
                      title="编辑"
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWord(word.word);
                      }}
                      title="删除"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 添加单词弹窗 */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>添加单词</h3>
            <div className="form-group">
              <label>单词 *</label>
              <div className="input-with-button">
                <input
                  type="text"
                  value={newWord.word}
                  onChange={(e) => setNewWord(prev => ({ ...prev, word: e.target.value }))}
                  onBlur={() => {
                    // 失焦时自动查询
                    if (newWord.word.trim() && !newWord.meaning) {
                      autoLookupWord(newWord.word);
                    }
                  }}
                  placeholder="例如: ubiquitous"
                  autoFocus
                />
                <button 
                  type="button"
                  className="btn-lookup"
                  onClick={handleLookup}
                  disabled={isLookingUp || !newWord.word.trim()}
                  title="查询音标和释义"
                >
                  {isLookingUp ? '⏳' : '🔍'}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>音标 {isLookingUp && <span className="loading-hint">（查询中...）</span>}</label>
              <input
                type="text"
                value={newWord.phonetic}
                onChange={(e) => setNewWord(prev => ({ ...prev, phonetic: e.target.value }))}
                placeholder={isLookingUp ? '正在查询...' : '例如: /juːˈbɪkwɪtəs/'}
                disabled={isLookingUp}
              />
            </div>
            <div className="form-group">
              <label>释义 {isLookingUp && <span className="loading-hint">（查询中...）</span>}</label>
              <textarea
                value={newWord.meaning}
                onChange={(e) => setNewWord(prev => ({ ...prev, meaning: e.target.value }))}
                placeholder={isLookingUp ? '正在查询...' : '例如: 无所不在的；十分普遍的'}
                disabled={isLookingUp}
              />
            </div>
            <div className="form-group">
              <label>来源</label>
              <input
                type="text"
                value={newWord.source}
                onChange={(e) => setNewWord(prev => ({ ...prev, source: e.target.value }))}
                placeholder="例如: 2023年12月六级真题"
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => {
                setShowAddModal(false);
                setNewWord({ word: '', phonetic: '', meaning: '', source: '' });
              }}>
                取消
              </button>
              <button 
                className="btn-submit" 
                onClick={handleAddWord}
                disabled={isLookingUp}
              >
                {isLookingUp ? '查询中...' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑单词弹窗 */}
      {showEditModal && editWord && (
        <div className="modal-overlay" onClick={() => {
          setShowEditModal(false);
          setEditWord(null);
        }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>编辑单词</h3>
            <div className="form-group">
              <label>单词</label>
              <div className="input-with-button">
                <input
                  type="text"
                  value={editWord.word}
                  disabled
                  className="disabled-input"
                />
                <button 
                  type="button"
                  className="btn-lookup"
                  onClick={handleEditLookup}
                  disabled={isLookingUp}
                  title="重新查询音标和释义"
                >
                  {isLookingUp ? '⏳' : '🔍'}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>音标 {isLookingUp && <span className="loading-hint">（查询中...）</span>}</label>
              <input
                type="text"
                value={editWord.phonetic}
                onChange={(e) => setEditWord(prev => prev ? { ...prev, phonetic: e.target.value } : null)}
                placeholder="例如: /juːˈbɪkwɪtəs/"
                disabled={isLookingUp}
              />
            </div>
            <div className="form-group">
              <label>释义 * {isLookingUp && <span className="loading-hint">（查询中...）</span>}</label>
              <textarea
                value={editWord.meaning}
                onChange={(e) => setEditWord(prev => prev ? { ...prev, meaning: e.target.value } : null)}
                placeholder="例如: 无所不在的；十分普遍的"
                disabled={isLookingUp}
              />
            </div>
            <div className="form-group">
              <label>来源</label>
              <input
                type="text"
                value={editWord.source}
                onChange={(e) => setEditWord(prev => prev ? { ...prev, source: e.target.value } : null)}
                placeholder="例如: 2023年12月六级真题"
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => {
                setShowEditModal(false);
                setEditWord(null);
              }}>
                取消
              </button>
              <button 
                className="btn-submit" 
                onClick={handleSaveEdit}
                disabled={isLookingUp}
              >
                {isLookingUp ? '查询中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WordBook;
