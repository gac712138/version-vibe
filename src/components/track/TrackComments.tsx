"use client";

import { useState, useRef, useCallback } from "react";
import { type CommentWithUser, deleteComment, updateComment } from "@/app/actions/comments";
import { CommentInput } from "@/app/project/[id]/CommentInput";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MoreVertical, Pencil, Trash2, X, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils"; 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// 骨架屏保持不變
function CommentsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse px-1">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
          <div className="w-8 h-8 bg-zinc-600 rounded-full shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="flex justify-between">
              <div className="h-3 bg-zinc-600 rounded w-20" />
              <div className="h-3 bg-zinc-700 rounded w-10" />
            </div>
            <div className="h-4 bg-zinc-700 rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface TrackCommentsProps {
  projectId: string;
  assetId: string;
  currentTime: number;
  canEdit: boolean;
  comments: CommentWithUser[];
  totalCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  currentUserId: string | null;
  onSeek: (time: number) => void;
  onRefresh: () => void;
  onLoadMore: () => void;
  hasMore: boolean;
  className?: string; 
}

export function TrackComments({ 
  projectId, 
  assetId, 
  currentTime, 
  canEdit,
  comments,
  totalCount,
  isLoading,
  isLoadingMore,
  currentUserId,
  onSeek,
  onRefresh,
  onLoadMore,
  hasMore,
  className 
}: TrackCommentsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // --- 無限捲動偵測 ---
  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (isLoading || isLoadingMore) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        onLoadMore();
      }
    });

    if (node) observer.current.observe(node);
  }, [isLoading, isLoadingMore, hasMore, onLoadMore]);
  // ------------------

  const handleCommentDelete = async (id: string) => {
    if (!confirm("確定要刪除這條留言嗎？")) return;
    try {
      await deleteComment(id);
      toast.success("留言已刪除");
      onRefresh();
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
      onRefresh();
    } catch (error) {
      toast.error("更新失敗");
    }
  };

  return (
    // ✅ 修改重點：
    // 1. 移除 h-[600px]
    // 2. 使用 cn() 合併 className
    <div className={cn(
      "bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex flex-col shadow-2xl",
      className 
    )}>
      {/* Header 加入 shrink-0 防止被壓縮 */}
      <div className="flex items-center justify-between mb-4 px-1 shrink-0">
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">留言反饋</h3>
        <span className="text-[10px] text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">
          {isLoading ? "-" : totalCount}
        </span>
      </div>
      
      {/* 輸入框區塊加入 shrink-0 */}
      <div className="mb-6 shrink-0">
        <CommentInput 
          projectId={projectId} 
          assetId={assetId} 
          currentTime={currentTime}
          onCommentSuccess={onRefresh} 
        />
      </div>

      {/* 列表區塊：加入 min-h-0 確保 flex 捲動正常 */}
      <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800 min-h-0">
        {isLoading ? (
          <CommentsSkeleton />
        ) : comments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2 opacity-50">
            <p className="text-xs italic">尚無留言，標記你的第一個想法</p>
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            {comments.map((c, index) => {
              const isLast = index === comments.length - 1;
              
              return (
                <div 
                  key={c.id} 
                  ref={isLast ? lastElementRef : null}
                  className={`p-3 rounded-lg border-l-4 transition-all group ${
                    editingId === c.id 
                      ? "bg-zinc-800 border-blue-500" 
                      : "bg-zinc-800/40 border-transparent border-l-blue-500 hover:bg-zinc-800"
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    <Avatar className="w-8 h-8 border border-zinc-700 shrink-0 mt-0.5">
                      <AvatarImage src={c.author.avatar_url || ""} />
                      <AvatarFallback className="bg-zinc-700 text-zinc-400 text-[10px]">
                        {c.author.display_name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                           <span className="font-bold text-xs text-zinc-300">
                             {c.author.display_name}
                           </span>
                           <button 
                             onClick={() => onSeek(c.timestamp)}
                             className="text-[10px] font-mono text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded hover:bg-blue-400/20 transition-colors"
                           >
                             {new Date(c.timestamp * 1000).toISOString().substr(14, 5)}
                           </button>
                        </div>

                        {(currentUserId === c.user_id || canEdit) && editingId !== c.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="w-3.5 h-3.5" />
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
                        <div className="animate-in fade-in zoom-in-95 duration-200 mt-2">
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
                  </div>
                </div>
              );
            })}
            
            {isLoadingMore && (
                <div className="py-2 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                </div>
            )}
            
            {!hasMore && comments.length > 0 && (
                <div className="text-center py-2 text-[10px] text-zinc-600">
                    已顯示所有留言
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}