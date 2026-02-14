"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createComment } from "@/app/actions/comments"; // 確保路徑正確
import { Send, Clock, AtSign, Users } from "lucide-react"; // ✅ 新增 Users icon
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialValue) {
      setContent(initialValue);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [initialValue]);

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
        // ✅ 關鍵修改：手動加入 'all' 選項在最前面
        const allOption: Member = {
          user_id: "all",          // 特殊 ID
          display_name: "all",     // 顯示名稱 (會變成 @all)
          profiles: null           // 沒有頭像
        };

        // 將 all 選項與後端抓回來的成員合併
        setMembers([allOption, ...(data as any)]);
      }
    }
    getMembers();
  }, [projectId, supabase]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setContent(value);
    
    // 簡單的 Mention 觸發邏輯 (抓取最後一個詞)
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
        parent_id: parentId, 
      });

      setContent("");
      toast.success(parentId ? "回覆已送出" : "留言已送出");
      onCommentSuccess();
    } catch (error) {
      console.error(error);
      toast.error("發送失敗");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 過濾後的成員列表
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
                    {/* ✅ 判斷如果是 'all'，顯示 Users Icon，否則顯示正常頭像 */}
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
                  
                  {/* 顯示名稱 */}
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className="truncate font-medium">
                        {member.user_id === "all" ? "所有人" : (member.display_name || "未命名成員")}
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
        <div className="flex items-center gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-lg focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all shadow-inner">
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 rounded text-blue-400 text-xs font-mono border border-blue-500/20">
            <Clock className="w-3 h-3" />
            {new Date(currentTime * 1000).toISOString().substr(14, 5)}
          </div>
          
          <Input
            ref={inputRef}
            value={content}
            onChange={handleInputChange}
            placeholder={parentId ? "寫下你的回覆..." : "輸入 @ 標記團員或 @all"}
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