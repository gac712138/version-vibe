"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createInviteLink } from "@/app/actions/invitations"; // 你剛寫好的 Action
import { Link2, Copy, Check } from "lucide-react";
import { toast } from "sonner"; // 假設你有用 sonner 或 toast

export function InviteSection({ projectId }: { projectId: string }) {
  const [inviteUrl, setInviteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

const handleGenerate = async () => {
  setLoading(true);
  try {
    const url = await createInviteLink(projectId);
    setInviteUrl(url);
    toast.success("邀請連結已產生");
  } catch (error: any) {
    console.error(error);
    // 這裡使用可選鏈或是檢查 toast 是否存在
    if (typeof toast !== 'undefined') {
      toast.error("產生失敗: " + (error.message || "未知錯誤"));
    }
  } finally {
    setLoading(false);
  }
};

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("已複製連結");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-4">
      <div className="flex items-center gap-2 text-white font-medium">
        <Link2 className="w-4 h-4 text-blue-500" />
        <h3>邀請成員協作</h3>
      </div>
      
      {!inviteUrl ? (
        <Button 
          onClick={handleGenerate} 
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {loading ? "產生中..." : "產生邀請連結"}
        </Button>
      ) : (
        <div className="flex gap-2">
  <Input 
    readOnly 
    value={inviteUrl} 
    className="bg-black border-zinc-700 text-zinc-300 text-xs"
  />
  <Button 
    size="icon" 
    variant="outline" 
    onClick={copyToClipboard}
    className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white" // 確保背景深色，文字白色
  >
    {copied ? (
      <Check className="w-4 h-4 text-green-500" /> 
    ) : (
      <Copy className="w-4 h-4 text-zinc-300" />
    )}
  </Button>
</div>
      )}
      <p className="text-[10px] text-zinc-500 text-center">
        連結有效期限為 7 天，最多可供 10 人使用。
      </p>
    </div>
  );
}