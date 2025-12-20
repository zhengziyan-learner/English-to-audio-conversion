/**
 * 四六级/考研英语学习应用 - 主组件
 */

import React, { useState, useEffect } from 'react';
import DocumentUploader from './components/DocumentUploader';
import SentenceList from './components/SentenceList';
import WordBook from './components/WordBook';
import { useWordSelection } from './hooks/useWordSelection';
import { healthCheck } from './services/api';
import './styles/App.css';

type TabType = 'document' | 'wordbook';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('document');
  const [sentences, setSentences] = useState<string[]>([]);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  
  // 单词选取功能
  const { selectedWord, selectionPosition, clearSelection } = useWordSelection();
  
  // 待添加到单词本的单词
  const [wordToAdd, setWordToAdd] = useState<string | null>(null);

  // 检查后端状态
  useEffect(() => {
    const checkBackend = async () => {
      try {
        await healthCheck();
        setBackendStatus('online');
      } catch (err) {
        setBackendStatus('offline');
      }
    };

    checkBackend();
    // 每30秒检查一次
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  // 处理文档解析结果
  const handleDocumentParsed = (parsedSentences: string[], _text: string) => {
    setSentences(parsedSentences);
    // 解析完成后立即清空，避免切换页面时重复添加
    setTimeout(() => setSentences([]), 100);
  };

  // 处理单词选择（从句子列表）
  const handleWordSelect = (word: string) => {
    setWordToAdd(word);
    setActiveTab('wordbook');
  };

  // 处理划词选择
  const handleAddSelectedWord = () => {
    if (selectedWord) {
      setWordToAdd(selectedWord);
      setActiveTab('wordbook');
      clearSelection();
    }
  };

  // 处理标签切换
  const handleTabChange = (tab: TabType) => {
    // 切换到单词本时，如果没有待添加的单词，清空状态
    if (tab === 'wordbook' && !wordToAdd) {
      setWordToAdd(null);
    }
    setActiveTab(tab);
  };

  return (
    <div className="app">
      {/* 头部 */}
      <header className="app-header">
        <div className="header-content">
          <h1>🎓 四六级/考研英语学习助手</h1>
          <div className="header-status">
            <span className={`status-indicator ${backendStatus}`}>
              {backendStatus === 'checking' && '检查中...'}
              {backendStatus === 'online' && '✅ 服务正常'}
              {backendStatus === 'offline' && '❌ 服务离线'}
            </span>
          </div>
        </div>
      </header>

      {/* 导航标签 */}
      <nav className="app-nav">
        <button 
          className={`nav-tab ${activeTab === 'document' ? 'active' : ''}`}
          onClick={() => handleTabChange('document')}
        >
          📄 文档学习
        </button>
        <button 
          className={`nav-tab ${activeTab === 'wordbook' ? 'active' : ''}`}
          onClick={() => handleTabChange('wordbook')}
        >
          📚 单词本
        </button>
      </nav>

      {/* 主内容区 */}
      <main className="app-main">
        {activeTab === 'document' && (
          <div className="document-section">
            <div className="left-panel">
              <DocumentUploader onParsed={handleDocumentParsed} />
            </div>
            <div className="right-panel">
              <SentenceList 
                sentences={sentences} 
                onWordSelect={handleWordSelect}
              />
            </div>
          </div>
        )}

        {activeTab === 'wordbook' && (
          <div className="wordbook-section">
            <WordBook 
              initialWord={wordToAdd || undefined}
              onClose={() => {
                setWordToAdd(null);
              }}
            />
          </div>
        )}
      </main>

      {/* 划词悬浮菜单 */}
      {selectedWord && selectionPosition && activeTab === 'document' && (
        <div 
          className="word-selection-popup"
          style={{
            left: selectionPosition.x,
            top: selectionPosition.y,
          }}
        >
          <div className="popup-content">
            <span className="selected-word">{selectedWord}</span>
            <button onClick={handleAddSelectedWord}>
              ➕ 加入单词本
            </button>
          </div>
        </div>
      )}

      {/* 页脚 */}
      <footer className="app-footer">
        <p>📖 本地英语学习工具 · 支持PDF/Word文档 · 基于edge-tts语音合成</p>
      </footer>

      {/* 后端离线提示 */}
      {backendStatus === 'offline' && (
        <div className="offline-banner">
          <span>⚠️ 后端服务未启动，请运行 <code>cd backend && npm start</code></span>
        </div>
      )}
    </div>
  );
};

export default App;
