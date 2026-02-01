"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getNotifications, markAsRead, markAllAsRead, type NotificationItem } from "@/app/actions/notifications";
import { createClient } from "@/utils/supabase/client"; 
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // 1. 初始化讀取
  const fetchList = async () => {
    const data = await getNotifications();
    setNotifications(data);
    setUnreadCount(data.filter((n) => !n.is_read).length);
  };

  useEffect(() => {
    fetchList();

    // 2. 設定 Realtime 監聽
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        async () => {
           await fetchList();
           toast.info("收到新通知！");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 3. 點擊通知的行為
  const handleItemClick = async (notification: NotificationItem) => {
    // 🔍 Debug: 確保點擊時有拿到資料
    console.log("🔔 Clicked Notification:", {
      track_id: notification.track_id,
      asset_id: notification.asset_id,
      comment_id: notification.comment_id
    });

    // 標記已讀
    if (!notification.is_read) {
      await markAsRead(notification.id);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setIsOpen(false);

    // ✅ 修正路由邏輯：
    
    // 1. 設定基礎路徑 (預設是專案首頁)
    let targetPath = `/project/${notification.project_id}`;

    // 2. 如果有 track_id，則進入音軌內頁
    if (notification.track_id) {
      targetPath += `/track/${notification.track_id}`;
    }

    // 3. 設定 URL 參數 (版本與留言ID)
    const params = new URLSearchParams();
    
    // 後端 asset_id -> 前端 versionId
    if (notification.asset_id) { 
      params.set("versionId", notification.asset_id);
    }
    
    if (notification.comment_id) {
      params.set("commentId", notification.comment_id);
    }

    // 4. 組合最終網址並跳轉
    const finalUrl = `${targetPath}?${params.toString()}`;
    console.log("🚀 Jumping to:", finalUrl);
    router.push(finalUrl);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-zinc-400 hover:text-white transition-all">
          <Bell className={cn("h-5 w-5", unreadCount > 0 && "text-white")} />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-black animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 bg-zinc-900 border-zinc-800 text-zinc-200 shadow-xl z-50">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
          <h4 className="font-semibold text-sm">通知中心</h4>
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllRead}
              className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
            >
              全部已讀
            </button>
          )}
        </div>
        
        <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs">
              暫無新通知
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={cn(
                  "px-4 py-3 border-b border-zinc-800/50 cursor-pointer transition-colors hover:bg-zinc-800",
                  !item.is_read ? "bg-zinc-800/40 border-l-2 border-l-blue-500" : "opacity-60"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-xs text-zinc-300">
                    {item.sender?.display_name || '夥伴'}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2">
                  <span className="text-blue-400 mr-1">
                    {item.type === 'mention' ? '@提及了你' : '回應'}:
                  </span>
                  {item.content_preview}
                </p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}