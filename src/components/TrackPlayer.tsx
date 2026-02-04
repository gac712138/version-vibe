"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation"; 
import { PlayerControls } from "./PlayerControls";
import { VersionList } from "./VersionList";
import { CommentInput } from "@/app/project/[id]/CommentInput"; 
import { createClient } from "@/utils/supabase/client";
import { deleteComment, updateComment } from "@/app/actions/comments";
import { updateAssetName, deleteAsset } from "@/app/actions/assets"; // 👈 引入新 Action
import { MoreVertical, Pencil, Trash2, X, Check, MoreHorizontal, Edit } from "lucide-react";
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

interface Comment {
  id: string;
  content: string;
  timestamp: number;
  asset_id: string;
  user_id: string;
}

interface TrackPlayerProps {
  projectId: string;
  versions: Version[];
}

export function TrackPlayer({ projectId, versions }: TrackPlayerProps) {
  const router = useRouter();
  
  // 1. 核心狀態
  const [currentVersion, setCurrentVersion] = useState<Version | null>(versions[0] || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // 控制跳轉後的行為
  const [pendingSeekTime, setPendingSeekTime] = useState<number | null>(null);
  const [shouldPlayAfterSeek, setShouldPlayAfterSeek] = useState(false);

  // 留言編輯狀態
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // ✅ Asset 編輯狀態 (Rename)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchParams = useSearchParams();
  const supabase = createClient();

  // 2. 獲取使用者
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, [supabase]);

  // 3. 獲取留言
  const fetchComments = useCallback(async () => {
    if (!currentVersion) return;
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("asset_id", currentVersion.id)
      .order("timestamp", { ascending: true });
    
    if (!error && data) setComments(data);
  }, [currentVersion, supabase]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // 4. 監聽 URL 變化 (通知跳轉)
  useEffect(() => {
    const targetVersionId = searchParams.get("versionId");
    // 確保 versions 裡真的有這個 ID 才切換，避免被刪除的 ID 導致錯誤
    if (targetVersionId && currentVersion?.id !== targetVersionId) {
      const targetVersion = versions.find(v => v.id === targetVersionId);
      if (targetVersion) {
        setCurrentVersion(targetVersion);
      }
    }

    const targetCommentId = searchParams.get("commentId");
    if (targetCommentId && comments.length > 0) {
      const targetComment = comments.find(c => c.id === targetCommentId);
      if (targetComment) {
        console.log("📍 通知跳轉: 準備跳至", targetComment.timestamp);
        setPendingSeekTime(targetComment.timestamp);
        setShouldPlayAfterSeek(false); 
      }
    }
  }, [searchParams, versions, comments, currentVersion]);

  // 5. 音訊初始化
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

  // 6. 切換版本邏輯
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

  // --- 留言操作 (保持不變) ---
  const handleCommentDelete = async (id: string) => {
    if (!confirm("確定要刪除這條留言嗎？")) return;
    try {
      await deleteComment(id);
      toast.success("留言已刪除");
      fetchComments();
    } catch (error) {
      toast.error("刪除失敗");
    }
  };

  const handleCommentUpdate = async (id: string) => {
    if (!editContent.trim()) return;
    try {
      await updateComment(id, editContent);
      setEditingId(null);
      toast.success("留言已更新");
      fetchComments();
    } catch (error) {
      toast.error("更新失敗");
    }
  };

  // --- ✅ Asset (版本) 操作 ---

  const handleRenameAsset = async () => {
    if (!currentVersion || !newName.trim()) return;
    try {
      await updateAssetName(projectId, currentVersion.id, newName);
      toast.success("版本名稱已更新");
      setIsRenameDialogOpen(false);
      router.refresh(); // 重新整理以更新列表
    } catch (error) {
      console.error(error);
      toast.error("更新失敗");
    }
  };

  const handleDeleteAsset = async () => {
    if (!currentVersion) return;
    if (!confirm(`確定要刪除版本 "${currentVersion.name}" 嗎？此操作無法復原，且所有相關留言也會被刪除。`)) return;

    try {
      await deleteAsset(projectId, currentVersion.id);
      toast.success("版本已刪除");
      
      // 刪除後，切換到列表中的第一個版本 (如果還有)
      const remaining = versions.filter(v => v.id !== currentVersion.id);
      if (remaining.length > 0) {
        setCurrentVersion(remaining[0]);
      } else {
        // 如果刪光了，重新整理讓 Server Component 處理空狀態
        router.refresh();
      }
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("刪除失敗");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
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
                if (playPromise !== undefined) {
                    playPromise.then(() => setIsPlaying(true)).catch(console.warn);
                }
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

      {/* ✅ 新增：版本資訊與操作標題列 */}
      <div className="flex items-end justify-between px-2">
        <div>
           <h2 className="text-2xl font-bold text-white flex items-center gap-2">
             {currentVersion?.name}
             <span className="text-sm font-normal text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
               v{currentVersion?.version_number}
             </span>
           </h2>
           <p className="text-xs text-zinc-500 mt-1">
             Created at {currentVersion && new Date(currentVersion.created_at).toLocaleDateString()}
           </p>
        </div>

        {/* 版本操作選單 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white">
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

      <div className="relative">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <VersionList
            versions={versions}
            currentVersionId={currentVersion?.id || null}
            isPlaying={isPlaying}
            onVersionSelect={handleVersionSelect}
          />
        </div>
        
        {/* 留言區域 */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex flex-col h-[600px] shadow-2xl">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">留言反饋</h3>
            <span className="text-[10px] text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">
              {comments.length}
            </span>
          </div>
          
          <div className="mb-6">
            <CommentInput 
              projectId={projectId} 
              assetId={currentVersion?.id || ""} 
              currentTime={currentTime}
              onCommentSuccess={fetchComments} 
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
            {comments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2 opacity-50">
                <p className="text-xs italic">尚無留言，標記你的第一個想法</p>
              </div>
            ) : (
              comments.map(c => {
                 const isTargetComment = searchParams.get("commentId") === c.id;

                 return (
                  <div 
                    key={c.id} 
                    id={`comment-${c.id}`}
                    className={`p-3 rounded-lg border-l-4 transition-all ${
                      editingId === c.id 
                        ? "bg-zinc-800 border-blue-500" 
                        : isTargetComment
                          ? "bg-blue-900/30 border-blue-400 ring-1 ring-blue-500/50" 
                          : "bg-zinc-800/40 border-transparent border-l-blue-500 hover:bg-zinc-800"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <button 
                        onClick={() => handleSeek(c.timestamp)}
                        className="text-[10px] font-mono text-blue-400 bg-blue-400/10 px-2 py-1 rounded border border-blue-400/20 active:scale-95 transition-transform"
                      >
                        {new Date(c.timestamp * 1000).toISOString().substr(14, 5)}
                      </button>
                      
                      {currentUserId === c.user_id && editingId !== c.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-zinc-500 hover:text-white">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                            <DropdownMenuItem 
                              onClick={() => { setEditingId(c.id); setEditContent(c.content); }}
                              className="cursor-pointer focus:bg-zinc-800 focus:text-white"
                            >
                              <Pencil className="mr-2 h-3.5 w-3.5" /> 編輯留言
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleCommentDelete(c.id)} 
                              className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-900/20"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> 刪除留言
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {editingId === c.id ? (
                      <div className="animate-in fade-in zoom-in-95 duration-200">
                        <textarea 
                          value={editContent} 
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded p-3 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[80px] resize-none"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => setEditingId(null)}
                            className="h-8 text-zinc-400 hover:text-white"
                          >
                            <X className="w-4 h-4 mr-1" /> 取消
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleCommentUpdate(c.id)}
                            className="h-8 bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Check className="w-4 h-4 mr-1" /> 儲存
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-300 leading-relaxed break-words whitespace-pre-wrap">
                        {c.content}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>重新命名版本</DialogTitle>
          </DialogHeader>
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
            <Button onClick={handleRenameAsset} className="bg-blue-600 hover:bg-blue-500">
              儲存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}