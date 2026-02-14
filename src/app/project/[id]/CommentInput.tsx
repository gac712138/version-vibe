"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input"; // ❌ 不再使用單行 Input
import { createComment } from "@/app/actions/comments"; 
import { Send, Clock, AtSign, Users } from "lucide-react"; 
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface CommentInputProps {
  projectId: string;
  assetId: string;
  currentTime: number;
  onCommentSuccess: () => void;
  parentId?: string;
  initialValue?: string; 
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
  initialValue = "" 
}: CommentInputProps) {
  const [content, setContent] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [members, setMembers] = useState<Member[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const supabase = createClient();
  
  // ✅ 改用 TextArea 的 Ref
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialValue) {
      setContent(initialValue);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [initialValue]);

  // ✅ 自動調整高度的邏輯
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // 先重置高度，讓 scrollHeight 重新計算 (處理刪除文字變矮的情況)
      textarea.style.height = 'auto'; 
      // 設定新高度，最高不超過 120px (約 5-6 行)
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [content]);

  // 取得專案成員 (並加入 @all 選項)
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
    
    // 檢查是否正在輸入 @ mention
    const words = value.split(/[\s\n]+/); // 支援換行符號分割
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith("@")) {
      setMentionFilter(lastWord.slice(1).toLowerCase());
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (displayName: string) => {
    const words = content.split(/(\s+)/); // 保留空白分隔符
    // 替換最後一個詞
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

  // ✅ 鍵盤事件：處理 Enter 送出 vs 換行
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      // 在電腦版：Enter 直接送出 (除非是在選手字詞)
      // 在手機版：Enter 通常是換行，不會觸發這裡 (因為手機輸入法行為不同)，或者可以保留預設行為
      
      // 判斷是否為行動裝置的簡易方法 (選用)，或是統一行為：
      // 這裡設定：只有 Shift+Enter 才是換行，Enter 是送出。
      // 注意：手機鍵盤的「換行」鍵通常會發送 Enter 鍵碼，如果你希望手機按換行鍵是換行，
      // 你可能需要判斷 window.innerWidth 或依賴使用者習慣點擊右邊按鈕。
      
      // 為了最佳體驗：
      // 我們攔截 preventDefault，執行 submit。
      // 但如果是手機 (Touch device)，通常使用者習慣按 UI 上的發送鈕，
      // 鍵盤上的 Enter 鍵在 textarea 預設就是換行。
      // 這裡我們做一個簡單判斷：如果螢幕寬度大於 768 (電腦)，則 Enter 送出；否則允許換行。
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      
      if (isDesktop) {
        e.preventDefault();
        handleSubmit(e);
      }
    }
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
        parent_id: parentId, 
      });

      setContent("");
      toast.success(parentId ? "回覆已送出" : "留言已送出");
      onCommentSuccess();
      
      // 送出後重置高度
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error(error);
      toast.error("發送失敗");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMembers = members.filter(m => 
    (m.display_name || "").toLowerCase().includes(mentionFilter)
  );

  return (
    <div className="relative w-full">
      {/* Mention 提示清單區 */}
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
            
            {filteredMembers.length === 0 && (
               <div className="p-3 text-center text-xs text-zinc-500">找不到成員</div>
            )}
          </div>
        </div>
      )}

      {/* 輸入框表單 */}
      <form onSubmit={handleSubmit} className="relative group">
        {/* ✅ 修改：items-center -> items-end，讓按鈕在多行輸入時固定在底部 */}
        <div className="flex items-end gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-2xl focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all shadow-inner">
          {/* 時間標記 (固定在底部) */}
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 rounded text-blue-400 text-xs font-mono border border-blue-500/20 mb-0.5">
            <Clock className="w-3 h-3" />
            {new Date(currentTime * 1000).toISOString().substr(14, 5)}
          </div>
          
          {/* ✅ 替換為 Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={parentId ? "寫下你的回覆..." : "輸入 @ 標記團員或 @all"}
            rows={1}
            className={cn(
              "flex-1 bg-transparent border-none focus:ring-0 text-sm placeholder:text-zinc-600 px-2 py-1.5 resize-none max-h-[120px] min-h-[36px]",
              "scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent" // 自訂捲軸樣式
            )}
            style={{ outline: 'none' }} // 強制移除 focus outline (由外層 div 處理)
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
          />
          
          {/* 送出按鈕 (固定在底部) */}
          <Button 
            type="submit" 
            size="icon" 
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