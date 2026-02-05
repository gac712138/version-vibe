"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface OnboardingGuideProps {
  projectId: string;
  isNewMember: boolean;
}

export function OnboardingGuide({ projectId, isNewMember }: OnboardingGuideProps) {
  // ✅ 初始狀態先設為 false，避免 Server/Client 判斷時間差造成閃現
  const [isOpen, setIsOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkActualStatus = async () => {
      // 如果 Page.tsx 傳進來是新成員，我們先去資料庫做最後確認
      if (isNewMember) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: member } = await supabase
          .from("project_members")
          .select("display_name")
          .eq("project_id", projectId)
          .eq("user_id", user.id)
          .maybeSingle();

        // ✅ 只有當資料庫回傳真的沒有 display_name 時，才打開視窗
        if (!member?.display_name) {
          setIsOpen(true);
        }
      } else {
        // 如果 Page.tsx 已經判定不是新成員，確保關閉
        setIsOpen(false);
      }
    };

    checkActualStatus();
  }, [isNewMember, projectId, supabase]);

  const handleSubmit = async () => {
    if (!displayName.trim()) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase
        .from("project_members")
        .update({ display_name: displayName })
        .eq("project_id", projectId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("歡迎加入！");
      setIsOpen(false);
      router.refresh(); 
    } catch (error) {
      console.error(error);
      toast.error("設定失敗，請稍後再試");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent 
        className="sm:max-w-[425px] bg-zinc-900 border-zinc-800 text-white" 
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>歡迎來到這個專案！👋</DialogTitle>
          <DialogDescription className="text-zinc-400">
            初次見面，為了讓團隊協作更順暢，請輸入大家該如何稱呼您？
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-zinc-300">
              您的暱稱 (Display Name)
            </Label>
            <Input
              id="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="例如：Andrew, 吉他手小王"
              className="bg-zinc-800 border-zinc-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !displayName.trim()}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium"
          >
            {isSubmitting ? "儲存中..." : "開始協作"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}