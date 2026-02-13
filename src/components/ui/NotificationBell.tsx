"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getNotifications, markAsRead, markAllAsRead, type NotificationItem } from "@/app/actions/notifications";
import { createClient } from "@/utils/supabase/client"; 
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";

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

    // 2. 設定 Realtime 監聽 (修正版：使用專屬頻道 + 過濾器)
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log(`🔌 [Notification] Subscribing for user: ${user.id}`);

      // 使用 user.id 作為頻道名稱，避免多帳號/多視窗衝突
      const channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `receiver_id=eq.${user.id}`, // ✅ 只監聽發給自己的
          },
          async (payload) => {
             console.log("🔔 [Notification] New notification received!", payload);
             await fetchList();
             toast.info("收到新通知！");
          }
        )
        .subscribe();

      return () => {
        console.log(`🔌 [Notification] Unsubscribing...`);
        supabase.removeChannel(channel);
      };
    };

    let cleanup: (() => void) | undefined;
    setupRealtime().then(c => { cleanup = c; });

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // 3. 點擊通知的行為 (已修正跳轉邏輯)
  const handleItemClick = async (notification: NotificationItem) => {
    // 標記已讀
    if (!notification.is_read) {
      await markAsRead(notification.id);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setIsOpen(false);

    // 路由邏輯
    let targetPath = `/project/${notification.project_id}`;

    // 如果是舊版路由結構可能會用到 track_id，這裡保留
    if (notification.track_id) {
      targetPath += `/track/${notification.track_id}`;
    }

    const params = new URLSearchParams();
    
    // ✅ 修正 1: 參數名稱改為 assetId (對應 TrackPlayer 的監聽)
    if (notification.asset_id) { 
      params.set("assetId", notification.asset_id);
    }

    // ✅ 修正 2: 加入時間參數 t
    // @ts-ignore: 忽略型別檢查，確保您後端有 select comment:comments(timestamp)
    const timestamp = notification.comment?.timestamp;
    
    // 只有當 timestamp 存在且大於 0 時才帶入參數
    if (timestamp !== undefined && timestamp !== null) {
      params.set("t", timestamp.toString());
    }

    // 帶上 commentId 讓前端可以做高亮或其他處理
    if (notification.comment_id) {
      params.set("commentId", notification.comment_id);
    }

    const finalUrl = `${targetPath}?${params.toString()}`;
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
            <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-black animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent align="end" className="w-80 p-0 bg-zinc-950 border-zinc-800 text-zinc-200 shadow-xl z-50">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
          <h4 className="font-semibold text-sm">通知中心</h4>
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllRead}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              全部已讀
            </button>
          )}
        </div>
        
        {/* List */}
        <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
              <Bell className="w-8 h-8 opacity-20" />
              <span>暫無新通知</span>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={cn(
                  "px-4 py-3 border-b border-zinc-800/50 cursor-pointer transition-colors hover:bg-zinc-900",
                  !item.is_read ? "bg-blue-500/10" : "opacity-80"
                )}
              >
                {/* 🔥 臉書風格佈局：左頭像，右內容 */}
                <div className="flex items-start gap-3">
                  
                  {/* 左側：大頭貼 */}
                  <Avatar className="w-10 h-10 border border-zinc-800 shrink-0 mt-1">
                    <AvatarImage src={item.sender?.avatar_url || ""} className="object-cover" />
                    <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs font-bold">
                      {item.sender?.display_name?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>

                  {/* 右側：文字內容 */}
                  <div className="flex flex-col gap-1 w-full min-w-0">
                    <div className="text-sm leading-snug">
                      <span className="font-bold text-zinc-100 mr-1.5">
                        {item.sender?.display_name || '未知成員'}
                      </span>
                      <span className="text-zinc-400">
                        {item.type === 'mention' && "提及了你"}
                        {item.type === 'reply' && "回覆了你的留言"}
                        {item.type === 'system' && "系統通知"}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-500 truncate">
                      {item.content_preview}
                    </p>

                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-[10px] text-zinc-600">
                         {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: zhTW })}
                       </span>
                       {!item.is_read && (
                         <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                       )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}