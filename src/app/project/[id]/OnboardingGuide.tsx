"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { updateMemberProfile } from "@/app/actions/project-members"; // 稍後建立

export function OnboardingGuide({ member, user }: { member: any, user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 如果成員還沒有設定過 display_name，就開啟導引視窗
    if (member && !member.display_name) {
      setDisplayName(user?.user_metadata?.full_name || "");
      setIsOpen(true);
    }
  }, [member, user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateMemberProfile(member.id, {
        display_name: displayName,
        avatar_url: user?.user_metadata?.avatar_url,
      });
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px] bg-[#12141c] border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">歡迎加入專案！</DialogTitle>
          <DialogDescription className="text-zinc-400">
            在開始協作之前，請確認你在專案中顯示的名稱。
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-6 py-4">
          <Avatar className="w-20 h-20 border-2 border-blue-500">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback>{displayName?.[0]}</AvatarFallback>
          </Avatar>
          
          <div className="w-full space-y-2">
            <label className="text-sm text-zinc-500">顯示名稱 (其他成員會看到這個名稱)</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-zinc-900 border-zinc-700 text-white"
              placeholder="例如：吉他手 小明"
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleSave} 
            disabled={loading || !displayName}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading ? "儲存中..." : "進入專案開始協作"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}