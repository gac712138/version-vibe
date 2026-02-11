"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation"; 
import { PlayerControls } from "./PlayerControls";
import { VersionList } from "./VersionList";
import { TrackComments } from "@/components/track/TrackComments"; 
import { createClient } from "@/utils/supabase/client";
import { getComments, type CommentWithUser } from "@/app/actions/comments"; 
import { updateAssetName, deleteAsset } from "@/app/actions/assets"; 
import { MoreHorizontal, Edit, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Version {
  id: string;
  version_number: number;
  name: string;
  created_at: string;
  storage_path: string;
  comment_count?: { count: number }[];
}

interface TrackPlayerProps {
  projectId: string;
  versions: Version[];
  canEdit: boolean;
}

export function TrackPlayer({ projectId, versions, canEdit }: TrackPlayerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  // ✅ 管理多音軌 Ref，實現真無縫切換
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const [currentVersion, setCurrentVersion] = useState<Version | null>(versions[0] || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // ✅ 版本獨立音量映射表
  const [assetVolumes, setAssetVolumes] = useState<Record<string, number>>({});
  const [isMuted, setIsMuted] = useState(false);

  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 10;

  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingAsset, setIsDeletingAsset] = useState(false);
  const [isVersionsExpanded, setIsVersionsExpanded] = useState(true);

  // 1. 初始化：從本地記憶載入音量表
  useEffect(() => {
    const savedVolumes = localStorage.getItem("asset-volumes-map");
    if (savedVolumes) {
      try { setAssetVolumes(JSON.parse(savedVolumes)); } catch (e) { console.error(e); }
    }
  }, []);

  // 2. 儲存：音量表更動時同步至本地儲存
  useEffect(() => {
    if (Object.keys(assetVolumes).length > 0) {
      localStorage.setItem("asset-volumes-map", JSON.stringify(assetVolumes));
    }
  }, [assetVolumes]);

  // ✅ 3. 強制同步校準函式 (解決手機音軌漂移問題)
  const syncAllTracks = useCallback((targetTime: number) => {
    Object.values(audioRefs.current).forEach(audio => {
      // 容許 0.05 秒內誤差，超過則強制校準 (避免過度頻繁操作導致手機音訊斷續)
      if (Math.abs(audio.currentTime - targetTime) > 0.05) {
        audio.currentTime = Math.min(targetTime, audio.duration || Infinity);
      }
    });
  }, []);

  // ✅ 4. 定期對齊：播放中每 2 秒執行一次隱形校準
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      syncAllTracks(currentTime);
    }, 2000);
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, syncAllTracks]);

  // ✅ 5. 核心：切換音量與靜音邏輯 (對應行動裝置相容性)
  useEffect(() => {
    versions.forEach(v => {
      const audio = audioRefs.current[v.id];
      if (audio) {
        const isCurrent = currentVersion?.id === v.id;
        const volSetting = assetVolumes[v.id] ?? 0.9;

        if (!isCurrent) {
          audio.muted = true; // 非當前軌必須靜音
        } else {
          audio.muted = isMuted || volSetting === 0;
          if (audio.duration) setDuration(audio.duration);
          try { audio.volume = volSetting; } catch (e) {}
        }
      }
    });
  }, [assetVolumes, isMuted, currentVersion, versions]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, [supabase]);

  const fetchInitialComments = useCallback(async () => {
    if (!currentVersion) return;
    setIsLoadingComments(true);
    setPage(1);
    try {
      const { data, count } = await getComments(currentVersion.id, projectId, 1, PAGE_SIZE);
      setComments(data);
      setTotalCount(count); 
      setHasMore(data.length < count); 
    } catch (error) { console.error(error); } finally { setIsLoadingComments(false); }
  }, [currentVersion, projectId]);

  const handleLoadMore = async () => {
    if (!currentVersion || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    try {
      const { data, count } = await getComments(currentVersion.id, projectId, nextPage, PAGE_SIZE);
      setComments(prev => [...prev, ...data]);
      setTotalCount(count);
      setPage(nextPage);
      setHasMore(comments.length + data.length < count);
    } catch (error) { console.error(error); } finally { setIsLoadingMore(false); }
  };

  useEffect(() => { fetchInitialComments(); }, [fetchInitialComments]);

  // 播放控制
  const togglePlayPause = () => {
    const newState = !isPlaying;
    setIsPlaying(newState);
    Object.values(audioRefs.current).forEach(audio => {
      if (newState) {
        audio.play().catch(err => console.log("Playback blocked:", err));
      } else {
        audio.pause();
      }
    });
  };

  // 進度跳轉 (同步所有音軌)
  const handleSeek = (value: number) => {
    setCurrentTime(value);
    syncAllTracks(value);
  };

  // ✅ 6. 切換版本：處理長度不一與即時對齊
  const handleVersionSelect = (version: Version) => {
    if (currentVersion?.id === version.id) {
      togglePlayPause();
      return;
    }
    
    // 先對齊目標軌時間，再切換視圖
    const targetAudio = audioRefs.current[version.id];
    if (targetAudio) {
      targetAudio.currentTime = Math.min(currentTime, targetAudio.duration || Infinity);
    }
    
    setCurrentVersion(version);
  };

  const handleVolumeUpdate = (value: number) => {
    if (!currentVersion) return;
    setAssetVolumes(prev => ({ ...prev, [currentVersion.id]: value }));
    if (value > 0) setIsMuted(false);
  };

  const handleRenameAsset = async () => {
    if (!currentVersion || !newName.trim()) return;
    try {
      await updateAssetName(projectId, currentVersion.id, newName);
      toast.success("版本名稱已更新");
      setIsRenameDialogOpen(false);
      router.refresh();
    } catch (error) { toast.error("更新失敗"); }
  };

  const confirmDelete = async () => {
    if (!currentVersion) return;
    setIsDeletingAsset(true);
    try {
      await deleteAsset(projectId, currentVersion.id);
      toast.success("版本已刪除");
      const remaining = versions.filter(v => v.id !== currentVersion.id);
      if (remaining.length > 0) setCurrentVersion(remaining[0]);
      setIsDeleteDialogOpen(false);
      router.refresh();
    } catch (error) { toast.error("刪除失敗"); } finally { setIsDeletingAsset(false); }
  };

  return (
    <div className="max-w-full mx-auto pb-4 space-y-4 px-0 md:px-4">
      {/* 背景渲染所有版本音軌 */}
      {versions.map((v) => (
        <audio
          key={v.id}
          ref={(el) => { if (el) audioRefs.current[v.id] = el; }}
          src={`${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${v.storage_path.replace(/^\//, '')}`}
          preload="auto"
          playsInline
          onTimeUpdate={(e) => {
            if (currentVersion?.id === v.id) setCurrentTime(e.currentTarget.currentTime);
          }}
          onLoadedMetadata={(e) => {
            if (currentVersion?.id === v.id) setDuration(e.currentTarget.duration);
          }}
          onEnded={() => {
            if (currentVersion?.id === v.id) setIsPlaying(false);
          }}
        />
      ))}

      {/* 核心播放器容器 */}
      <div className="sticky top-[70px] md:top-[80px] z-30 flex flex-col h-[calc(100vh-100px)] md:h-[calc(100vh-120px)] bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="relative shrink-0 bg-zinc-950">
              {canEdit && (
                <div className="absolute top-4 right-4 z-20">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full">
                        <MoreHorizontal className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                      <DropdownMenuItem onClick={() => { if (currentVersion) { setNewName(currentVersion.name); setIsRenameDialogOpen(true); }}} className="cursor-pointer focus:bg-zinc-800">
                        <Edit className="mr-2 h-4 w-4" /> 重新命名
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-zinc-800" />
                      <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="cursor-pointer text-red-400 focus:bg-red-900/20">
                        <Trash2 className="mr-2 h-4 w-4" /> 刪除版本
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              <div className="p-4 md:p-6 pb-2">
                <PlayerControls
                  isPlaying={isPlaying}
                  onPlayPauseToggle={togglePlayPause}
                  currentVersionName={currentVersion?.name}
                  currentTime={currentTime}
                  duration={duration}
                  onSeek={handleSeek}
                  comments={comments} 
                  volume={assetVolumes[currentVersion?.id || ""] ?? 0.9}
                  isMuted={isMuted}
                  onVolumeChange={handleVolumeUpdate}
                  onMuteToggle={() => setIsMuted(!isMuted)}
                />
              </div>

              {isVersionsExpanded && (
                <div className="px-4 md:px-6 pb-4 md:pb-6 animate-in fade-in slide-in-from-top-1 duration-200">
                  <VersionList versions={versions} currentVersionId={currentVersion?.id || null} isPlaying={isPlaying} onVersionSelect={handleVersionSelect} className="w-full" />
                </div>
              )}

              <div className="relative border-b border-zinc-800/50">
                <button onClick={() => setIsVersionsExpanded(!isVersionsExpanded)} className="absolute left-1/2 -translate-x-1/2 -top-3 z-40 bg-zinc-950 border border-zinc-800 rounded-full w-14 h-6 flex items-center justify-center text-zinc-500 hover:text-white transition-all shadow-md group">
                  {isVersionsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
          </div>

          <div className="flex-1 min-h-0 bg-zinc-900/20 px-2 md:px-4 pt-4">
            <TrackComments projectId={projectId} assetId={currentVersion?.id || ""} currentTime={currentTime} canEdit={canEdit} comments={comments} isLoading={isLoadingComments} isLoadingMore={isLoadingMore} hasMore={hasMore} totalCount={totalCount} currentUserId={currentUserId} onSeek={handleSeek} onRefresh={fetchInitialComments} onLoadMore={handleLoadMore} className="h-full pb-4" />
          </div>
      </div>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader><DialogTitle>重新命名版本</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white focus:ring-blue-600" placeholder="輸入新的版本名稱" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRenameDialogOpen(false)} className="text-zinc-400 hover:text-white">取消</Button>
            <Button onClick={handleRenameAsset} className="bg-blue-600 hover:bg-blue-500">儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500 font-bold flex items-center gap-2 text-lg">
              <Trash2 className="w-5 h-5" /> 刪除此版本嗎？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 mt-2 leading-relaxed">
              此動作<span className="text-white font-bold mx-1">無法復原</span>。版本 "{currentVersion?.name}" 的音檔與留言將被永久刪除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="bg-transparent border-zinc-800 text-zinc-400">我再想想</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeletingAsset} className="bg-red-600 hover:bg-red-700 text-white">
              {isDeletingAsset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "確認刪除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}