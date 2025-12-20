/**
 * 文档上传与解析组件
 * 支持PDF、Word、TXT文件上传和文本直接输入
 */

import React, { useState, useRef } from 'react';
import { uploadDocument, parseText } from '../services/api';
import './DocumentUploader.css';

interface DocumentUploaderProps {
  onParsed: (sentences: string[], rawText: string) => void;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onParsed }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'input'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await uploadDocument(file);
      onParsed(result.sentences, result.rawText);
    } catch (err: any) {
      setError(err.response?.data?.error || '文档解析失败');
    } finally {
      setIsLoading(false);
      // 清空文件输入，允许重复上传同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 处理文本输入解析
  const handleTextParse = async () => {
    if (!textInput.trim()) {
      setError('请输入要解析的文本');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await parseText(textInput);
      onParsed(result.sentences, textInput);
    } catch (err: any) {
      setError(err.response?.data?.error || '文本解析失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 拖拽上传处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    // 验证文件类型
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'doc', 'txt'].includes(ext || '')) {
      setError('不支持的文件格式，请上传PDF、Word或TXT文件');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await uploadDocument(file);
      onParsed(result.sentences, result.rawText);
    } catch (err: any) {
      setError(err.response?.data?.error || '文档解析失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="document-uploader">
      <h2>📄 文档解析</h2>

      {/* 标签切换 */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          上传文件
        </button>
        <button 
          className={`tab ${activeTab === 'input' ? 'active' : ''}`}
          onClick={() => setActiveTab('input')}
        >
          直接输入
        </button>
      </div>

      {/* 错误提示 */}
      {error && <div className="error-message">{error}</div>}

      {/* 文件上传区域 */}
      {activeTab === 'upload' && (
        <div 
          className={`upload-area ${isLoading ? 'loading' : ''}`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            onChange={handleFileUpload}
            hidden
          />
          {isLoading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>正在解析文档...</p>
            </div>
          ) : (
            <>
              <div className="upload-icon">📁</div>
              <p className="upload-text">点击或拖拽文件到此处</p>
              <p className="upload-hint">支持 PDF、Word(.docx)、TXT 格式</p>
            </>
          )}
        </div>
      )}

      {/* 文本输入区域 */}
      {activeTab === 'input' && (
        <div className="input-area">
          <textarea
            placeholder="在此粘贴或输入英文文本...&#10;&#10;例如：&#10;The quick brown fox jumps over the lazy dog. It was a sunny day. Everyone was happy."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={isLoading}
          />
          <div className="input-actions">
            <span className="char-count">{textInput.length} 字符</span>
            <button 
              className="btn-parse"
              onClick={handleTextParse}
              disabled={isLoading || !textInput.trim()}
            >
              {isLoading ? '解析中...' : '🔍 解析文本'}
            </button>
          </div>
        </div>
      )}

      {/* 使用提示 */}
      <div className="tips">
        <h4>💡 使用提示</h4>
        <ul>
          <li>上传四六级/考研真题文档，自动分句处理</li>
          <li>支持英文文本按句号、问号、感叹号智能分句</li>
          <li>解析后可生成逐句音频，便于听力练习</li>
          <li>划选文本中的单词可添加到单词本</li>
        </ul>
      </div>
    </div>
  );
};

export default DocumentUploader;
