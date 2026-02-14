"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { createComment, updateComment } from "@/app/actions/comments"; 
import { Send, Clock, AtSign, Users } from "lucide-react"; 
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface CommentInputProps {
  projectId: string;
  assetId: string;
  currentTime: number;
  onCommentSuccess: (isEdit: boolean) => void;
  parentId?: string;
  initialValue?: string; 
  editingCommentId?: string | null; 
}

type Member = {
  user_id: string;
  display_name: string;
  profiles: {
    avatar_url: string | null;
  } | null;
};

export function CommentInput({ 
  projectId, 
  assetId, 
  currentTime, 
  onCommentSuccess,
  parentId,
  initialValue = "",
  editingCommentId 
}: CommentInputProps) {
  const [content, setContent] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [members, setMembers] = useState<Member[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const supabase = createClient();
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setContent(initialValue || "");
    if (initialValue) {
      setTimeout(() => {
        textareaRef.current?.focus();
        if (editingCommentId && textareaRef.current) {
           textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
        }
      }, 50);
    }
  }, [initialValue, editingCommentId]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; 
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [content]);

  useEffect(() => {
    async function getMembers() {
      if (!projectId) return;
      const { data } = await supabase
        .from("project_members")
        .select(`
          user_id, 
          display_name,
          profiles:user_id ( avatar_url )
        `) 
        .eq("project_id", projectId);
        
      if (data) {
        const allOption: Member = {
          user_id: "all",          
          display_name: "all",     
          profiles: null           
        };
        setMembers([allOption, ...(data as any)]);
      }
    }
    getMembers();
  }, [projectId, supabase]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    const words = value.split(/[\s\n]+/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith("@")) {
      setMentionFilter(lastWord.slice(1).toLowerCase());
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (displayName: string) => {
    const words = content.split(/(\s+)/);
    for (let i = words.length - 1; i >= 0; i--) {
      if (words[i].includes("@")) {
        words[i] = `@${displayName} `;
        break;
      }
    }
    setContent(words.join(""));
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      // ✅ 檢查：如果是桌面版且目前「沒有正在送出」，才允許送出
      if (isDesktop && !isSubmitting) {
        e.preventDefault();
        handleSubmit(e);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ 關鍵修正：如果在送出中 (isSubmitting 為 true)，直接擋下
    if (isSubmitting || !content.trim() || !assetId) return;

    setIsSubmitting(true); // 立即鎖定狀態

    try {
      if (editingCommentId) {
        await updateComment(editingCommentId, content);
        toast.success("留言已更新");
        onCommentSuccess(true); 
      } else {
        await createComment({
          content,
          timestamp: currentTime,
          asset_id: assetId,
          project_id: projectId,
          parent_id: parentId, 
        });
        toast.success(parentId ? "回覆已送出" : "留言已送出");
        onCommentSuccess(false); 
      }

      setContent("");
      
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error(error);
      toast.error("發送失敗");
    } finally {
      // 無論成功失敗，最後才解鎖按鈕
      setIsSubmitting(false);
    }
  };

  const filteredMembers = members.filter(m => 
    (m.display_name || "").toLowerCase().includes(mentionFilter)
  );

  return (
    <div className="relative w-full">
      {showMentions && members.length > 0 && (
        <div className="absolute bottom-full mb-2 w-full max-w-[240px] bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2">
          <div className="p-2 border-b border-zinc-800 flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider bg-zinc-950/50">
            <AtSign className="w-3 h-3" /> Mention Member
          </div>
          <div className="max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
            {filteredMembers.map(member => (
                <button
                  key={member.user_id}
                  type="button"
                  onClick={() => insertMention(member.display_name)}
                  className="w-full px-3 py-2 text-left text-xs text-zinc-300 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-3 border-b border-zinc-800/50 last:border-0 group"
                >
                  <Avatar className="h-6 w-6 border border-zinc-700 shadow-sm shrink-0">
                    {member.user_id === "all" ? (
                      <div className="flex items-center justify-center w-full h-full bg-blue-600/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                        <Users size={14} />
                      </div>
                    ) : (
                      <>
                        <AvatarImage 
                          src={member.profiles?.avatar_url || ""} 
                          className="object-cover" 
                        />
                        <AvatarFallback className="text-[9px] bg-zinc-800 text-zinc-400 group-hover:bg-blue-500 group-hover:text-white">
                          {member.display_name?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className="truncate font-medium">
                        {member.user_id === "all" ? "Notify Everyone" : (member.display_name || "未命名成員")}
                    </span>
                    {member.user_id === "all" && (
                        <span className="text-[9px] opacity-60">@all</span>
                    )}
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative group">
        <div className="flex items-end gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-2xl focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all shadow-inner">
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 rounded text-blue-400 text-xs font-mono border border-blue-500/20 mb-0.5">
            <Clock className="w-3 h-3" />
            {new Date(currentTime * 1000).toISOString().substr(14, 5)}
          </div>
          
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={editingCommentId ? "編輯訊息..." : (parentId ? "寫下你的回覆..." : "輸入 @ 標記團員或 @all")}
            rows={1}
            className={cn(
              "flex-1 bg-transparent border-none focus:ring-0 text-sm placeholder:text-zinc-600 px-2 py-1.5 resize-none max-h-[120px] min-h-[36px]",
              "scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
            )}
            style={{ outline: 'none' }} 
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
          />
          
          <Button 
            type="submit" 
            size="icon" 
            // ✅ 確保 isSubmitting 為 true 時按鈕也失效
            disabled={isSubmitting || !content.trim()}
            className="bg-blue-600 hover:bg-blue-700 h-8 w-8 shrink-0 shadow-lg shadow-blue-900/20 transition-transform active:scale-95 rounded-full mb-0.5"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}