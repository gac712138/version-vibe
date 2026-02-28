"use client";

import { useState, useCallback, useRef, useEffect } from 'react'; // 修正：移至最頂部
import {
  getComments,
  createComment,
  updateComment,
  deleteComment,
} from '@/app/actions/comments';
import { CommentWithUser } from '../types';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

const PAGE_SIZE = 10;

// 確保 ID 唯一性的工具函式
function uniqueById(comments: CommentWithUser[]): CommentWithUser[] {
  const map = new Map<string, CommentWithUser>();
  comments.forEach(c => map.set(c.id, c));
  return Array.from(map.values());
}

interface UseCommentsOptions {
  assetId: string;
  projectId: string;
  onCommentChange?: (assetId: string, delta: number) => void;
  currentUserId: string;
  currentUserDisplayName: string;
  currentUserAvatarUrl: string | null;
}

export interface UseCommentsReturn {
  comments: CommentWithUser[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  fetchComments: () => Promise<void>;
  loadMore: () => Promise<void>;
  addComment: (content: string, timestamp: number, parentId?: string) => Promise<void>;
  updateCommentContent: (id: string, content: string) => Promise<void>;
  removeComment: (id: string) => Promise<void>;
  setComments: React.Dispatch<React.SetStateAction<CommentWithUser[]>>;
}

export const useComments = ({
  assetId,
  projectId,
  onCommentChange,
  currentUserId,
  currentUserDisplayName,
  currentUserAvatarUrl,
}: UseCommentsOptions): UseCommentsReturn => {
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  const commentsRef = useRef<CommentWithUser[]>([]);
  commentsRef.current = comments;
  const supabaseRef = useRef(createClient());


  const fetchComments = useCallback(async () => {
    if (!assetId || !projectId) return;
    setIsLoading(true);
    try {
      const result = await getComments(assetId, projectId, 1, PAGE_SIZE);
      setComments((): CommentWithUser[] => uniqueById(result.data));
      setHasMore(result.data.length === PAGE_SIZE);
      setPage(1);
    } catch (err) {
      toast.error('無法載入留言');
    } finally {
      setIsLoading(false);
    }
  }, [assetId, projectId]);

  const loadMore = useCallback(async () => {
    if (!assetId || !projectId || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await getComments(assetId, projectId, nextPage, PAGE_SIZE);
      setComments((prev: CommentWithUser[]): CommentWithUser[] => uniqueById([...prev, ...result.data]));
      setPage(nextPage);
      setHasMore(result.data.length === PAGE_SIZE);
    } finally {
      setIsLoadingMore(false);
    }
  }, [assetId, projectId, page, hasMore, isLoadingMore]);

  const addComment = useCallback(async (content: string, timestamp: number, parentId?: string) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticComment: CommentWithUser = {
      id: tempId,
      content,
      timestamp,
      created_at: new Date().toISOString(),
      updated_at: null,
      user_id: currentUserId,
      parent_id: parentId,
      author: { display_name: currentUserDisplayName, avatar_url: currentUserAvatarUrl }
    };

    setComments((prev: CommentWithUser[]): CommentWithUser[] => {
      if (parentId) {
        const idx = prev.findIndex(c => c.id === parentId);
        return idx !== -1 ? [...prev.slice(0, idx + 1), optimisticComment, ...prev.slice(idx + 1)] : [optimisticComment, ...prev];
      }
      return [optimisticComment, ...prev];
    });

    try {
      await createComment({ content, timestamp, asset_id: assetId, project_id: projectId, parent_id: parentId });
      onCommentChange?.(assetId, 1);
    } catch {
      setComments((prev: CommentWithUser[]): CommentWithUser[] => prev.filter(c => c.id !== tempId));
      toast.error('留言失敗');
    }
  }, [assetId, projectId, currentUserId, currentUserDisplayName, currentUserAvatarUrl, onCommentChange]);

  const updateCommentContent = useCallback(async (id: string, content: string) => {
    const prev = commentsRef.current;
    setComments((c: CommentWithUser[]): CommentWithUser[] => c.map(item => item.id === id ? { ...item, content } : item));
    try {
      await updateComment(id, content);
    } catch {
      setComments(prev);
      toast.error('更新失敗');
    }
  }, []);

  const removeComment = useCallback(async (id: string) => {
    const prev = commentsRef.current;
    setComments((c: CommentWithUser[]): CommentWithUser[] => c.filter(item => item.id !== id));
    try {
      await deleteComment(id);
      onCommentChange?.(assetId, -1);
    } catch {
      setComments(prev);
      toast.error('刪除失敗');
    }
  }, [assetId, onCommentChange]);

  // 重要：補上最後的 Return
  return {
    comments,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    fetchComments,
    loadMore,
    addComment,
    updateCommentContent,
    removeComment,
    setComments,
  };
};

// --- Realtime: 專責處理 INSERT/UPDATE/DELETE ---
// 提供給 useCommentRealtime.ts 呼叫
export function handleRealtimeInsert(
  payload: any,
  setComments: React.Dispatch<React.SetStateAction<CommentWithUser[]>>,
  currentUserId: string,
  currentUserDisplayName: string,
  currentUserAvatarUrl: string | null
) {
  console.log('🚀 [Realtime INSERT]', payload);
  const newComment = payload.new as CommentWithUser;
  if (!newComment.author) {
    console.warn('⚠️ 資料缺失: Realtime 訊號未包含 author 資訊', newComment);
  }
  setComments((prev: CommentWithUser[]): CommentWithUser[] => {
    // 避免重複插入
    if (prev.some(c => c.id === newComment.id)) return prev;
    // 若是自己剛剛樂觀新增的留言，直接用本地 author
    if (newComment.user_id === currentUserId) {
      // 找到本地 optimistic comment
      const optimisticIdx = prev.findIndex(c => c.id.startsWith('temp-') && c.content === newComment.content && c.timestamp === newComment.timestamp);
      if (optimisticIdx !== -1) {
        // 用伺服器 id 替換 temp id，保留 author
        const optimistic = prev[optimisticIdx];
        const merged: CommentWithUser = { ...newComment, author: optimistic.author };
        const updated = [...prev];
        updated[optimisticIdx] = merged;
        return updated;
      }
      // 沒找到就合併 currentUser 資訊
      return [
        {
          ...newComment,
          author: {
            display_name: currentUserDisplayName,
            avatar_url: currentUserAvatarUrl,
          },
        },
        ...prev,
      ];
    }
    // 其他人新增，保證 author 結構存在
    const safeComment: CommentWithUser = {
      ...newComment,
      author: newComment.author || { display_name: 'Unknown', avatar_url: null },
    };
    if (safeComment.parent_id) {
      const parentIdx = prev.findIndex(c => c.id === safeComment.parent_id);
      if (parentIdx !== -1) {
        return [
          ...prev.slice(0, parentIdx + 1),
          safeComment,
          ...prev.slice(parentIdx + 1),
        ];
      }
    }
    return [safeComment, ...prev];
  });
}

export function handleRealtimeUpdate(
  payload: any,
  setComments: React.Dispatch<React.SetStateAction<CommentWithUser[]>>
) {
  console.log('📝 [Realtime UPDATE]', payload);
  const updated = payload.new as CommentWithUser;
  if (!updated.author) {
    console.warn('⚠️ 資料缺失: Realtime 訊號未包含 author 資訊', updated);
  }
  setComments((prev: CommentWithUser[]): CommentWithUser[] =>
    prev.map(c =>
      c.id === updated.id
        ? { ...c, ...updated, author: c.author }
        : c
    )
  );
}