"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation"; 
import { PlayerControls } from "./PlayerControls";
import { VersionList } from "./VersionList";
import { CommentInput } from "@/app/project/[id]/CommentInput"; 
import { createClient } from "@/utils/supabase/client";
import { deleteComment, updateComment } from "@/app/actions/comments";
import { MoreVertical, Pencil, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  // 1. 核心狀態
  const [currentVersion, setCurrentVersion] = useState<Version | null>(versions[0] || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // ✅ 新增：控制跳轉後的行為
  const [pendingSeekTime, setPendingSeekTime] = useState<number | null>(null);
  const [shouldPlayAfterSeek, setShouldPlayAfterSeek] = useState(false); // true=續播, false=暫停

  // 編輯狀態
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

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
    // A. 處理版本切換
    const targetVersionId = searchParams.get("versionId");
    if (targetVersionId && currentVersion?.id !== targetVersionId) {
      const targetVersion = versions.find(v => v.id === targetVersionId);
      if (targetVersion) {
        setCurrentVersion(targetVersion);
      }
    }

    // B. 處理時間跳轉 (來自通知)
    const targetCommentId = searchParams.get("commentId");
    if (targetCommentId && comments.length > 0) {
      const targetComment = comments.find(c => c.id === targetCommentId);
      if (targetComment) {
        console.log("📍 通知跳轉: 準備跳至", targetComment.timestamp);
        setPendingSeekTime(targetComment.timestamp);
        setShouldPlayAfterSeek(false); // 🔔 通知點進來 -> 跳轉後暫停
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
      }
    }
  }, [currentVersion]);

  // ✅ 6. 切換版本邏輯 (修正手機版無法記憶秒數的問題)
  const handleVersionSelect = (version: Version) => {
    if (currentVersion?.id === version.id) {
        togglePlayPause();
        return;
    }

    // 1. 先把當前的秒數存起來
    if (audioRef.current) {
        const currentPos = audioRef.current.currentTime;
        console.log("🔄 切換版本，記憶秒數:", currentPos);
        setPendingSeekTime(currentPos);
        
        // 2. 如果原本正在播，切換後就繼續播；原本暫停就維持暫停
        setShouldPlayAfterSeek(isPlaying); 
    }

    // 3. 切換版本 (這會觸發 useEffect 更新 src)
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

  // ... (刪除與更新留言邏輯保持不變)
  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除這條留言嗎？")) return;
    try {
      await deleteComment(id);
      toast.success("留言已刪除");
      fetchComments();
    } catch (error) {
      toast.error("刪除失敗");
    }
  };

  const handleUpdate = async (id: string) => {
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

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        // ✅ 關鍵修正：Metadata 載入完成後，執行「恢復秒數」與「決定是否播放」
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          
          if (pendingSeekTime !== null) {
            console.log(`🔊 恢復播放狀態: ${pendingSeekTime}s, 自動播放: ${shouldPlayAfterSeek}`);
            
            // 1. 恢復秒數
            e.currentTarget.currentTime = pendingSeekTime;
            
            // 2. 根據情境決定播放或暫停
            if (shouldPlayAfterSeek) {
                e.currentTarget.play()
                    .then(() => setIsPlaying(true))
                    .catch(err => console.warn("Autoplay prevented:", err));
            } else {
                e.currentTarget.pause();
                setIsPlaying(false);
            }

            // 3. 重置狀態
            setPendingSeekTime(null);
          }
        }}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* 以下 UI 保持不變 */}
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
                              onClick={() => handleDelete(c.id)} 
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
                            onClick={() => handleUpdate(c.id)}
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
    </div>
  );
}