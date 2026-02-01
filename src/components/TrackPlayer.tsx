"use client";

import { useState, useRef, useEffect } from "react";
import { PlayerControls } from "./PlayerControls";
import { VersionList } from "./VersionList";

// 定義 Version 的型別 (跟 VersionList 用的一樣)
interface Version {
  id: string;
  version_number: number;
  name: string;
  created_at: string;
  storage_path: string;
  // 之後補上 lufs, tp 等
}

interface TrackPlayerProps {
  versions: any[]; // 暫時用 any，因為 Supabase 回傳的型別可能很複雜，這裡先求過
}

export function TrackPlayer({ versions }: TrackPlayerProps) {
  // 核心狀態
  const [currentVersion, setCurrentVersion] = useState<Version | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // 全域唯一的 Audio 元素引用
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 處理版本切換邏輯 (無縫切換的關鍵!)
  const handleVersionSelect = (version: Version) => {
    const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
    const cleanPath = version.storage_path.startsWith('/') ? version.storage_path.slice(1) : version.storage_path;
    const fullUrl = `${publicUrl}/${cleanPath}`;

    if (audioRef.current) {
      // 如果點擊的是當前正在播的版本 -> 切換播放/暫停
      if (currentVersion?.id === version.id) {
        togglePlayPause();
        return;
      }

      // 如果點擊不同版本 -> 保持播放狀態與時間進度，只切換訊號源
      const wasPlaying = !audioRef.current.paused;
      const currentPos = audioRef.current.currentTime; // 暫存當前時間
      
      audioRef.current.src = fullUrl;
      audioRef.current.currentTime = currentPos; // **關鍵：同步時間**
      
      if (wasPlaying) {
        audioRef.current.play().catch(console.error);
        setIsPlaying(true);
      }

      setCurrentVersion(version);
    }
  };

  // 處理播放/暫停切換
  const togglePlayPause = () => {
    if (!audioRef.current || !currentVersion) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  // 👇 新增這個 Seek 處理函式：讓進度條拖動生效
  const handleSeek = (value: number) => {
    if (audioRef.current) {
      // 1. 直接改變音訊播放位置
      audioRef.current.currentTime = value;
      // 2. 同步更新 UI 狀態，讓滑塊感覺更跟手
      setCurrentTime(value);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* 隱藏的 Audio 標籤，負責發出聲音 */}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* 上方播放控制器 */}
      <PlayerControls
        isPlaying={isPlaying}
        onPlayPauseToggle={togglePlayPause}
        currentVersionName={currentVersion?.name}
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek} // 👈 記得傳入這個屬性！
      />

      {/* 下方版本列表 */}
      <VersionList
        versions={versions}
        currentVersionId={currentVersion?.id || null}
        isPlaying={isPlaying}
        onVersionSelect={handleVersionSelect}
      />
    </div>
  );
}