"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { updateMemberNickname } from "@/app/actions/project-members"; // 引用 Server Action
import { toast } from "sonner";

interface OnboardingGuideProps {
  projectId: string;
  isNewMember: boolean;
  defaultName?: string; // ✅ 新增這個 prop
}

export function OnboardingGuide({ projectId, isNewMember, defaultName = "" }: OnboardingGuideProps) {
  const [isOpen, setIsOpen] = useState(isNewMember);
  // ✅ 預設值直接使用傳進來的 defaultName
  const [nickname, setNickname] = useState(defaultName);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!nickname.trim()) return;
    setLoading(true);
    try {
      await updateMemberNickname(projectId, nickname);
      toast.success("歡迎加入！");
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("更新失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl">歡迎來到這個專案！👋</DialogTitle>
          <DialogDescription className="text-zinc-400">
            初次見面，為了讓團隊協作更順暢，請輸入大家該如何稱呼您？
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nickname" className="text-zinc-300">
              您的暱稱 (Display Name)
            </Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="例如：Andrew, 吉他手小王"
              className="bg-zinc-900 border-zinc-700 text-white focus:border-blue-600"
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !nickname.trim()}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            開始協作
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}