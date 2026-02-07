"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export function InviteSection({ projectId }: { projectId: string }) {
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);

  // ✅ 改動 1: 不需要 handleGenerate 了
  // 直接在組件掛載時，算出邀請連結
  useEffect(() => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      // 指向我們剛剛做好的邀請頁面
      setInviteUrl(`${origin}/invite/${projectId}`);
    }
  }, [projectId]);

  const copyToClipboard = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("已複製邀請連結");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-4">
      <div className="flex items-center gap-2 text-white font-medium">
        <Link2 className="w-4 h-4 text-blue-500" />
        <h3>邀請成員協作</h3>
      </div>
      
      {/* ✅ 改動 2: 直接顯示 Input 與 複製按鈕，不需要 "產生" 按鈕 */}
      <div className="flex gap-2">
        <Input 
          readOnly 
          value={inviteUrl} 
          placeholder="正在載入連結..."
          className="bg-zinc-950 border-zinc-700 text-zinc-300 text-xs font-mono"
        />
        <Button 
          size="icon" 
          variant="outline" 
          onClick={copyToClipboard}
          className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white shrink-0"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" /> 
          ) : (
            <Copy className="w-4 h-4 text-zinc-300" />
          )}
        </Button>
      </div>

      <p className="text-[10px] text-zinc-500 text-center">
        任何擁有此連結的人，通過 Google 登入後即可加入專案。
      </p>
    </div>
  );
}