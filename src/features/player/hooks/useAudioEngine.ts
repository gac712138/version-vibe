
import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Version, UseAudioEngineOptions, UseAudioEngineReturn } from '../types';

export function useAudioEngine({ versions: initialVersions, initialVersionId }: UseAudioEngineOptions): UseAudioEngineReturn {
  const searchParams = useSearchParams();
  const [versions, setVersions] = useState<Version[]>(initialVersions);

  const [currentVersion, setCurrentVersion] = useState<Version | null>(() => {
    if (initialVersionId) {
      return initialVersions.find(v => v.id === initialVersionId) || null;
    }
    return initialVersions[0] || null;
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [assetVolumes, setAssetVolumes] = useState<Record<string, number>>({});

  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const lastSeekKey = useRef<string | null>(null);

  // keep versions state in sync with incoming prop
  useEffect(() => {
    setVersions(initialVersions);
  }, [initialVersions]);

  // auto‑switch / seek based on URL params
  useEffect(() => {
    const assetIdParam = searchParams.get('assetId');
    const timeParam = searchParams.get('t');
    const uniqueKey = `${assetIdParam}-${timeParam}`;

    if (assetIdParam && currentVersion?.id !== assetIdParam) {
      const target = versions.find(v => v.id === assetIdParam);
      if (target) {
        setCurrentVersion(target);
        return;
      }
    }

    if (timeParam && currentVersion) {
      if (assetIdParam && currentVersion.id !== assetIdParam) return;
      if (lastSeekKey.current === uniqueKey) return;
      const seekTime = parseFloat(timeParam);
      if (!isNaN(seekTime)) {
        setCurrentTime(seekTime);
        setTimeout(() => {
          const audio = audioRefs.current[currentVersion.id];
          if (audio) {
            audio.currentTime = seekTime;
          }
        }, 300);
        lastSeekKey.current = uniqueKey;
      }
    }
  }, [searchParams, currentVersion, versions]);

  // persist volumes to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('asset-volumes-map');
    if (saved) {
      try {
        setAssetVolumes(JSON.parse(saved));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (Object.keys(assetVolumes).length > 0) {
      localStorage.setItem('asset-volumes-map', JSON.stringify(assetVolumes));
    }
  }, [assetVolumes]);

  // adjust audio elements when dependencies change
  useEffect(() => {
    versions.forEach(v => {
      const audio = audioRefs.current[v.id];
      if (!audio) return;
      const isCurrent = currentVersion?.id === v.id;
      const volSetting = assetVolumes[v.id] ?? 0.9;
      if (!isCurrent) {
        audio.muted = true;
      } else {
        audio.muted = isMuted || volSetting === 0;
        try {
          audio.volume = volSetting;
          if (audio.duration) setDuration(audio.duration);
        } catch (e) {
          console.warn(e);
        }
      }
    });
  }, [assetVolumes, isMuted, currentVersion, versions]);

  // control helpers
  const play = useCallback(() => {
    setIsPlaying(true);
    Object.values(audioRefs.current).forEach(a => {
      a.play().catch(() => {});
    });
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
    Object.values(audioRefs.current).forEach(a => a.pause());
  }, []);

  const togglePlay = useCallback(() => {
    isPlaying ? pause() : play();
  }, [isPlaying, pause, play]);

  const seek = useCallback((value: number) => {
    setCurrentTime(value);
    Object.values(audioRefs.current).forEach(a => {
      a.currentTime = Math.min(value, a.duration || Infinity);
    });
  }, []);

  const selectVersion = useCallback((id: string) => {
    const version = versions.find(v => v.id === id);
    if (!version) return;
    if (currentVersion?.id === id) {
      togglePlay();
      return;
    }
    const target = audioRefs.current[id];
    if (target) {
      if (currentTime > target.duration) {
        seek(target.duration);
      }
      setDuration(target.duration);
    }
    setCurrentVersion(version);
  }, [currentTime, currentVersion, seek, togglePlay, versions]);

  const setVolume = useCallback((value: number) => {
    if (!currentVersion) return;
    setAssetVolumes(prev => ({ ...prev, [currentVersion.id]: value }));
    if (value > 0) setIsMuted(false);
  }, [currentVersion]);

  const toggleMute = useCallback(() => {
    setIsMuted(m => !m);
  }, []);

  // helpers for component event handlers
  const handleTimeUpdate = useCallback((vId: string, time: number) => {
    if (currentVersion?.id === vId) {
      setCurrentTime(time);
    }
  }, [currentVersion]);

  const handleLoadedMetadata = useCallback((vId: string, dur: number) => {
    if (currentVersion?.id === vId) {
      setDuration(dur);
    }
  }, [currentVersion]);

  const handleEnded = useCallback((vId: string) => {
    if (currentVersion?.id === vId) {
      setIsPlaying(false);
    }
  }, [currentVersion]);

  return {
    versions,
    currentVersion,
    isPlaying,
    currentTime,
    duration,
    isMuted,
    assetVolumes,
    audioRefs,
    play,
    pause,
    togglePlay,
    seek,
    selectVersion,
    setVolume,
    toggleMute,
    setVersions,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleEnded,
  } satisfies UseAudioEngineReturn;
}
