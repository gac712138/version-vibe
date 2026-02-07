"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createComment } from "@/app/actions/comments";
import { Send, Clock, AtSign } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface CommentInputProps {
  projectId: string;
  assetId: string;
  currentTime: number;
  onCommentSuccess: () => void;
}

// ✅ 修改型別：加入 profiles 關聯資料
type Member = {
  user_id: string;
  display_name: string;
  profiles: {
    avatar_url: string | null;
  } | null;
};

export function CommentInput({ projectId, assetId, currentTime, onCommentSuccess }: CommentInputProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [members, setMembers] = useState<Member[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function getMembers() {
      if (!projectId) return;
      
      // ✅ 這裡也要改成關聯查詢
      const { data } = await supabase
        .from("project_members")
        .select(`
          user_id, 
          display_name,
          profiles:user_id ( avatar_url )
        `) 
        .eq("project_id", projectId);
        
      if (data) {
        setMembers(data as any); // 因為 Supabase 型別推斷可能會有點複雜，先用 any 轉接
      }
    }
    getMembers();
  }, [projectId, supabase]);

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
        project_id: projectId, 
      });

      setContent("");
      toast.success("留言已送出");
      onCommentSuccess();
    } catch (error) {
      console.error(error);
      toast.error("留言失敗");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full">
      {showMentions && members.length > 0 && (
        <div className="absolute bottom-full mb-2 w-full max-w-[240px] bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2">
          <div className="p-2 border-b border-zinc-800 flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider bg-zinc-950/50">
            <AtSign className="w-3 h-3" /> Mention Member
          </div>
          <div className="max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
            {members
              .filter(m => (m.display_name || "").toLowerCase().includes(mentionFilter))
              .map(member => (
                <button
                  key={member.user_id}
                  type="button"
                  onClick={() => insertMention(member.display_name)}
                  className="w-full px-3 py-2 text-left text-xs text-zinc-300 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-3 border-b border-zinc-800/50 last:border-0 group"
                >
                  {/* ✅ 使用 profiles 裡的 avatar_url */}
                  <Avatar className="h-6 w-6 border border-zinc-700 shadow-sm shrink-0">
                    <AvatarImage 
                      src={member.profiles?.avatar_url || ""} 
                      className="object-cover" 
                    />
                    <AvatarFallback className="text-[9px] bg-zinc-800 text-zinc-400 group-hover:bg-blue-500 group-hover:text-white">
                      {member.display_name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <span className="truncate font-medium">{member.display_name || "未命名成員"}</span>
                </button>
              ))}
            
            {members.filter(m => (m.display_name || "").toLowerCase().includes(mentionFilter)).length === 0 && (
               <div className="p-3 text-center text-xs text-zinc-500">找不到成員</div>
            )}
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
            placeholder="輸入 @ 標記團員..."
            className="flex-1 bg-transparent border-none focus-visible:ring-0 text-sm placeholder:text-zinc-600 px-2"
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