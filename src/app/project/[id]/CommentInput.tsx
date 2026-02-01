"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createComment } from "@/app/actions/comments";
import { Send, Clock, AtSign } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

interface CommentInputProps {
  projectId: string; // 新增：需要專案 ID 來撈取成員
  assetId: string;
  currentTime: number;
  onCommentSuccess: () => void;
}

export function CommentInput({ projectId, assetId, currentTime, onCommentSuccess }: CommentInputProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Mention 相關狀態
  const [members, setMembers] = useState<{ user_id: string, display_name: string }[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. 初始撈取成員清單
  useEffect(() => {
    async function getMembers() {
      const { data } = await supabase
        .from("project_members")
        .select("user_id, display_name")
        .eq("project_id", projectId);
      if (data) setMembers(data);
    }
    if (projectId) getMembers();
  }, [projectId, supabase]);

  // 2. 偵測 @ 符號邏輯
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setContent(value);

    const words = value.split(" ");
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith("@")) {
      setMentionFilter(lastWord.slice(1).toLowerCase());
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  // 3. 選取成員後的處理
  const insertMention = (displayName: string) => {
    const words = content.split(" ");
    words[words.length - 1] = `@${displayName} `;
    setContent(words.join(" "));
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !assetId) return;

    setIsSubmitting(true);
    try {
      await createComment({
        content,
        timestamp: currentTime,
        asset_id: assetId,
      });
      setContent("");
      toast.success("留言已送出");
      onCommentSuccess();
    } catch (error) {
      toast.error("留言失敗");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full">
      {/* 成員標記彈出選單 */}
      {showMentions && (
        <div className="absolute bottom-full mb-2 w-full max-w-[240px] bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2">
          <div className="p-2 border-b border-zinc-800 flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider bg-zinc-950/50">
            <AtSign className="w-3 h-3" /> Mention Member
          </div>
          <div className="max-h-40 overflow-y-auto">
            {members
              .filter(m => m.display_name?.toLowerCase().includes(mentionFilter))
              .map(member => (
                <button
                  key={member.user_id}
                  type="button"
                  onClick={() => insertMention(member.display_name)}
                  className="w-full px-3 py-2 text-left text-xs text-zinc-300 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2 border-b border-zinc-800/50 last:border-0"
                >
                  <div className="w-5 h-5 bg-zinc-800 rounded-full flex items-center justify-center text-[10px] font-bold text-blue-400 group-hover:bg-blue-500 group-hover:text-white">
                    {member.display_name?.[0]}
                  </div>
                  {member.display_name}
                </button>
              ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative group">
        <div className="flex items-center gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-lg focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all shadow-inner">
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 rounded text-blue-400 text-xs font-mono border border-blue-500/20">
            <Clock className="w-3 h-3" />
            {new Date(currentTime * 1000).toISOString().substr(14, 5)}
          </div>
          
          <Input
            ref={inputRef}
            value={content}
            onChange={handleInputChange}
            placeholder="輸入 @ 標記團員想法..."
            className="flex-1 bg-transparent border-none focus-visible:ring-0 text-sm placeholder:text-zinc-600"
          />
          
          <Button 
            type="submit" 
            size="icon" 
            disabled={isSubmitting || !content.trim()}
            className="bg-blue-600 hover:bg-blue-700 h-8 w-8 shrink-0 shadow-lg shadow-blue-900/20 transition-transform active:scale-95"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}