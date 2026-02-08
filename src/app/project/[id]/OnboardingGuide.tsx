"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { updateMemberNickname } from "@/app/actions/project-members";
import { toast } from "sonner";

interface OnboardingGuideProps {
  projectId: string;
  isNewMember: boolean;
  defaultName?: string;
}

export function OnboardingGuide({ projectId, isNewMember, defaultName = "" }: OnboardingGuideProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(isNewMember);
  const [nickname, setNickname] = useState(defaultName);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) return;
    
    setLoading(true);
    try {
      await updateMemberNickname(projectId, trimmed);
      toast.success("成員名稱已更新！");
      setIsOpen(false);
      router.refresh(); // 🔄 同步專案頁面數據
    } catch (error: any) {
      toast.error(error.message || "更新失敗，請聯繫管理員");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // ✅ 防止新成員透過點擊外部或按 ESC 關閉視窗
      if (isNewMember) return;
      setIsOpen(open);
    }}>
      <DialogContent 
        className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md"
        onInteractOutside={(e) => isNewMember && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">設定您的成員名稱 👋</DialogTitle>
          <DialogDescription className="text-zinc-400">
            請輸入您在這個專案中顯示的名稱。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nickname" className="text-zinc-300 text-xs uppercase tracking-widest">
              您的專案暱稱
            </Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading && nickname.trim()) {
                  handleSubmit(); // 支援 Enter 鍵提交
                }
              }}
              placeholder="例如：Andrew (Guitarist)"
              className="bg-zinc-900 border-zinc-800 text-white focus:border-blue-600 h-12"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !nickname.trim() || nickname === defaultName}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-11"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            儲存並進入專案
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}