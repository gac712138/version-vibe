"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react"; 
import { CommentWithUser } from "../types";
import { useComments, useCommentRealtime } from "../hooks";
import { CommentInput } from "@/app/project/[id]/CommentInput"; 
import { Pencil, Trash2, Loader2, MessageSquare, X, Reply } from "lucide-react";
import { cn } from "@/lib/utils"; 
import { useSearchParams } from "next/navigation"; 

import { MemoizedCommentItem as CommentItem } from "./CommentItem";
import { formatMMSS } from "@/lib/utils/time";
import { handleRealtimeInsert, handleRealtimeUpdate } from '../hooks/useComments';


interface TrackCommentsProps {
  projectId: string;
  assetId: string;
  currentTime: number;
  currentUserId: string | null;
  currentUserDisplayName: string;
  currentUserAvatarUrl: string | null;
  onSeek: (time: number) => void;
  className?: string;
  onCommentChange?: (assetId: string, delta: number) => void;
}

export function TrackComments({
  projectId,
  assetId,
  currentTime,
  currentUserId,
  currentUserDisplayName,
  currentUserAvatarUrl,
  onSeek,
  className,
  onCommentChange,
}: TrackCommentsProps) {
  const searchParams = useSearchParams();

  // Fetch comments and manage CRUD operations via hook
  const {
    comments: localComments,
    isLoading,
    isLoadingMore,
    hasMore,
    fetchComments,
    loadMore,
    addComment,
    updateCommentContent,
    removeComment,
    setComments,
  } = useComments({
    assetId,
    projectId,
    onCommentChange,
    currentUserId: currentUserId || "",
    currentUserDisplayName,
    currentUserAvatarUrl,
  });

  // UI state only
  const hasScrolledToComment = useRef(false);

  const [editTarget, setEditTarget] = useState<{ id: string; content: string; } | null>(null);
  const [replyTarget, setReplyTarget] = useState<{ 
    id: string; name: string; rootId: string; content: string; timestamp: number; 
  } | null>(null);
  
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Initialize comments on mount
  useEffect(() => {
    fetchComments();
  }, [assetId, projectId, fetchComments]);

  // Setup realtime subscriptions
  // 用 useCallback 包裹所有 callback，確保 reference 穩定
  const handleRealtimeAdded = useCallback(
    (comment: CommentWithUser) => {
      handleRealtimeInsert({ new: comment }, setComments, currentUserId || '', currentUserDisplayName, currentUserAvatarUrl);
    },
    [setComments, currentUserId, currentUserDisplayName, currentUserAvatarUrl]
  );
  const handleRealtimeUpdated = useCallback(
    (comment: CommentWithUser) => {
      handleRealtimeUpdate({ new: comment }, setComments);
    },
    [setComments]
  );
  const handleRealtimeDeleted = useCallback(
    (id: string) => {
      setComments((prev) => prev.filter((c) => c.id !== id));
    },
    [setComments]
  );
  // onCommentChange 已由父層決定是否 useCallback 包裹

  useCommentRealtime({
    assetId,
    comments: localComments,
    onCommentAdded: handleRealtimeAdded,
    onCommentUpdated: handleRealtimeUpdated,
    onCommentDeleted: handleRealtimeDeleted,
    onCommentChange,
  });

  // Auto scroll to highlighted comment
  useEffect(() => {
    const targetCommentId = searchParams.get("commentId");
    if (!targetCommentId || localComments.length === 0 || hasScrolledToComment.current) return;

    const targetComment = localComments.find((c) => c.id === targetCommentId);
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

  // Handlers for UI interactions
  const handleReply = useCallback((comment: CommentWithUser, rootId: string) => {
    setActiveThreadId(rootId);
    setReplyTarget({
      id: comment.id,
      name: comment.author.display_name,
      rootId: rootId,
      content: comment.content,
      timestamp: comment.timestamp,
    });
    setEditTarget(null);
    // Focus input (handled in CommentInput via prop or ref)
  }, []);

  // Thread expand/collapse toggle
  const handleThreadToggle = useCallback((threadId: string) => {
    setExpandedThreads(prev => ({ ...prev, [threadId]: !prev[threadId] }));
    setActiveThreadId(threadId);
  }, []);

  const handleEdit = useCallback((comment: CommentWithUser) => {
    setEditTarget({ id: comment.id, content: comment.content });
    setReplyTarget(null);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      removeComment(id);
    },
    [removeComment]
  );

  const scrollToBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 200);
  };

  const handleSelfCommentSuccess = async (isEdit: boolean = false) => {
    setReplyTarget(null);
    setEditTarget(null);
    if (!isEdit) {
      scrollToBottom();
    }
  };

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (isLoading || isLoadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, isLoadingMore, hasMore, loadMore]);

  // ensure comments are deduped before threading
  const uniqueComments = useMemo(() => {
    const map = new Map<string, CommentWithUser>();
    localComments.forEach(c => map.set(c.id, c));
    return Array.from(map.values());
  }, [localComments]);

  const threadedComments = useMemo(() => {
    const roots = uniqueComments.filter(c => !c.parent_id);
    const replies = uniqueComments.filter(c => c.parent_id);
    return roots.map(root => ({
      ...root,
      replyCount: replies.filter(r => r.parent_id === root.id).length,
      replies: replies.filter(r => r.parent_id === root.id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    }));
  }, [uniqueComments]);
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
                // isExpanded 只是一種視覺狀態，為了避免重新渲染，可以考慮不使用狀態，但這裡為了動畫保留
                // 這裡傳入 activeThreadId 讓 CommentItem 決定樣式，而不是在這裡條件渲染
                return (
                  <div key={root.id} ref={isLast ? lastElementRef : null} className="space-y-1">
                    <CommentItem 
                      c={root}
                      currentUserId={currentUserId}
                      activeThreadId={activeThreadId}
                      editingId={editTarget?.id || null}
                      menuOpenId={menuOpenId}
                      onSeek={onSeek}
                      onReply={handleReply}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      setMenuOpenId={setMenuOpenId}
                    />
                    {/* Thread expand/collapse toggle */}
                    {root.replies.length > 0 && (
                      <button
                        className="flex items-center gap-1 text-xs text-blue-400 mt-1 mb-2 ml-12 hover:underline focus:outline-none"
                        onClick={() => handleThreadToggle(root.id)}
                      >
                        <MessageSquare size={14} />
                        {expandedThreads[root.id] ? '收合回覆' : `展開回覆 (${root.replies.length})`}
                      </button>
                    )}
                    {expandedThreads[root.id] && root.replies.length > 0 && (
                      <div className="relative mt-1 mb-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="absolute left-[26px] top-0 bottom-4 w-[2px] bg-zinc-800/40 rounded-full" />
                        {root.replies.map(reply => (
                          <CommentItem 
                            key={reply.id} 
                            c={reply} 
                            rootId={root.id}
                            currentUserId={currentUserId}
                            activeThreadId={activeThreadId}
                            editingId={editTarget?.id || null}
                            menuOpenId={menuOpenId}
                            onSeek={onSeek}
                            onReply={handleReply}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            setMenuOpenId={setMenuOpenId}
                          />
                        ))}
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
        
        {replyTarget && !editTarget && (
          <div className="bg-blue-600/10 border-l-2 border-blue-600 pl-3 pr-2 py-2 mb-3 rounded-r animate-in slide-in-from-bottom-2 duration-300 flex items-center gap-3">
             <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden text-sm">
                <Reply size={14} className="text-blue-500 shrink-0" />
                <span className="text-blue-400 font-bold shrink-0">回覆 {replyTarget.name}</span>
                <span className="text-zinc-500 font-mono text-xs shrink-0">[{formatMMSS(replyTarget.timestamp)}]</span>
                <span className="text-zinc-400 truncate opacity-90 block flex-1">：{replyTarget.content}</span>
             </div>
             <button onClick={() => setReplyTarget(null)} className="text-zinc-500 hover:text-white transition-colors shrink-0 p-1"><X size={16} /></button>
          </div>
        )}

        {editTarget && (
          <div className="bg-yellow-600/10 border-l-2 border-yellow-600 pl-3 pr-2 py-2 mb-3 rounded-r animate-in slide-in-from-bottom-2 duration-300 flex items-center gap-3">
             <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden text-sm">
                <Pencil size={14} className="text-yellow-500 shrink-0" />
                <span className="text-yellow-500 font-bold shrink-0">正在編輯訊息</span>
             </div>
             <button onClick={() => setEditTarget(null)} className="text-zinc-500 hover:text-white transition-colors shrink-0 p-1"><X size={16} /></button>
          </div>
        )}
        
        <CommentInput 
          projectId={projectId} 
          assetId={assetId} 
          currentTime={currentTime} 
          parentId={replyTarget?.rootId} 
          onCommentSuccess={handleSelfCommentSuccess} 
          initialValue={editTarget ? editTarget.content : (replyTarget ? `@${replyTarget.name} ` : "")}
          editingCommentId={editTarget?.id}
        />
      </div>
    </div>
  );
}