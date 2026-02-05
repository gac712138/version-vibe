"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation"; 
import { PlayerControls } from "./PlayerControls";
import { VersionList } from "./VersionList";
import { CommentInput } from "@/app/project/[id]/CommentInput"; 
import { createClient } from "@/utils/supabase/client";
import { deleteComment, updateComment } from "@/app/actions/comments";
import { updateAssetName, deleteAsset } from "@/app/actions/assets"; 
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
  canEdit: boolean; // ✅ 修正：新增 canEdit 介面定義，解決 TypeScript 報錯
}

export function TrackPlayer({ projectId, versions, canEdit }: TrackPlayerProps) {
  // ... (State 和 Hook 邏輯保持不變)
  const router = useRouter();
  const [currentVersion, setCurrentVersion] = useState<Version | null>(versions[0] || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pendingSeekTime, setPendingSeekTime] = useState<number | null>(null);
  const [shouldPlayAfterSeek, setShouldPlayAfterSeek] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, [supabase]);

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

      <div className="px-2">
         <div className="flex items-center gap-3 mb-1">
           <h2 className="text-2xl font-bold text-white truncate">
             {currentVersion?.name}
           </h2>
           <span className="shrink-0 text-xs font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
             v{currentVersion?.version_number}
           </span>
         </div>
         <p className="text-xs text-zinc-500">
           Created at {currentVersion && new Date(currentVersion.created_at).toLocaleDateString()}
         </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
           <div className="relative bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
              
              {/* ✨ A. 右上角操作按鈕 (僅 Owner/Admin 可見) */}
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
                      
                      {/* ✅ 改動：Owner 或本人可以管理留言 */}
                      {(currentUserId === c.user_id || canEdit) && editingId !== c.id && (
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
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 text-zinc-400 hover:text-white">
                            <X className="w-4 h-4 mr-1" /> 取消
                          </Button>
                          <Button size="sm" onClick={() => handleCommentUpdate(c.id)} className="h-8 bg-blue-600 hover:bg-blue-700 text-white">
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