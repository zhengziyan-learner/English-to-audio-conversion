/**
 * 句子列表组件
 * 显示解析后的句子，支持音频生成和播放
 * 支持句子编辑、解释添加、历史记录
 */

import React, { useState, useEffect, useCallback } from 'react';
import { generateBatchAudio, getVoices } from '../services/api';
import AudioPlayer from './AudioPlayer';
import './SentenceList.css';

interface Voice {
  id: string;
  name: string;
  gender: string;
  locale: string;
}

// 单个句子项的数据结构
interface SentenceItem {
  id: string;
  text: string;
  explanation: string;  // 解释/笔记
  audioPath: string | null;
  hasAudio: boolean;
}

interface SentenceListProps {
  sentences: string[];
  onWordSelect?: (word: string) => void;
}

// 生成唯一ID
const generateId = () => `sentence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// localStorage键名
const STORAGE_KEY = 'english_app_sentence_history';
const MAX_HISTORY = 20;

export const SentenceList: React.FC<SentenceListProps> = ({ sentences: inputSentences, onWordSelect }) => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('en-US-JennyNeural');
  const [selectedRate, setSelectedRate] = useState<string>('+0%');
  
  // 句子列表状态
  const [sentenceItems, setSentenceItems] = useState<SentenceItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState<number | null>(null);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  
  // 连续播放定时器
  const [playTimer, setPlayTimer] = useState<number | null>(null);  // 剩余秒数
  const [hasCustomTimer, setHasCustomTimer] = useState(false);  // 是否设置了自定义定时
  const playTimerRef = React.useRef<number | null>(null);
  const isAutoPlayRef = React.useRef<boolean>(false);  // 用ref避免回调中闭包问题
  const sentenceItemsRef = React.useRef<SentenceItem[]>([]);  // 用ref保存最新的句子列表
  const currentPlayingIndexRef = React.useRef<number | null>(null);  // 用ref保存当前播放索引
  
  // 编辑状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editExplanation, setEditExplanation] = useState('');
  
  // 展开解释的句子
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // 从localStorage加载历史记录
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSentenceItems(parsed.slice(0, MAX_HISTORY));
        }
      } catch (e) {
        console.error('加载句子历史失败:', e);
      }
    }
  }, []);

  // 保存到localStorage
  const saveToStorage = useCallback((items: SentenceItem[]) => {
    const toSave = items.slice(0, MAX_HISTORY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, []);

  // 当传入新句子时，添加到列表
  useEffect(() => {
    if (inputSentences.length > 0) {
      const newItems: SentenceItem[] = inputSentences.map(text => ({
        id: generateId(),
        text,
        explanation: '',
        audioPath: null,
        hasAudio: false
      }));
      
      setSentenceItems(prev => {
        // 合并新句子到开头，保留最多20条
        const merged = [...newItems, ...prev].slice(0, MAX_HISTORY);
        saveToStorage(merged);
        return merged;
      });
    }
  }, [inputSentences, saveToStorage]);

  // 获取可用音色
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const data = await getVoices();
        setVoices(data.voices);
        setSelectedVoice(data.default);
      } catch (err) {
        console.error('获取音色失败:', err);
      }
    };
    fetchVoices();
  }, []);

  // 语速选项
  const rateOptions = [
    { value: '-30%', label: '很慢 (0.7x)' },
    { value: '-20%', label: '较慢 (0.8x)' },
    { value: '-10%', label: '稍慢 (0.9x)' },
    { value: '+0%', label: '正常 (1.0x)' },
    { value: '+10%', label: '稍快 (1.1x)' },
    { value: '+20%', label: '较快 (1.2x)' },
    { value: '+30%', label: '快速 (1.3x)' }
  ];

  // 批量生成音频（只生成句子文本，跳过解释）
  const handleGenerateAll = async () => {
    if (sentenceItems.length === 0) return;

    setIsGenerating(true);
    setGeneratingProgress(0);

    try {
      const textsToGenerate = sentenceItems.filter(item => item.text.trim()).map(item => item.text);
      const result = await generateBatchAudio(textsToGenerate, selectedVoice, selectedRate);
      
      // 更新音频路径
      setSentenceItems(prev => {
        let resultIndex = 0;
        const updated = prev.map((item) => {
          if (item.text.trim()) {
            const audioResult = result.results[resultIndex];
            resultIndex++;
            if (audioResult?.success) {
              return { ...item, audioPath: audioResult.audioPath, hasAudio: true };
            }
          }
          return item;
        });
        saveToStorage(updated);
        return updated;
      });
    } catch (err) {
      console.error('批量生成失败:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // 导出音频
  const handleExportAudio = () => {
    const audioItems = sentenceItems.filter(item => item.hasAudio && item.audioPath);
    if (audioItems.length === 0) {
      alert('暂无可导出的音频，请先生成音频');
      return;
    }
    
    // 逐个下载
    audioItems.forEach((item, index) => {
      if (item.audioPath) {
        setTimeout(() => {
          const link = document.createElement('a');
          link.href = item.audioPath!;
          const fileName = `${(index + 1).toString().padStart(2, '0')}_${item.text.slice(0, 20).replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}.mp3`;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, index * 300); // 每个间隔300ms
      }
    });
  };

  // 播放单句
  const handlePlaySentence = (index: number) => {
    setCurrentPlayingIndex(index);
  };

  // 同步状态到 refs
  React.useEffect(() => {
    isAutoPlayRef.current = isAutoPlay;
  }, [isAutoPlay]);
  
  React.useEffect(() => {
    sentenceItemsRef.current = sentenceItems;
  }, [sentenceItems]);
  
  React.useEffect(() => {
    currentPlayingIndexRef.current = currentPlayingIndex;
  }, [currentPlayingIndex]);

  // 自动播放下一句（播放完所有后循环）
  const handleAudioEnded = React.useCallback(() => {
    console.log('handleAudioEnded triggered, isAutoPlay:', isAutoPlayRef.current, 'currentIndex:', currentPlayingIndexRef.current);
    
    if (!isAutoPlayRef.current) {
      console.log('Not in auto play mode, skipping');
      return;
    }
    
    const items = sentenceItemsRef.current;
    const currentIndex = currentPlayingIndexRef.current;
    
    if (currentIndex === null) {
      console.log('No current playing index');
      return;
    }
    
    // 查找下一个有音频的句子
    let nextIndex = currentIndex + 1;
    let foundNext = false;
    
    // 先从当前位置往后找
    while (nextIndex < items.length) {
      if (items[nextIndex]?.hasAudio) {
        foundNext = true;
        break;
      }
      nextIndex++;
    }
    
    // 如果没找到，从头开始找（循环播放）
    if (!foundNext) {
      nextIndex = 0;
      while (nextIndex < currentIndex) {
        if (items[nextIndex]?.hasAudio) {
          foundNext = true;
          break;
        }
        nextIndex++;
      }
    }
    
    console.log('Next index:', nextIndex, 'foundNext:', foundNext);
    
    if (foundNext) {
      // 使用 setTimeout 确保状态更新在下一个事件循环
      setTimeout(() => {
        setCurrentPlayingIndex(nextIndex);
      }, 100);
    } else if (items[currentIndex]?.hasAudio) {
      // 只有一个音频，需要重新触发播放
      console.log('Only one audio, retriggering');
      setTimeout(() => {
        setCurrentPlayingIndex(null);
        setTimeout(() => {
          setCurrentPlayingIndex(currentIndex);
        }, 50);
      }, 100);
    }
  }, []);

  // 启动连续播放定时器
  const startPlayTimer = (seconds: number) => {
    // 清除旧定时器
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
    }
    
    setPlayTimer(seconds);
    
    playTimerRef.current = window.setInterval(() => {
      setPlayTimer(prev => {
        if (prev === null || prev <= 1) {
          // 时间到，停止播放
          if (playTimerRef.current) {
            clearInterval(playTimerRef.current);
            playTimerRef.current = null;
          }
          setIsAutoPlay(false);
          setCurrentPlayingIndex(null);
          setHasCustomTimer(false);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 连续播放所有
  const handlePlayAll = () => {
    const firstWithAudio = sentenceItems.findIndex(item => item.hasAudio);
    if (firstWithAudio !== -1) {
      setIsAutoPlay(true);
      setCurrentPlayingIndex(firstWithAudio);
      
      // 如果没有设置自定义定时，默认2小时后停止
      if (!hasCustomTimer) {
        startPlayTimer(2 * 60 * 60); // 2小时 = 7200秒
      }
    }
  };

  // 设置自定义定时（分钟）
  const handleSetPlayTimer = (minutes: number) => {
    setHasCustomTimer(true);
    startPlayTimer(minutes * 60);
  };

  // 清除定时
  const handleClearPlayTimer = () => {
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    setPlayTimer(null);
    setHasCustomTimer(false);
  };

  // 停止播放
  const handleStopAll = () => {
    setIsAutoPlay(false);
    setCurrentPlayingIndex(null);
    handleClearPlayTimer();
  };

  // 组件卸载时清理定时器
  React.useEffect(() => {
    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
      }
    };
  }, []);

  // 处理单词点击
  const handleWordClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('clickable-word')) {
      const word = target.textContent;
      if (word && onWordSelect) {
        e.stopPropagation();
        onWordSelect(word);
      }
    }
  };

  // 开始编辑句子
  const handleStartEdit = (item: SentenceItem) => {
    setEditingId(item.id);
    setEditText(item.text);
    setEditExplanation(item.explanation);
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (!editingId) return;
    
    setSentenceItems(prev => {
      const updated = prev.map(item => 
        item.id === editingId 
          ? { ...item, text: editText, explanation: editExplanation, hasAudio: false, audioPath: null }
          : item
      );
      saveToStorage(updated);
      return updated;
    });
    setEditingId(null);
    setEditText('');
    setEditExplanation('');
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
    setEditExplanation('');
  };

  // 更新解释（不进入编辑模式）
  const handleUpdateExplanation = (id: string, explanation: string) => {
    setSentenceItems(prev => {
      const updated = prev.map(item => 
        item.id === id ? { ...item, explanation } : item
      );
      saveToStorage(updated);
      return updated;
    });
  };

  // 切换解释展开状态
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 删除句子
  const handleDeleteSentence = (id: string) => {
    if (!window.confirm('确定要删除这个句子吗？')) return;
    
    const deletedIndex = sentenceItems.findIndex(item => item.id === id);
    
    setSentenceItems(prev => {
      const updated = prev.filter(item => item.id !== id);
      saveToStorage(updated);
      return updated;
    });
    
    // 如果正在播放被删除的句子，停止播放
    if (currentPlayingIndex === deletedIndex) {
      setCurrentPlayingIndex(null);
    }
  };

  // 在指定位置插入新句子
  const handleInsertSentence = (afterIndex: number) => {
    const newItem: SentenceItem = {
      id: generateId(),
      text: '',
      explanation: '',
      audioPath: null,
      hasAudio: false
    };
    
    setSentenceItems(prev => {
      const updated = [
        ...prev.slice(0, afterIndex + 1),
        newItem,
        ...prev.slice(afterIndex + 1)
      ].slice(0, MAX_HISTORY);
      saveToStorage(updated);
      return updated;
    });
    
    // 自动进入编辑模式
    setEditingId(newItem.id);
    setEditText('');
    setEditExplanation('');
  };

  // 在开头添加新句子
  const handleAddSentenceAtStart = () => {
    const newItem: SentenceItem = {
      id: generateId(),
      text: '',
      explanation: '',
      audioPath: null,
      hasAudio: false
    };
    
    setSentenceItems(prev => {
      const updated = [newItem, ...prev].slice(0, MAX_HISTORY);
      saveToStorage(updated);
      return updated;
    });
    
    setEditingId(newItem.id);
    setEditText('');
    setEditExplanation('');
  };

  // 清空所有句子
  const handleClearAll = () => {
    if (!window.confirm('确定要清空所有句子吗？此操作不可恢复。')) return;
    setSentenceItems([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  // 将句子转换为可点击的单词
  const renderSentence = (text: string) => {
    const words = text.split(/(\s+)/);
    return words.map((part, idx) => {
      if (/\s+/.test(part)) {
        return <span key={idx}>{part}</span>;
      }
      const cleanWord = part.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');
      if (cleanWord && /^[a-zA-Z]+$/.test(cleanWord)) {
        return (
          <span 
            key={idx} 
            className="clickable-word"
            title="点击添加到单词本"
          >
            {part}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const currentAudioPath = currentPlayingIndex !== null 
    ? sentenceItems[currentPlayingIndex]?.audioPath 
    : null;

  const hasAnyAudio = sentenceItems.some(item => item.hasAudio);

  return (
    <div className="sentence-list">
      <div className="sentence-header">
        <div className="header-title-row">
          <h2>📝 句子列表 ({sentenceItems.length}/{MAX_HISTORY})</h2>
          <div className="header-actions">
            <button 
              className="btn-add-sentence"
              onClick={handleAddSentenceAtStart}
              title="添加新句子"
            >
              ➕ 添加句子
            </button>
            {sentenceItems.length > 0 && (
              <button 
                className="btn-clear-all"
                onClick={handleClearAll}
                title="清空所有"
              >
                🗑️ 清空
              </button>
            )}
          </div>
        </div>
        
        {/* TTS设置 */}
        <div className="tts-settings">
          <div className="setting-item">
            <label>音色:</label>
            <select 
              value={selectedVoice} 
              onChange={(e) => setSelectedVoice(e.target.value)}
              disabled={isGenerating}
            >
              {voices.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          
          <div className="setting-item">
            <label>语速:</label>
            <select 
              value={selectedRate}
              onChange={(e) => setSelectedRate(e.target.value)}
              disabled={isGenerating}
            >
              {rateOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <button 
            className="btn-generate"
            onClick={handleGenerateAll}
            disabled={isGenerating || sentenceItems.length === 0}
          >
            {isGenerating ? `生成中... ${generatingProgress}%` : '🎤 生成全部音频'}
          </button>

          {hasAnyAudio && (
            <button 
              className="btn-export-audio"
              onClick={handleExportAudio}
              title="逐个下载音频文件"
            >
              📥 导出音频
            </button>
          )}
        </div>
      </div>

      {/* 播放控制 */}
      {hasAnyAudio && (
        <div className="playback-controls">
          <AudioPlayer 
            src={currentAudioPath}
            title={currentPlayingIndex !== null ? `第 ${currentPlayingIndex + 1} 句` : undefined}
            onEnded={handleAudioEnded}
          />
          <div className="playback-buttons">
            <button 
              className="btn-play-all"
              onClick={handlePlayAll}
              disabled={isAutoPlay}
            >
              ▶️ 连续播放
            </button>
            <button 
              className="btn-stop-all"
              onClick={handleStopAll}
            >
              ⏹️ 停止
            </button>
            
            {/* 定时设置 */}
            <div className="timer-control">
              <label>定时:</label>
              <select 
                value=""
                onChange={(e) => {
                  const mins = parseInt(e.target.value);
                  if (mins > 0) handleSetPlayTimer(mins);
                }}
              >
                <option value="">设置定时</option>
                <option value="5">5分钟</option>
                <option value="10">10分钟</option>
                <option value="15">15分钟</option>
                <option value="30">30分钟</option>
                <option value="45">45分钟</option>
                <option value="60">1小时</option>
                <option value="90">1.5小时</option>
                <option value="120">2小时</option>
              </select>
              {playTimer !== null && (
                <span className="timer-display">
                  ⏱️ {Math.floor(playTimer / 60)}:{(playTimer % 60).toString().padStart(2, '0')}
                  <button 
                    className="btn-clear-timer"
                    onClick={handleClearPlayTimer}
                    title="取消定时"
                  >
                    ✕
                  </button>
                </span>
              )}
            </div>
            
            <label className="auto-play-toggle">
              <input
                type="checkbox"
                checked={isAutoPlay}
                onChange={(e) => {
                  setIsAutoPlay(e.target.checked);
                  // 开启自动播放时，如果没定时器，设置默认2小时
                  if (e.target.checked && playTimer === null) {
                    startPlayTimer(2 * 60 * 60);
                  }
                }}
              />
              循环播放
            </label>
          </div>
        </div>
      )}

      {/* 句子列表 */}
      <div className="sentences-container" onClick={handleWordClick}>
        {sentenceItems.map((item, index) => {
          const isPlaying = currentPlayingIndex === index;
          const isEditing = editingId === item.id;
          const isExpanded = expandedIds.has(item.id);

          return (
            <div key={item.id} className="sentence-item-wrapper">
              <div 
                className={`sentence-item ${isPlaying ? 'playing' : ''} ${isEditing ? 'editing' : ''}`}
              >
                <div className="sentence-index">{index + 1}</div>
                
                {isEditing ? (
                  // 编辑模式
                  <div className="sentence-edit-form" onClick={(e) => e.stopPropagation()}>
                    <div className="edit-field">
                      <label>句子内容:</label>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        placeholder="输入英文句子..."
                        rows={2}
                        autoFocus
                      />
                    </div>
                    <div className="edit-field">
                      <label>解释/笔记 (可选，不生成音频):</label>
                      <textarea
                        value={editExplanation}
                        onChange={(e) => setEditExplanation(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        placeholder="输入中文解释或学习笔记..."
                        rows={2}
                      />
                    </div>
                    <div className="edit-actions">
                      <button className="btn-save" onClick={handleSaveEdit}>
                        ✅ 保存
                      </button>
                      <button className="btn-cancel-edit" onClick={handleCancelEdit}>
                        ❌ 取消
                      </button>
                    </div>
                  </div>
                ) : (
                  // 显示模式
                  <div className="sentence-content">
                    <div className="sentence-main">
                      <p className="sentence-text">
                        {item.text ? renderSentence(item.text) : <span className="empty-text">(空句子)</span>}
                      </p>
                      <div className="sentence-actions">
                        {item.hasAudio && (
                          <button 
                            className="btn-play-sentence"
                            onClick={() => handlePlaySentence(index)}
                            title="播放"
                          >
                            {isPlaying ? '🔊' : '▶️'}
                          </button>
                        )}
                        <button 
                          className="btn-edit-sentence"
                          onClick={() => handleStartEdit(item)}
                          title="编辑"
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn-toggle-explanation"
                          onClick={() => toggleExpand(item.id)}
                          title={isExpanded ? '收起解释' : '展开解释'}
                        >
                          {isExpanded ? '📝' : '📄'}
                        </button>
                        <button 
                          className="btn-insert-sentence"
                          onClick={() => handleInsertSentence(index)}
                          title="在下方插入新句子"
                        >
                          ➕
                        </button>
                        <button 
                          className="btn-delete-sentence"
                          onClick={() => handleDeleteSentence(item.id)}
                          title="删除"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    {/* 解释区域 */}
                    {isExpanded && (
                      <div className="sentence-explanation" onClick={(e) => e.stopPropagation()}>
                        <textarea
                          value={item.explanation}
                          onChange={(e) => handleUpdateExplanation(item.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          placeholder="添加中文解释或学习笔记... (此内容不生成音频)"
                          rows={2}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {sentenceItems.length === 0 && (
        <div className="empty-state">
          <p>暂无句子内容</p>
          <p className="hint">请先上传文档或输入文本进行解析，或点击"添加句子"手动添加</p>
        </div>
      )}
    </div>
  );
};

export default SentenceList;
