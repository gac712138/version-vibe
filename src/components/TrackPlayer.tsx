"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation"; 
import { PlayerControls } from "./PlayerControls";
import { VersionList } from "./VersionList";
import { TrackComments } from "@/components/track/TrackComments"; 
import { createClient } from "@/utils/supabase/client";
import { getComments, type CommentWithUser } from "@/app/actions/comments"; 
import { updateAssetName, deleteAsset } from "@/app/actions/assets"; 
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
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

interface Version {
  id: string;
  version_number: number;
  name: string;
  created_at: string;
  storage_path: string;
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

  // --- 狀態提升 (Lifted State) ---
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // ✅ 新增：分頁狀態管理
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 10;

  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, [supabase]);

  // ✅ 1. 初始載入 / 重置 (Reset)
  const fetchInitialComments = useCallback(async () => {
    if (!currentVersion) return;
    
    setIsLoadingComments(true);
    setPage(1); // 重置頁數

    try {
      // 模擬載入延遲 (可選)
      // await new Promise(resolve => setTimeout(resolve, 300));

      const { data, count } = await getComments(currentVersion.id, projectId, 1, PAGE_SIZE);
      
      setComments(data);
      setTotalCount(count); // 更新總數
      setHasMore(data.length < count); // 如果抓回來的少於總數，代表還有更多

    } catch (error) {
      console.error("Failed to fetch comments", error);
    } finally {
      setIsLoadingComments(false);
    }
  }, [currentVersion, projectId]);

  // ✅ 2. 載入更多 (Load More)
  const handleLoadMore = async () => {
    if (!currentVersion || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;

    try {
      // await new Promise(resolve => setTimeout(resolve, 500)); // 測試捲動動畫用

      const { data, count } = await getComments(currentVersion.id, projectId, nextPage, PAGE_SIZE);
      
      setComments(prev => [...prev, ...data]); // 追加資料
      setTotalCount(count);
      setPage(nextPage);
      
      // 判斷是否還有更多：目前顯示數量 + 這次抓的數量 < 總數 ?
      // 或者更簡單：這次抓回來的是否小於 PAGE_SIZE ? (如果小於代表是最後一頁)
      // 但用總數判斷最準：
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
    
    // 切換版本時，清空狀態
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

  const handleDeleteAsset = async () => {
    if (!currentVersion) return;
    if (!confirm(`確定要刪除版本 "${currentVersion.name}" 嗎？此操作無法復原。`)) return;
    try {
      await deleteAsset(projectId, currentVersion.id);
      toast.success("版本已刪除");
      const remaining = versions.filter(v => v.id !== currentVersion.id);
      if (remaining.length > 0) setCurrentVersion(remaining[0]);
      else router.refresh();
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("刪除失敗");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ✅ 修改 1: 左側播放器 top-24 (拉大距離) */}
        <div className="lg:col-span-2 sticky top-24 z-30">
           
           {/* ✅ 修改 2: 背景改為實色 bg-zinc-950 */}
           <div className="relative bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
              
              {canEdit && (
                <div className="absolute top-6 right-6 z-20">
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

              <div className="px-6 pb-6 pt-2">
                <VersionList
                  versions={versions}
                  currentVersionId={currentVersion?.id || null}
                  isPlaying={isPlaying}
                  onVersionSelect={handleVersionSelect}
                  className="w-full"
                />
              </div>
           </div>
        </div>
        
        {/* ✅ 修改 3: 右側留言板也加入 sticky，並限制高度，使其獨立捲動 */}
        <TrackComments 
           className="sticky top-24 h-[calc(100vh-8rem)]"
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
        />
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
    </div>
  );
}