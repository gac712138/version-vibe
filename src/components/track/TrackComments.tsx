"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react"; 
import { type CommentWithUser, deleteComment, updateComment } from "@/app/actions/comments";
// 請根據您的實際檔案結構確認此路徑
import { CommentInput } from "@/app/project/[id]/CommentInput"; 
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Loader2, MessageSquare, X, Reply } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils"; 
import { createClient } from "@/utils/supabase/client"; 
import { useSearchParams } from "next/navigation"; 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getRelativeTime(dateString: string) {
  if (!dateString) return "剛剛";
  const now = new Date();
  const past = new Date(dateString);
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - past.getTime()) / 1000));

  if (diffInSeconds < 60) return "剛剛";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}分鐘前`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}小時前`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}天前`;
  return past.toLocaleDateString();
}

const formatTime = (sec: number) => new Date(sec * 1000).toISOString().substr(14, 5);

// --- Custom Hook: 手勢邏輯 ---
function useSmartGesture({
  onSingleClick,
  onDoubleClick,
  onLongPress,
  enableLongPress = true,
}: {
  onSingleClick: () => void;
  onDoubleClick: () => void;
  onLongPress: () => void;
  enableLongPress?: boolean;
}) {
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    isLongPressRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };

    if (enableLongPress) {
      longPressTimeoutRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(50);
        }
        onLongPress();
      }, 500); 
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (longPressTimeoutRef.current) {
      const moveX = Math.abs(e.clientX - startPosRef.current.x);
      const moveY = Math.abs(e.clientY - startPosRef.current.y);
      if (moveX > 10 || moveY > 10) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isLongPressRef.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressRef.current = false;
      return;
    }

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      onDoubleClick();
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        onSingleClick();
        clickTimeoutRef.current = null;
      }, 250); 
    }
  };

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onClick: handleClick,
    style: { userSelect: 'none' as const, WebkitUserSelect: 'none' as const, touchAction: 'manipulation' as const }, 
  };
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
  onCommentChange?: (assetId: string, delta: number) => void; 
  hasMore: boolean;
  className?: string; 
}

export function TrackComments({ 
  projectId, assetId, currentTime, canEdit, comments: initialComments, totalCount, isLoading, isLoadingMore, currentUserId, onSeek, onRefresh, onLoadMore, onCommentChange, hasMore, className 
}: TrackCommentsProps) {
  const supabase = createClient();
  const searchParams = useSearchParams(); 
  
  const [localComments, setLocalComments] = useState<CommentWithUser[]>(initialComments);
  const commentsRef = useRef<CommentWithUser[]>(initialComments);
  const hasScrolledToComment = useRef(false);

  useEffect(() => {
    setLocalComments(initialComments);
    commentsRef.current = initialComments;
  }, [initialComments]);

  useEffect(() => {
    commentsRef.current = localComments;
  }, [localComments]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [replyTarget, setReplyTarget] = useState<{ 
    id: string; name: string; rootId: string; content: string; timestamp: number; 
  } | null>(null);
  
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const targetCommentId = searchParams.get("commentId");
    if (!targetCommentId || localComments.length === 0 || hasScrolledToComment.current) return;

    const targetComment = localComments.find(c => c.id === targetCommentId);
    if (targetComment) {
      if (targetComment.parent_id) {
        setActiveThreadId(targetComment.parent_id);
      } else {
        setActiveThreadId(targetComment.id);
      }
      setTimeout(() => {
        const element = document.getElementById(`comment-${targetCommentId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);
      hasScrolledToComment.current = true;
    }
  }, [searchParams, localComments]); 

  useEffect(() => {
    hasScrolledToComment.current = false;
  }, [assetId]);

  useEffect(() => {
    if (!assetId) return;

    const channel = supabase.channel(`comments:${assetId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `asset_id=eq.${assetId}` }, async (payload) => {
          const newId = payload.new.id;
          if (commentsRef.current.some(c => c.id === newId)) return;
          onCommentChange?.(assetId, 1);
          const { data: fullComment } = await supabase.from('comments').select(`*, author:profiles(id, display_name, avatar_url)`).eq('id', newId).single();
          if (fullComment) {
            setLocalComments(prev => {
                if (prev.some(c => c.id === fullComment.id)) return prev;
                // @ts-ignore
                return [...prev, fullComment as CommentWithUser];
            });
          }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'comments', filter: `asset_id=eq.${assetId}` }, (payload) => {
          setLocalComments(prev => prev.map(c => c.id === payload.new.id ? { ...c, content: payload.new.content, updated_at: payload.new.updated_at } : c));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments', filter: `asset_id=eq.${assetId}` }, (payload) => {
          const deletedId = payload.old.id;
          if (commentsRef.current.some(c => c.id === deletedId)) {
             onCommentChange?.(assetId, -1);
             setLocalComments(prev => prev.filter(c => c.id !== deletedId));
          }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [assetId, supabase, onCommentChange]);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (isLoading || isLoadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) onLoadMore();
    });
    if (node) observer.current.observe(node);
  }, [isLoading, isLoadingMore, hasMore, onLoadMore]);

  const threadedComments = useMemo(() => {
    const roots = localComments.filter(c => !c.parent_id);
    const replies = localComments.filter(c => c.parent_id);
    return roots.map(root => ({
      ...root,
      replyCount: replies.filter(r => r.parent_id === root.id).length,
      replies: replies.filter(r => r.parent_id === root.id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    }));
  }, [localComments]);

  const handleSelfCommentSuccess = async () => {
    setReplyTarget(null);
    await new Promise(resolve => setTimeout(resolve, 500));
    const { data: myNewComment } = await supabase.from('comments').select(`*, author:profiles (id, display_name, avatar_url)`).eq('asset_id', assetId).eq('user_id', currentUserId).order('created_at', { ascending: false }).limit(1).single();
    if (myNewComment) {
      const exists = commentsRef.current.some(c => c.id === myNewComment.id);
      if (!exists) {
         onCommentChange?.(assetId, 1);
         setLocalComments(prev => [...prev, myNewComment as CommentWithUser]);
         scrollToBottom();
      }
    }
  };
  
  const scrollToBottom = () => {
    setTimeout(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 200);
  };

  const handleCommentDelete = async (id: string) => {
    if (!confirm("確定要刪除這條留言嗎？")) return;
    const exists = localComments.some(c => c.id === id);
    if (exists) {
        onCommentChange?.(assetId, -1);
        setLocalComments(prev => prev.filter(c => c.id !== id));
    }
    try { await deleteComment(id); toast.success("留言已刪除"); } catch (error) { toast.error("刪除失敗"); }
  };

  const handleCommentUpdate = async (id: string, content: string) => {
    if (!content.trim()) return;
    setLocalComments(prev => prev.map(c => c.id === id ? { ...c, content: content, updated_at: new Date().toISOString() } : c));
    setEditingId(null);
    try { await updateComment(id, content); toast.success("留言已更新"); } catch (error) { toast.error("更新失敗"); }
  };

  const ParsedCommentContent = ({ content }: { content: string }) => {
    const parts = content.split(/(@\S+)/g);
    return (
      <span className="text-sm text-zinc-300 leading-relaxed break-words whitespace-pre-wrap select-text">
        {parts.map((part, i) => part.startsWith("@") ? <span key={i} className="text-blue-400 font-bold">{part}</span> : part)}
      </span>
    );
  };

  const CommentItem = ({ c, rootId }: { c: CommentWithUser; rootId?: string }) => {
    const isReply = !!rootId;
    const isOwner = currentUserId === c.user_id;
    const isActiveThread = !isReply && activeThreadId === c.id; 
    const targetId = searchParams.get("commentId");
    const isTarget = targetId === c.id;

    // ✅ 邏輯判斷：如果 updated_at 存在且不為 null，就代表被編輯過
    const isEdited = !!c.updated_at;

    const gestureProps = useSmartGesture({
      onSingleClick: () => {
        if (editingId === c.id) return;
        onSeek(c.timestamp);
      },
      onDoubleClick: () => {
        if (editingId === c.id) return;
        if (isReply) {
          setActiveThreadId(rootId!); 
          setReplyTarget({ id: c.id, name: c.author.display_name, rootId: rootId!, content: c.content, timestamp: c.timestamp });
        } else {
          if (activeThreadId === c.id) {
             setReplyTarget({ id: c.id, name: c.author.display_name, rootId: c.id, content: c.content, timestamp: c.timestamp });
          } else {
             setActiveThreadId(c.id);
             setReplyTarget({ id: c.id, name: c.author.display_name, rootId: c.id, content: c.content, timestamp: c.timestamp });
          }
        }
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
      },
      onLongPress: () => {
        if (isOwner) {
          setMenuOpenId(c.id);
        }
      },
      enableLongPress: isOwner, 
    });

    return (
      <div 
        id={`comment-${c.id}`} 
        className={cn(
            "flex gap-3 mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300 scroll-mt-24", 
            isReply && "ml-12"
        )}
      >
        <Avatar className="w-9 h-9 border border-zinc-800 shrink-0 overflow-hidden rounded-full mt-1">
          <AvatarImage src={c.author.avatar_url || undefined} className="object-cover" />
          <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs flex items-center justify-center">
            {c.author.display_name?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div 
          {...gestureProps}
          className={cn(
            "flex flex-col p-3 rounded-2xl w-fit min-w-[180px] max-w-[85%] md:max-w-[70%] border shadow-sm relative group transition-all duration-300 cursor-pointer active:scale-[0.98]",
            editingId === c.id 
              ? "bg-zinc-800/80 border-blue-500/50 cursor-auto"
              : (isActiveThread || isReply) ? "bg-zinc-900/40 border-zinc-800/50 hover:bg-zinc-900/60" : "bg-zinc-900/60 border-zinc-800 hover:bg-zinc-800/80",
            isTarget && "ring-2 ring-blue-500 bg-blue-500/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
          )}
        >
          <div className="flex justify-between items-center gap-4 mb-1.5 h-5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-zinc-200">{c.author.display_name}</span>
              <span suppressHydrationWarning className="text-[10px] text-zinc-500 font-medium whitespace-nowrap">
                {getRelativeTime(c.created_at)}
              </span>
              
              {/* ✅ 顯示 (已編輯) */}
              {isEdited && (
                <span className="text-[9px] text-zinc-600 italic -ml-1 whitespace-nowrap">
                  (已編輯)
                </span>
              )}
            </div>

            {isOwner && (
              <DropdownMenu open={menuOpenId === c.id} onOpenChange={(open) => !open && setMenuOpenId(null)}>
                <DropdownMenuTrigger asChild>
                  <span className="w-0 h-0 opacity-0 overflow-hidden" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300 z-50">
                  <DropdownMenuItem onClick={() => { setEditingId(c.id); setEditContent(c.content); }} className="cursor-pointer text-xs">
                    <Pencil className="mr-2 h-3 w-3" /> 編輯
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCommentDelete(c.id)} className="cursor-pointer text-xs text-red-400">
                    <Trash2 className="mr-2 h-3 w-3" /> 刪除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {editingId === c.id ? (
            <div className="w-full" onClick={(e) => e.stopPropagation()}>
              <textarea 
                value={editContent} 
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-md p-2 text-sm text-white focus:border-blue-500 outline-none resize-none min-h-[60px]"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-6 text-xs text-zinc-500">取消</Button>
                <Button size="sm" onClick={() => handleCommentUpdate(c.id, editContent)} className="h-6 text-xs bg-blue-600 text-white">儲存</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-end gap-2">
               <div className="flex-1 min-w-0">
                  <div className="inline">
                    <span className="inline-flex items-center justify-center mr-2 h-5 px-1.5 text-[10px] font-mono text-blue-400 bg-blue-500/10 rounded border border-blue-500/20 align-middle" style={{ transform: "translateY(-1px)" }}>
                      {formatTime(c.timestamp)}
                    </span>
                    <ParsedCommentContent content={c.content} />
                  </div>
               </div>
               
               {!isReply && (c.replyCount ?? 0) > 0 && (
                 <div className="shrink-0 flex items-center ml-1 h-5 self-end opacity-70">
                    <MessageSquare size={12} className="text-zinc-500 mr-1" />
                    <span className="text-[10px] font-bold text-zinc-500 tabular-nums">{c.replyCount}</span>
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col h-full bg-zinc-950/20 min-h-0", className)}>
      <div className="flex items-center justify-between p-4 shrink-0 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm z-10">
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">留言反饋</h3>
        <span className="text-[10px] text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">{isLoading ? "-" : localComments.length}</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-zinc-800">
        {isLoading ? (
          <div className="space-y-4 animate-pulse px-1">
             {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-zinc-900/50 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-1 pb-24">
            {threadedComments.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-zinc-700 space-y-2 opacity-50"><p className="text-xs italic tracking-widest uppercase">No Feedback Yet</p></div>
            ) : (
              threadedComments.map((root, index) => {
                const isLast = index === threadedComments.length - 1;
                const isExpanded = activeThreadId === root.id;
                return (
                  <div key={root.id} ref={isLast ? lastElementRef : null} className="space-y-1">
                    <CommentItem c={root} />
                    {isExpanded && root.replies.length > 0 && (
                      <div className="relative mt-1 mb-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="absolute left-[26px] top-0 bottom-4 w-[2px] bg-zinc-800/40 rounded-full" />
                        {root.replies.map(reply => <CommentItem key={reply.id} c={reply} rootId={root.id} />)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            {isLoadingMore && <div className="py-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-600" /></div>}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 bg-zinc-950 border-t border-zinc-800 px-3 py-2 sticky bottom-0 z-20 shadow-[0_-12px_24px_rgba(0,0,0,0.5)]">
        {replyTarget && (
          <div className="bg-blue-600/10 border-l-2 border-blue-600 pl-3 pr-2 py-2 mb-3 rounded-r animate-in slide-in-from-bottom-2 duration-300 flex items-center gap-3">
             <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden text-sm">
                <Reply size={14} className="text-blue-500 shrink-0" />
                <span className="text-blue-400 font-bold shrink-0">回覆 {replyTarget.name}</span>
                <span className="text-zinc-500 font-mono text-xs shrink-0">[{formatTime(replyTarget.timestamp)}]</span>
                <span className="text-zinc-400 truncate opacity-90 block flex-1">：{replyTarget.content}</span>
             </div>
             <button onClick={() => setReplyTarget(null)} className="text-zinc-500 hover:text-white transition-colors shrink-0 p-1"><X size={16} /></button>
          </div>
        )}
        
        <CommentInput 
          projectId={projectId} 
          assetId={assetId} 
          currentTime={currentTime} 
          parentId={replyTarget?.rootId} 
          onCommentSuccess={handleSelfCommentSuccess} 
          initialValue={replyTarget ? `@${replyTarget.name} ` : ""}
        />
      </div>
    </div>
  );
}