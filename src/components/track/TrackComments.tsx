"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react"; 
import { type CommentWithUser, deleteComment, updateComment } from "@/app/actions/comments";
import { CommentInput } from "@/app/project/[id]/CommentInput";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash2, Loader2, MessageSquare, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils"; 
import { createClient } from "@/utils/supabase/client"; 
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
  projectId, assetId, currentTime, canEdit, comments: initialComments, totalCount, isLoading, isLoadingMore, currentUserId, onSeek, onRefresh, onLoadMore, hasMore, className 
}: TrackCommentsProps) {
  const supabase = createClient();
  
  const [localComments, setLocalComments] = useState<CommentWithUser[]>(initialComments);
  
  useEffect(() => {
    setLocalComments(initialComments);
  }, [initialComments]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [replyTarget, setReplyTarget] = useState<{ 
    id: string; name: string; rootId: string; content: string; timestamp: number; 
  } | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 200);
  };

  // 1. 自己新增留言 (Optimistic + Fetch)
  const handleSelfCommentSuccess = async () => {
    setReplyTarget(null);
    await new Promise(resolve => setTimeout(resolve, 500)); // 緩衝

    const { data: myNewComment, error } = await supabase
      .from('comments')
      .select(`
        *,
        author:profiles (
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('asset_id', assetId)
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (myNewComment) {
      setLocalComments(prev => {
        if (prev.some(c => c.id === myNewComment.id)) return prev;
        // @ts-ignore
        return [...prev, myNewComment as CommentWithUser];
      });
      scrollToBottom();
    }
  };

  // ✅ 2. Realtime 監聽 (分拆策略)
  useEffect(() => {
    if (!assetId) return;

    const channel = supabase
      .channel(`comments:${assetId}`)
      
      // 👉 監聽 INSERT (只聽目前 Asset)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `asset_id=eq.${assetId}` }, async (payload) => {
          const newId = payload.new.id;
          
          // 檢查本地是否已有 (避免跟自己剛發的重複)
          setLocalComments(prev => {
            if (prev.some(c => c.id === newId)) return prev;
            
            // 補抓 Author 資料
            (async () => {
               const { data: fullComment } = await supabase
                .from('comments')
                .select(`*, author:profiles(id, display_name, avatar_url)`)
                .eq('id', newId)
                .single();
               
               if (fullComment) {
                 setLocalComments(current => {
                   if (current.some(c => c.id === fullComment.id)) return current;
                   // @ts-ignore
                   return [...current, fullComment as CommentWithUser];
                 });
               }
            })();
            return prev;
          });
      })

      // 👉 監聽 UPDATE (只聽目前 Asset)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'comments', filter: `asset_id=eq.${assetId}` }, (payload) => {
          setLocalComments(prev => prev.map(c => 
            c.id === payload.new.id 
              ? { 
                  ...c, 
                  content: payload.new.content, 
                  updated_at: payload.new.updated_at 
                  // 保留原本 author, 因為 UPDATE payload 沒有 join 資料
                } 
              : c
          ));
      })

      // 👉 監聽 DELETE (❌ 不加 Filter，監聽全表，然後在前端過濾)
      // 這是因為 DELETE payload 預設不包含 asset_id，會被 filter 擋掉
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments' }, (payload) => {
          const deletedId = payload.old.id;
          setLocalComments(prev => {
            // 如果這個 ID 存在於我們的列表，才執行刪除
            const exists = prev.some(c => c.id === deletedId);
            if (exists) {
              return prev.filter(c => c.id !== deletedId);
            }
            return prev;
          });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [assetId, supabase]);

  // Observer & Thread Logic ...
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

  const handleParentIconClick = (comment: CommentWithUser) => {
    if (activeThreadId === comment.id) {
      setActiveThreadId(null);
      setReplyTarget(null);
    } else {
      setActiveThreadId(comment.id);
      setReplyTarget({
        id: comment.id,
        name: comment.author.display_name,
        rootId: comment.id,
        content: comment.content,
        timestamp: comment.timestamp
      });
    }
  };

  const handleChildIconClick = (child: CommentWithUser, rootId: string) => {
    setActiveThreadId(rootId); 
    setReplyTarget({
      id: child.id,
      name: child.author.display_name,
      rootId: rootId,
      content: child.content,
      timestamp: child.timestamp
    });
  };

  // 3. 刪除操作 (Optimistic Update)
  const handleCommentDelete = async (id: string) => {
    if (!confirm("確定要刪除這條留言嗎？")) return;
    
    // 先更新畫面
    setLocalComments(prev => prev.filter(c => c.id !== id));
    
    try {
      await deleteComment(id);
      toast.success("留言已刪除");
    } catch (error) { 
      toast.error("刪除失敗");
    }
  };

  // 4. 編輯操作 (Optimistic Update)
  const handleCommentUpdate = async (id: string, content: string) => {
    if (!content.trim()) return;

    // 先更新畫面
    setLocalComments(prev => prev.map(c => 
      c.id === id ? { ...c, content: content } : c
    ));
    setEditingId(null);

    try {
      await updateComment(id, content);
      toast.success("留言已更新");
    } catch (error) {
      toast.error("更新失敗");
    }
  };

  const formatTime = (sec: number) => new Date(sec * 1000).toISOString().substr(14, 5);

  const ParsedCommentContent = ({ content }: { content: string }) => {
    const parts = content.split(/(@\S+)/g);
    return (
      <span className="text-sm text-zinc-300 leading-relaxed break-words whitespace-pre-wrap">
        {parts.map((part, i) => 
          part.startsWith("@") ? (
            <span key={i} className="text-blue-400 font-bold">{part}</span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const renderCommentItem = (c: CommentWithUser, rootId?: string) => {
    const isReply = !!rootId;
    const isOwner = currentUserId === c.user_id;
    const isActiveThread = !isReply && activeThreadId === c.id; 

    return (
      <div key={c.id} className={cn("flex gap-3 mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300", isReply && "ml-12")}>
        <Avatar className="w-9 h-9 border border-zinc-800 shrink-0 overflow-hidden rounded-full mt-1">
          <AvatarImage src={c.author.avatar_url || undefined} className="object-cover" />
          <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs flex items-center justify-center">
            {c.author.display_name?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className={cn(
          "flex flex-col p-3 rounded-2xl w-fit min-w-[180px] max-w-[85%] md:max-w-[70%] border shadow-sm relative group transition-colors",
          editingId === c.id 
            ? "bg-zinc-800/80 border-blue-500/50" 
            : (isActiveThread || isReply) ? "bg-zinc-900/40 border-zinc-800/50" : "bg-zinc-900/60 border-zinc-800"
        )}>
          <div className="flex justify-between items-center gap-4 mb-1.5 h-5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-zinc-200">{c.author.display_name}</span>
              <span suppressHydrationWarning className="text-[10px] text-zinc-500 font-medium whitespace-nowrap">
                {getRelativeTime(c.created_at)}
              </span>
            </div>
            {isOwner && editingId !== c.id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5 -mr-1 text-zinc-600 hover:text-white shrink-0">
                    <MoreHorizontal size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                  <DropdownMenuItem onClick={() => { setEditingId(c.id); setEditContent(c.content); }} className="cursor-pointer text-xs"><Pencil className="mr-2 h-3 w-3" /> 編輯</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCommentDelete(c.id)} className="cursor-pointer text-xs text-red-400"><Trash2 className="mr-2 h-3 w-3" /> 刪除</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {editingId === c.id ? (
            <div className="w-full">
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
                    <button onClick={() => onSeek(c.timestamp)} className="inline-flex items-center justify-center mr-2 h-5 px-1.5 text-[10px] font-mono text-blue-400 bg-blue-500/10 rounded border border-blue-500/20 hover:bg-blue-500/20 transition-colors align-middle cursor-pointer" style={{ transform: "translateY(-1px)" }}>
                      {formatTime(c.timestamp)}
                    </button>
                    <ParsedCommentContent content={c.content} />
                  </div>
               </div>
               <div className="shrink-0 flex items-center ml-1 h-5 self-end opacity-70 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "h-6 w-6 rounded-full",
                      (isActiveThread || replyTarget?.id === c.id) ? "text-blue-500" : "text-zinc-500 hover:text-blue-400"
                    )}
                    onClick={() => isReply ? handleChildIconClick(c, rootId!) : handleParentIconClick(c)}
                  >
                    <MessageSquare size={14} />
                  </Button>
                  {!isReply && (c.replyCount ?? 0) > 0 && (
                    <span className="text-[10px] font-bold text-zinc-500 tabular-nums ml-1">{c.replyCount}</span>
                  )}
               </div>
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
                    {renderCommentItem(root)}
                    {isExpanded && root.replies.length > 0 && (
                      <div className="relative mt-1 mb-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="absolute left-[26px] top-0 bottom-4 w-[2px] bg-zinc-800/40 rounded-full" />
                        {root.replies.map(reply => renderCommentItem(reply, root.id))}
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

      <div className="shrink-0 bg-zinc-950 border-t border-zinc-800 p-4 sticky bottom-0 z-20 shadow-[0_-12px_24px_rgba(0,0,0,0.5)]">
        {replyTarget && (
          <div className="bg-blue-600/10 border-l-2 border-blue-600 pl-3 pr-2 py-2 mb-3 rounded-r animate-in slide-in-from-bottom-2 duration-300 flex items-center gap-3">
             <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden text-sm">
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