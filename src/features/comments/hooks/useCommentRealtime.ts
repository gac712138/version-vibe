/**
 * useCommentRealtime Hook
 * Manages Supabase realtime subscriptions for comments
 */

import { useEffect, useRef, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { CommentWithUser } from '../types';

interface UseCommentRealtimeOptions {
  assetId: string;
  comments: CommentWithUser[];
  onCommentAdded: (comment: CommentWithUser) => void;
  onCommentUpdated: (comment: CommentWithUser) => void;
  onCommentDeleted: (id: string) => void;
  onCommentChange?: (assetId: string, delta: number) => void;
}

/**
/**
 * Subscribe to realtime changes for comments
 * Handles INSERT, UPDATE, DELETE events from postgres_changes
 *
 * ⚠️ 注意：為避免頻繁重建 channel，請確保傳入的 callback（onCommentAdded、onCommentUpdated、onCommentDeleted、onCommentChange）
 * 都用 useCallback 包裹，或只依賴 assetId/supabase。
 */
export function useCommentRealtime({
  assetId,
  comments,
  onCommentAdded,
  onCommentUpdated,
  onCommentDeleted,
  onCommentChange,
}: UseCommentRealtimeOptions): void {
  // 強制單一 client 實例
  const supabase = useMemo(() => createClient(), []);
  const commentsRef = useRef<CommentWithUser[]>(comments);

  // Keep ref in sync with comments for realtime handlers
  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);

  useEffect(() => {
    if (!assetId) return;

    // 唯一 channel 名稱
    const channelName = `comments_room_${assetId}`;

    // Create and subscribe to channel
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
        },
        async (payload) => {
          console.log('[Realtime] INSERT', payload);
          console.log('📦 收到原始數據:', payload.new);
          const newId = payload.new.id;
          if (commentsRef.current.some((c) => c.id === newId)) {
            console.log('[Realtime] INSERT skipped (duplicate)', newId);
            return;
          }
          try {
            const { data: fullComment } = await supabase
              .from('comments')
              .select('*, author:profiles(id, display_name, avatar_url)')
              .eq('id', newId)
              .single();
            if (fullComment) {
              const enrichedComment: CommentWithUser = {
                id: fullComment.id,
                content: fullComment.content,
                timestamp: fullComment.timestamp,
                created_at: fullComment.created_at,
                updated_at: fullComment.updated_at,
                user_id: fullComment.user_id,
                parent_id: fullComment.parent_id,
                author: {
                  display_name: fullComment.author?.display_name || 'Unknown',
                  avatar_url: fullComment.author?.avatar_url || null,
                },
              };
              onCommentAdded(enrichedComment);
              onCommentChange?.(assetId, 1);
            }
          } catch (error) {
            console.error('Error fetching new comment:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'comments',
        },
        async (payload) => {
          console.log('[Realtime] UPDATE', payload);
          const updatedId = payload.new.id;
          try {
            const { data: fullComment } = await supabase
              .from('comments')
              .select('*, author:profiles(id, display_name, avatar_url)')
              .eq('id', updatedId)
              .single();
            if (fullComment) {
              const enrichedComment: CommentWithUser = {
                id: fullComment.id,
                content: fullComment.content,
                timestamp: fullComment.timestamp,
                created_at: fullComment.created_at,
                updated_at: fullComment.updated_at,
                user_id: fullComment.user_id,
                parent_id: fullComment.parent_id,
                author: {
                  display_name: fullComment.author?.display_name || 'Unknown',
                  avatar_url: fullComment.author?.avatar_url || null,
                },
              };
              onCommentUpdated(enrichedComment);
            }
          } catch (error) {
            console.error('Error fetching updated comment:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comments',
        },
        (payload) => {
          console.log('[Realtime] DELETE', payload);
          const deletedId = payload.old.id;
          if (commentsRef.current.some((c) => c.id === deletedId)) {
            onCommentDeleted(deletedId);
            onCommentChange?.(assetId, -1);
          }
        }
      )
      .subscribe(async (status, err) => {
        console.log('📡 [Realtime Status]:', status);
        if (err) console.error('❌ [Subscription Error]:', err.message);
        if (status === 'CHANNEL_ERROR') {
          const { data: { session } } = await supabase.auth.getSession();
          console.log('🔑 [Session Check]:', session ? 'Logged in' : 'No Session');
        }
      });

    // Cleanup: unsubscribe on unmount or assetId change
    return () => {
      supabase.removeChannel(channel);
    };
  }, [assetId, supabase]);
}
