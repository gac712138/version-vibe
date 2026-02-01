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
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils"; // 確保你有這個 utility，或是直接用字串拼接

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  // 1. 初始化讀取
  const fetchList = async () => {
    const data = await getNotifications();
    setNotifications(data);
    setUnreadCount(data.filter((n) => !n.is_read).length);
  };

  useEffect(() => {
    fetchList();
    
    // 選用：每 30 秒輪詢一次新通知 (簡單版 Realtime)
    const interval = setInterval(fetchList, 30000);
    return () => clearInterval(interval);
  }, []);

  // 2. 點擊通知的行為
  const handleItemClick = async (notification: NotificationItem) => {
    // 先標記為已讀
    if (!notification.is_read) {
      await markAsRead(notification.id);
      // 前端樂觀更新
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // 跳轉到對應專案
    // 假設路徑是 /project/[id]/track/[trackId]，這裡先跳到專案首頁，或是你有存 track_id
    router.push(`/project/${notification.project_id}`);
    setIsOpen(false);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-zinc-400 hover:text-white">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-black" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 bg-zinc-900 border-zinc-800 text-zinc-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <h4 className="font-semibold text-sm">通知中心</h4>
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllRead}
              className="text-[10px] text-blue-400 hover:text-blue-300"
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
                  !item.is_read ? "bg-zinc-900/50 border-l-2 border-l-blue-500" : "opacity-60"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-xs text-zinc-300">
                    {item.sender?.email?.split('@')[0] || '有人'}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2">
                  <span className="text-blue-400 mr-1">
                    {item.type === 'mention' ? '@提及了你' : '留言回應'}:
                  </span>
                  {item.content_preview}
                </p>
                <div className="mt-1 text-[10px] text-zinc-600">
                  專案: {item.project?.name || '未知專案'}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}