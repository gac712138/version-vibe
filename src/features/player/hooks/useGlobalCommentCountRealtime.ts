import { useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';

/**
 * 全域監聽 comments 表的 INSERT/DELETE，跨 asset 實時同步留言數
 * @param onCommentChange (assetId: string, delta: number) => void
 */
export function useGlobalCommentCountRealtime(onCommentChange: (assetId: string, delta: number) => void) {
  const supabase = useRef(createClient());

  useEffect(() => {
    // 建立全域 channel，監聽所有 comments 事件
    const channel = supabase.current
      .channel('global_comments_count')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
      }, (payload) => {
        const assetId = payload.new?.asset_id;
        if (assetId) {
          onCommentChange(assetId, +1);
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'comments',
      }, (payload) => {
        const assetId = payload.old?.asset_id;
        if (assetId) {
          onCommentChange(assetId, -1);
        }
      })
      .subscribe((status, err) => {
        if (err) console.error('[GlobalCommentCountRealtime] Subscription error:', err.message);
        if (status === 'SUBSCRIBED') {
          console.log('[GlobalCommentCountRealtime] SUBSCRIBED');
        }
      });

    return () => {
      supabase.current.removeChannel(channel);
    };
  }, [onCommentChange]);
}
