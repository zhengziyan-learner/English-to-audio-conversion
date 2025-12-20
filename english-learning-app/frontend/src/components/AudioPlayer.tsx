/**
 * 音频播放器组件
 * 支持倍速调节、循环播放、定时停止、进度条拖动
 */

import React, { useEffect } from 'react';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import './AudioPlayer.css';

interface AudioPlayerProps {
  src: string | null;
  title?: string;
  onEnded?: () => void;
}

// 倍速选项（适合英语听力练习）
const RATE_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

// 定时选项（分钟）
const TIMER_OPTIONS = [5, 10, 15, 30, 45, 60];

/**
 * 格式化时间为 MM:SS
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, title, onEnded }) => {
  const player = useAudioPlayer();

  // 设置播放结束回调
  useEffect(() => {
    player.setOnEndCallback(onEnded || null);
    return () => {
      player.setOnEndCallback(null);
    };
  }, [onEnded, player.setOnEndCallback]);

  // 加载音频（自动播放）
  useEffect(() => {
    if (src) {
      player.loadAudio(src, true);  // 加载后自动播放
    }
  }, [src]);

  // 进度条点击跳转
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * player.duration;
    player.seek(newTime);
  };

  const progressPercent = player.duration > 0 
    ? (player.currentTime / player.duration) * 100 
    : 0;

  return (
    <div className="audio-player">
      {/* 标题 */}
      {title && <div className="player-title">{title}</div>}

      {/* 错误提示 */}
      {player.error && (
        <div className="player-error">{player.error}</div>
      )}

      {/* 加载状态 */}
      {player.isLoading && (
        <div className="player-loading">加载中...</div>
      )}

      {/* 主控制区 */}
      <div className="player-controls">
        {/* 播放/暂停按钮 */}
        <button 
          className="btn-play"
          onClick={() => player.isPlaying ? player.pause() : player.play()}
          disabled={player.isLoading || !src}
        >
          {player.isPlaying ? '⏸️' : '▶️'}
        </button>

        {/* 停止按钮 */}
        <button 
          className="btn-stop"
          onClick={player.stop}
          disabled={player.isLoading || !src}
        >
          ⏹️
        </button>

        {/* 进度条 */}
        <div className="progress-container" onClick={handleProgressClick}>
          <div 
            className="progress-bar" 
            style={{ width: `${progressPercent}%` }}
          />
          <div 
            className="progress-thumb"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        {/* 时间显示 */}
        <div className="time-display">
          <span>{formatTime(player.currentTime)}</span>
          <span>/</span>
          <span>{formatTime(player.duration)}</span>
        </div>
      </div>

      {/* 扩展控制区 */}
      <div className="player-extras">
        {/* 倍速调节 */}
        <div className="control-group">
          <label>倍速:</label>
          <select 
            value={player.playbackRate}
            onChange={(e) => player.setRate(parseFloat(e.target.value))}
          >
            {RATE_OPTIONS.map(rate => (
              <option key={rate} value={rate}>
                {rate}x
              </option>
            ))}
          </select>
        </div>

        {/* 音量调节 */}
        <div className="control-group">
          <label>🔊</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={player.volume}
            onChange={(e) => player.setVolume(parseFloat(e.target.value))}
            className="volume-slider"
          />
        </div>

        {/* 循环播放 */}
        <button 
          className={`btn-loop ${player.isLooping ? 'active' : ''}`}
          onClick={player.toggleLoop}
          title="循环播放"
        >
          🔁 {player.isLooping ? '开' : '关'}
        </button>

        {/* 定时停止 */}
        <div className="control-group">
          <label>定时:</label>
          <select 
            value=""
            onChange={(e) => {
              const mins = parseInt(e.target.value);
              if (mins > 0) player.setTimer(mins);
            }}
          >
            <option value="">不定时</option>
            {TIMER_OPTIONS.map(mins => (
              <option key={mins} value={mins}>
                {mins}分钟
              </option>
            ))}
          </select>
          {player.timerRemaining !== null && (
            <span className="timer-display">
              剩余: {formatTime(player.timerRemaining)}
              <button 
                className="btn-clear-timer"
                onClick={player.clearTimer}
              >
                ✕
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
