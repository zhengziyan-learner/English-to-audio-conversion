/**
 * 单词选取Hook - 使用window.getSelection实现
 * 支持划词选取英文单词
 */

import { useState, useCallback, useEffect } from 'react';

export interface UseWordSelectionReturn {
  selectedWord: string | null;
  selectionPosition: { x: number; y: number } | null;
  clearSelection: () => void;
  enableSelection: () => void;
  disableSelection: () => void;
  isEnabled: boolean;
}

/**
 * 单词选取自定义Hook
 * 用于实现划词添加到单词本的功能
 */
export function useWordSelection(): UseWordSelectionReturn {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);

  /**
   * 提取选中的单词
   * 如果选中的是短语，只提取第一个完整单词
   */
  const extractWord = useCallback((text: string): string | null => {
    // 清理文本，移除首尾空白和标点
    const cleaned = text.trim().replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');
    
    if (!cleaned) return null;

    // 如果包含空格，说明选中了多个单词，只取第一个
    const words = cleaned.split(/\s+/);
    const firstWord = words[0];

    // 验证是否为有效的英文单词（至少2个字母）
    if (/^[a-zA-Z]{2,}$/.test(firstWord)) {
      return firstWord.toLowerCase();
    }

    return null;
  }, []);

  /**
   * 处理选中事件
   */
  const handleSelectionChange = useCallback(() => {
    if (!isEnabled) return;

    const selection = window.getSelection();
    
    if (!selection || selection.isCollapsed) {
      // 没有选中内容
      return;
    }

    const text = selection.toString();
    const word = extractWord(text);

    if (word) {
      // 获取选中区域的位置（用于显示悬浮菜单）
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setSelectedWord(word);
      setSelectionPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });
    }
  }, [isEnabled, extractWord]);

  /**
   * 处理鼠标抬起事件
   */
  const handleMouseUp = useCallback(() => {
    // 延迟处理，确保selection已更新
    setTimeout(handleSelectionChange, 10);
  }, [handleSelectionChange]);

  /**
   * 清除选中状态
   */
  const clearSelection = useCallback(() => {
    setSelectedWord(null);
    setSelectionPosition(null);
    
    // 清除浏览器的文本选中
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  }, []);

  /**
   * 启用单词选取
   */
  const enableSelection = useCallback(() => {
    setIsEnabled(true);
  }, []);

  /**
   * 禁用单词选取
   */
  const disableSelection = useCallback(() => {
    setIsEnabled(false);
    clearSelection();
  }, [clearSelection]);

  // 添加事件监听
  useEffect(() => {
    if (isEnabled) {
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isEnabled, handleMouseUp]);

  // 点击其他区域时清除选中
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // 如果点击的不是弹出菜单区域，清除选中
      const target = e.target as HTMLElement;
      if (!target.closest('.word-selection-popup')) {
        clearSelection();
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [clearSelection]);

  return {
    selectedWord,
    selectionPosition,
    clearSelection,
    enableSelection,
    disableSelection,
    isEnabled
  };
}

export default useWordSelection;
