"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation"; 
import { PlayerControls } from "./PlayerControls";
import { VersionList } from "./VersionList";
import { TrackComments } from "@/components/track/TrackComments"; 
import { createClient } from "@/utils/supabase/client";
import { getComments, type CommentWithUser } from "@/app/actions/comments"; 
import { updateAssetName, deleteAsset } from "@/app/actions/assets"; 
import { MoreHorizontal, Edit, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
// ✅ 引入 AlertDialog 相關組件
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentVersion, setCurrentVersion] = useState<Version | null>(versions[0] || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [pendingSeekTime, setPendingSeekTime] = useState<number | null>(null);
  const [shouldPlayAfterSeek, setShouldPlayAfterSeek] = useState(false);

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

  // ✅ 新增：控制刪除彈窗與刪除中狀態
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingAsset, setIsDeletingAsset] = useState(false);

  // ✅ 原本的上傳狀態與假進度保持不變
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isUploading) {
      setUploadProgress(0);
      interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) return prev; 
          return prev + Math.random() * 15; 
        });
      }, 600);
    } else {
      setUploadProgress(0);
    }
    return () => clearInterval(interval);
  }, [isUploading]);

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
    } catch (error) {
      console.error("Failed to fetch comments", error);
    } finally {
      setIsLoadingComments(false);
    }
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
    } catch (error) {
      console.error("Load more failed", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchInitialComments();
  }, [fetchInitialComments]);

  useEffect(() => {
    const targetVersionId = searchParams.get("versionId");
    if (targetVersionId && currentVersion?.id !== targetVersionId) {
      const targetVersion = versions.find(v => v.id === targetVersionId);
      if (targetVersion) setCurrentVersion(targetVersion);
    }
  }, [searchParams, versions, currentVersion]);

  useEffect(() => {
    if (currentVersion && audioRef.current) {
      const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
      const cleanPath = currentVersion.storage_path.startsWith('/') 
        ? currentVersion.storage_path.slice(1) 
        : currentVersion.storage_path;
      const newSrc = `${publicUrl}/${cleanPath}`;
      if (audioRef.current.src !== newSrc && !audioRef.current.src.endsWith(newSrc)) {
         audioRef.current.src = newSrc;
         audioRef.current.load();
      }
    }
  }, [currentVersion]);

  const handleVersionSelect = (version: Version) => {
    if (currentVersion?.id === version.id) {
        togglePlayPause();
        return;
    }
    if (audioRef.current) {
        const currentPos = audioRef.current.currentTime;
        setPendingSeekTime(currentPos);
        setShouldPlayAfterSeek(isPlaying); 
    }
    setComments([]); 
    setIsLoadingComments(true);
    setPage(1);
    setHasMore(true);
    setTotalCount(0);
    setCurrentVersion(version);
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !currentVersion) return;
    isPlaying ? audioRef.current.pause() : audioRef.current.play().catch(console.error);
  };

  const handleSeek = (value: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value;
      setCurrentTime(value);
    }
  };

  const handleRenameAsset = async () => {
    if (!currentVersion || !newName.trim()) return;
    try {
      await updateAssetName(projectId, currentVersion.id, newName);
      toast.success("版本名稱已更新");
      setIsRenameDialogOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("更新失敗");
    }
  };

  // ✅ 修正後的刪除按鈕：僅負責打開彈窗
  const handleDeleteAsset = () => {
    if (!currentVersion) return;
    setIsDeleteDialogOpen(true);
  };

  // ✅ 新增：確認刪除的執行邏輯
  const confirmDelete = async () => {
    if (!currentVersion) return;
    setIsDeletingAsset(true);
    try {
      await deleteAsset(projectId, currentVersion.id);
      toast.success("版本已刪除");
      const remaining = versions.filter(v => v.id !== currentVersion.id);
      if (remaining.length > 0) {
        setCurrentVersion(remaining[0]);
      } else {
        router.refresh();
      }
      setIsDeleteDialogOpen(false); // 成功後關閉彈窗
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("刪除失敗");
    } finally {
      setIsDeletingAsset(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-4 px-4 space-y-4">
      <audio
        ref={audioRef}
        preload="auto"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          if (pendingSeekTime !== null) {
            e.currentTarget.currentTime = pendingSeekTime;
            if (shouldPlayAfterSeek) {
                const playPromise = e.currentTarget.play();
                if (playPromise !== undefined) playPromise.then(() => setIsPlaying(true)).catch(console.warn);
            } else {
                e.currentTarget.pause();
                setIsPlaying(false);
            }
            setPendingSeekTime(null);
          }
        }}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <div className="sticky top-[132px] z-30 flex flex-col h-[calc(100vh-140px)] bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
          
          <div className="relative shrink-0 border-b border-zinc-800/50 bg-zinc-950">
              {canEdit && (
                <div className="absolute top-4 right-4 z-20">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full">
                        <MoreHorizontal className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                      <DropdownMenuItem 
                        onClick={() => {
                          if (currentVersion) {
                            setNewName(currentVersion.name);
                            setIsRenameDialogOpen(true);
                          }
                        }}
                        className="cursor-pointer focus:bg-zinc-800 focus:text-white"
                      >
                        <Edit className="mr-2 h-4 w-4" /> 重新命名
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-zinc-800" />
                      <DropdownMenuItem 
                        onClick={handleDeleteAsset}
                        className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-900/20"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> 刪除版本
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              <div className="p-6 pb-2">
                <PlayerControls
                  isPlaying={isPlaying}
                  onPlayPauseToggle={togglePlayPause}
                  currentVersionName={currentVersion?.name}
                  currentTime={currentTime}
                  duration={duration}
                  onSeek={handleSeek}
                  comments={comments} 
                />
              </div>

              <div className="px-6 pb-4">
                <VersionList
                  versions={versions}
                  currentVersionId={currentVersion?.id || null}
                  isPlaying={isPlaying}
                  onVersionSelect={handleVersionSelect}
                  className="w-full"
                />
              </div>
          </div>

          <div className="flex-1 min-h-0 bg-zinc-900/20 px-4">
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
               className="h-full pb-4" 
            />
          </div>
      </div>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader><DialogTitle>重新命名版本</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white focus:ring-blue-600"
              placeholder="輸入新的版本名稱"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" className="text-zinc-400 hover:text-white">取消</Button>
            </DialogClose>
            <Button onClick={handleRenameAsset} className="bg-blue-600 hover:bg-blue-500">儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUploading} onOpenChange={() => {}}> 
        <DialogContent className="sm:max-w-[400px] bg-zinc-950 border-zinc-800 text-white flex flex-col items-center py-10 shadow-2xl backdrop-blur-md">
          <DialogHeader className="flex flex-col items-center">
            <div className="relative mb-6">
              <Loader2 className="w-16 h-16 animate-spin text-blue-600 opacity-20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
              </div>
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight">正在上傳版本...</DialogTitle>
          </DialogHeader>
          
          <div className="w-full space-y-6 mt-4 px-4">
            <p className="text-center text-xs text-zinc-400 leading-relaxed">
              正在上傳檔案，請勿關閉分頁或重新整理。
            </p>
            
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span>UPLOAD PROGRESS</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full transition-all duration-500 ease-out" 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ✅ 新增：刪除版本確認彈窗 (AlertDialog) */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500 font-bold flex items-center gap-2 text-lg">
              <Trash2 className="w-5 h-5" />
              刪除此版本嗎？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 mt-2 leading-relaxed">
              此動作<span className="text-white font-bold mx-1">無法復原</span>。
              <br className="mb-2"/>
              版本 <span className="text-zinc-200 font-semibold">"{currentVersion?.name}"</span> 的音檔及相關留言將被永久刪除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="bg-transparent border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors">
              我再想想
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault(); 
                confirmDelete();
              }}
              disabled={isDeletingAsset}
              className="bg-red-600 hover:bg-red-700 text-white border-0 min-w-[110px] shadow-lg shadow-red-900/20"
            >
              {isDeletingAsset ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 處理中
                </>
              ) : (
                "確認刪除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}