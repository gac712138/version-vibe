"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation"; // ✅ 1. 引入 hook
import { PlayerControls } from "./PlayerControls";
import { VersionList } from "./VersionList";
import { TrackComments } from "@/components/track/TrackComments"; 
import { createClient } from "@/utils/supabase/client";
import { getComments, type CommentWithUser } from "@/app/actions/comments"; 
import { updateAssetName, deleteAsset } from "@/app/actions/assets"; 
import { MoreHorizontal, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
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

export function TrackPlayer({ projectId, versions: initialVersions, canEdit }: TrackPlayerProps) {
  const supabase = createClient();
  const searchParams = useSearchParams(); // ✅ 2. 取得 URL 參數
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const [versions, setVersions] = useState<Version[]>(initialVersions);

  useEffect(() => {
    setVersions(initialVersions);
  }, [initialVersions]);

  const [currentVersion, setCurrentVersion] = useState<Version | null>(initialVersions[0] || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // 用來防止重複跳轉的 Ref (避免背景更新時一直把時間拉回去)
  const lastSeekKey = useRef<string | null>(null);

  // ------------------------------------------------------------------
  // ✅ 3. 新增：處理 URL 參數 (?assetId=...&t=...) 自動導航與跳轉
  // ------------------------------------------------------------------
  useEffect(() => {
    const assetIdParam = searchParams.get("assetId");
    const timeParam = searchParams.get("t");
    const uniqueKey = `${assetIdParam}-${timeParam}`; // 組合出一個唯一 key

    // 1. 版本切換邏輯
    // 如果 URL 指定了 assetId，且我們還沒切換過去，就先切換版本
    if (assetIdParam && currentVersion?.id !== assetIdParam) {
      const targetVersion = versions.find(v => v.id === assetIdParam);
      if (targetVersion) {
        setCurrentVersion(targetVersion);
        // 切換後會觸發 re-render，下一次進來這個 effect 時 id 就會匹配了
        return; 
      }
    }

    // 2. 時間跳轉邏輯
    if (timeParam && currentVersion) {
      // 確保我們已經在正確的版本上才執行跳轉 (如果 assetIdParam 存在的話)
      if (assetIdParam && currentVersion.id !== assetIdParam) return;

      // 防止重複執行：如果這個 asset+time 已經跳轉過了，就不再執行
      if (lastSeekKey.current === uniqueKey) return;

      const seekTime = parseFloat(timeParam);
      if (!isNaN(seekTime)) {
        console.log(`🚀 [AutoSeek] Jumping to ${seekTime}s on asset ${currentVersion.name}`);
        
        setCurrentTime(seekTime);
        
        // 操作 Audio DOM
        setTimeout(() => {
          const audio = audioRefs.current[currentVersion.id];
          if (audio) {
            audio.currentTime = seekTime;
            // 如果希望點進來自動播放，可以解開下面這行：
            // audio.play().catch(e => console.log("Auto-play blocked")); setIsPlaying(true);
          }
        }, 300); // 稍微延遲確保 DOM 準備好

        // 標記已處理
        lastSeekKey.current = uniqueKey;
      }
    }
  }, [searchParams, currentVersion, versions]);

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

  const handleCommentCountChange = useCallback((assetId: string, delta: number) => {
    setVersions((prev) => 
      prev.map((v) => {
        if (v.id === assetId) {
          const currentCount = v.comment_count?.[0]?.count || 0;
          return { ...v, comment_count: [{ count: Math.max(0, currentCount + delta) }] };
        }
        return v;
      })
    );
  }, []);

  useEffect(() => {
    const channel = supabase.channel('global-track-player-counter')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const targetAssetId = payload.new.asset_id;
            if (targetAssetId === currentVersion?.id) return;

            setVersions(prev => prev.map(v => {
              if (v.id === targetAssetId) {
                const currentCount = v.comment_count?.[0]?.count || 0;
                return { ...v, comment_count: [{ count: currentCount + 1 }] };
              }
              return v;
            }));
          }

          if (payload.eventType === 'DELETE' && payload.old.asset_id) {
             const targetAssetId = payload.old.asset_id;
             if (targetAssetId === currentVersion?.id) return;

             setVersions(prev => prev.map(v => {
              if (v.id === targetAssetId) {
                const currentCount = v.comment_count?.[0]?.count || 0;
                return { ...v, comment_count: [{ count: Math.max(0, currentCount - 1) }] };
              }
              return v;
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentVersion?.id, supabase]); 

  // 初始化音量
  useEffect(() => {
    const savedVolumes = localStorage.getItem("asset-volumes-map");
    if (savedVolumes) {
      try { setAssetVolumes(JSON.parse(savedVolumes)); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    if (Object.keys(assetVolumes).length > 0) {
      localStorage.setItem("asset-volumes-map", JSON.stringify(assetVolumes));
    }
  }, [assetVolumes]);

  // 初始化 Audio
  useEffect(() => {
    versions.forEach(v => {
      const audio = audioRefs.current[v.id];
      if (audio) {
        const isCurrent = currentVersion?.id === v.id;
        const volSetting = assetVolumes[v.id] ?? 0.9;

        if (!isCurrent) {
          audio.muted = true;
        } else {
          audio.muted = isMuted || volSetting === 0;
          try {
            audio.volume = volSetting; 
            if (audio.duration) setDuration(audio.duration);
          } catch (e) { console.warn(e); }
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

  const togglePlayPause = () => {
    const newState = !isPlaying;
    setIsPlaying(newState);
    Object.values(audioRefs.current).forEach(audio => {
      if (newState) {
        audio.play().catch(err => console.log("Playback blocked", err));
      } else {
        audio.pause();
      }
    });
  };

  const handleSeek = (value: number) => {
    setCurrentTime(value);
    Object.values(audioRefs.current).forEach(audio => {
      audio.currentTime = Math.min(value, audio.duration || Infinity);
    });
  };

  const handleVersionSelect = (version: Version) => {
    if (currentVersion?.id === version.id) {
      togglePlayPause();
      return;
    }
    const targetAudio = audioRefs.current[version.id];
    if (targetAudio) {
      if (currentTime > targetAudio.duration) {
        handleSeek(targetAudio.duration);
      }
      setDuration(targetAudio.duration);
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
      setVersions(prev => prev.map(v => v.id === currentVersion.id ? { ...v, name: newName } : v));
      setCurrentVersion(prev => prev ? { ...prev, name: newName } : null);
      setIsRenameDialogOpen(false);
    } catch (error) { toast.error("更新失敗"); }
  };

  const confirmDelete = async () => {
    if (!currentVersion) return;
    setIsDeletingAsset(true);
    try {
      await deleteAsset(projectId, currentVersion.id);
      toast.success("版本已刪除");
      setIsDeleteDialogOpen(false);
      setVersions(prev => prev.filter(v => v.id !== currentVersion.id));
      setCurrentVersion(null); 
    } catch (error) { toast.error("刪除失敗"); } finally { setIsDeletingAsset(false); }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white">
      
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

      {/* --- Section 1: Player Controls --- */}
      <div className="shrink-0 p-4 md:p-6 bg-zinc-950 border-b border-zinc-800/50 relative z-10">
        {canEdit && (
            <div className="absolute top-2 right-2 md:top-4 md:right-4 z-20">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full">
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                  <DropdownMenuItem onClick={() => { if (currentVersion) { setNewName(currentVersion.name); setIsRenameDialogOpen(true); }}} className="cursor-pointer focus:bg-zinc-800">
                    <Edit className="mr-2 h-4 w-4" /> 重新命名版本
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="cursor-pointer text-red-400">
                    <Trash2 className="mr-2 h-4 w-4" /> 刪除版本
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
        )}

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

      {/* --- Section 2: Asset List --- */}
      <div className="shrink-0 bg-zinc-950 border-b border-zinc-800 relative z-10">
        <div className={cn(
          "transition-all duration-1000 ease-in-out overflow-hidden",
          isVersionsExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}>
          <div className="max-h-[30vh] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 p-4 pt-4 pb-6">
             <VersionList 
                versions={versions} 
                currentVersionId={currentVersion?.id || null} 
                isPlaying={isPlaying} 
                onVersionSelect={handleVersionSelect} 
                className="w-full" 
             />
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 z-20">
          <button 
            onClick={() => setIsVersionsExpanded(!isVersionsExpanded)} 
            className="bg-zinc-950 border border-zinc-800 rounded-full w-12 h-5 flex items-center justify-center text-zinc-500 hover:text-white shadow-sm transition-colors cursor-pointer"
          >
            {isVersionsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* --- Section 3: Comments --- */}
      <div className="flex-1 min-h-0 flex flex-col bg-zinc-900/20 relative z-0">
        <TrackComments  
            projectId={projectId} 
            assetId={currentVersion?.id || ""} 
            currentTime={currentTime} 
            canEdit={canEdit} 
            comments={comments} 
            isLoading={isLoadingComments} 
            isLoadingMore={isLoadingMore} 
            hasMore={hasMore} 
            totalCount={totalCount} 
            currentUserId={currentUserId} 
            onSeek={handleSeek} 
            onRefresh={fetchInitialComments} 
            onLoadMore={handleLoadMore} 
            onCommentChange={handleCommentCountChange} 
            className="flex-1 flex flex-col min-h-0" 
        />
      </div>

      {/* Dialogs ... */}
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
        <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500">刪除此版本嗎？</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">此動作無法復原。音檔與留言將被永久刪除。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-zinc-800 text-zinc-400">取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeletingAsset} className="bg-red-600">確認刪除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}