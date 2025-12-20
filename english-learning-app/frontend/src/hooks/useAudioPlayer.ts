/**
 * 音频播放器Hook - 基于Howler.js
 * 支持倍速调节、循环播放、定时停止等功能
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Howl } from 'howler';

export interface AudioPlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  isLooping: boolean;
  volume: number;
  error: string | null;
}

export interface UseAudioPlayerReturn extends AudioPlayerState {
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  toggleLoop: () => void;
  loadAudio: (src: string, autoPlay?: boolean) => void;
  setTimer: (minutes: number) => void;
  clearTimer: () => void;
  timerRemaining: number | null;
  setOnEndCallback: (callback: (() => void) | null) => void;
}

/**
 * 音频播放器自定义Hook
 * 封装Howler.js，提供四六级/考研英语学习所需的播放控制
 */
export function useAudioPlayer(): UseAudioPlayerReturn {
  const howlRef = useRef<Howl | null>(null);
  const timerRef = useRef<number | null>(null);
  const progressRef = useRef<number | null>(null);
  const isLoopingRef = useRef<boolean>(false);  // 用ref保存循环状态避免闭包问题
  const onEndCallbackRef = useRef<(() => void) | null>(null);  // 播放结束回调
  const volumeRef = useRef<number>(1.0);  // 用ref保存音量
  const rateRef = useRef<number>(1.0);  // 用ref保存播放速率
  const autoPlayOnLoadRef = useRef<boolean>(false);  // 加载完成后自动播放
  
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1.0,
    isLooping: false,
    volume: 1.0,
    error: null
  });

  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);

  // 更新播放进度
  const updateProgress = useCallback(() => {
    if (howlRef.current && state.isPlaying) {
      const currentTime = howlRef.current.seek() as number;
      setState(prev => ({ ...prev, currentTime }));
    }
  }, [state.isPlaying]);

  // 启动进度更新定时器
  useEffect(() => {
    if (state.isPlaying) {
      progressRef.current = setInterval(updateProgress, 100);
    } else {
      if (progressRef.current) {
        clearInterval(progressRef.current);
      }
    }
    return () => {
      if (progressRef.current) {
        clearInterval(progressRef.current);
      }
    };
  }, [state.isPlaying, updateProgress]);

  // 加载音频文件
  const loadAudio = useCallback((src: string, autoPlay: boolean = true) => {
    // 销毁旧实例
    if (howlRef.current) {
      howlRef.current.unload();
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    autoPlayOnLoadRef.current = autoPlay;

    const howl = new Howl({
      src: [src],
      html5: true, // 使用HTML5 Audio以支持长音频
      preload: true,
      loop: isLoopingRef.current,
      volume: volumeRef.current,
      rate: rateRef.current,
      onload: () => {
        setState(prev => ({
          ...prev,
          isLoading: false,
          duration: howl.duration(),
          currentTime: 0
        }));
        // 加载完成后自动播放
        if (autoPlayOnLoadRef.current) {
          howl.play();
        }
      },
      onplay: () => {
        setState(prev => ({ ...prev, isPlaying: true, isPaused: false }));
      },
      onpause: () => {
        setState(prev => ({ ...prev, isPlaying: false, isPaused: true }));
      },
      onstop: () => {
        setState(prev => ({ ...prev, isPlaying: false, isPaused: false, currentTime: 0 }));
      },
      onend: () => {
        if (!isLoopingRef.current) {
          setState(prev => ({ ...prev, isPlaying: false, isPaused: false }));
          // 触发外部的播放结束回调（用于连续播放下一句）
          if (onEndCallbackRef.current) {
            onEndCallbackRef.current();
          }
        }
      },
      onloaderror: (_id, error) => {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: `音频加载失败: ${error}`
        }));
      },
      onplayerror: (_id, error) => {
        setState(prev => ({
          ...prev,
          isPlaying: false,
          error: `音频播放失败: ${error}`
        }));
      }
    });

    howlRef.current = howl;
  }, []);

  // 播放
  const play = useCallback(() => {
    if (howlRef.current) {
      howlRef.current.play();
    }
  }, []);

  // 暂停
  const pause = useCallback(() => {
    if (howlRef.current) {
      howlRef.current.pause();
    }
  }, []);

  // 停止
  const stop = useCallback(() => {
    if (howlRef.current) {
      howlRef.current.stop();
    }
  }, []);

  // 跳转到指定时间
  const seek = useCallback((time: number) => {
    if (howlRef.current) {
      howlRef.current.seek(time);
      setState(prev => ({ ...prev, currentTime: time }));
    }
  }, []);

  // 设置播放速度（0.5x - 2.0x）
  const setRate = useCallback((rate: number) => {
    const clampedRate = Math.max(0.5, Math.min(2.0, rate));
    rateRef.current = clampedRate;  // 同步更新ref
    if (howlRef.current) {
      howlRef.current.rate(clampedRate);
    }
    setState(prev => ({ ...prev, playbackRate: clampedRate }));
  }, []);

  // 设置音量（0 - 1）
  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    volumeRef.current = clampedVolume;  // 同步更新ref
    if (howlRef.current) {
      howlRef.current.volume(clampedVolume);
    }
    setState(prev => ({ ...prev, volume: clampedVolume }));
  }, []);

  // 切换循环播放
  const toggleLoop = useCallback(() => {
    const newLooping = !isLoopingRef.current;
    isLoopingRef.current = newLooping;
    if (howlRef.current) {
      howlRef.current.loop(newLooping);
    }
    setState(prev => ({ ...prev, isLooping: newLooping }));
  }, []);

  // 设置播放结束回调
  const setOnEndCallback = useCallback((callback: (() => void) | null) => {
    onEndCallbackRef.current = callback;
  }, []);

  // 设置定时停止（分钟）
  const setTimer = useCallback((minutes: number) => {
    // 清除现有定时器
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const totalSeconds = minutes * 60;
    setTimerRemaining(totalSeconds);

    timerRef.current = setInterval(() => {
      setTimerRemaining(prev => {
        if (prev === null || prev <= 1) {
          // 定时结束，停止播放
          if (howlRef.current) {
            howlRef.current.pause();
          }
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // 清除定时器
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTimerRemaining(null);
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (howlRef.current) {
        howlRef.current.unload();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (progressRef.current) {
        clearInterval(progressRef.current);
      }
    };
  }, []);

  return {
    ...state,
    play,
    pause,
    stop,
    seek,
    setRate,
    setVolume,
    toggleLoop,
    loadAudio,
    setTimer,
    clearTimer,
    timerRemaining,
    setOnEndCallback
  };
}

export default useAudioPlayer;
