"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronDown, Loader2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MemberActionsProps {
  member: { id: string; user_id: string; role: string };
  isOwner: boolean;
  isSelf: boolean;
}

const ROLES = [
  { label: "Admin", value: "admin", description: "可管理音軌與成員" },
  { label: "Viewer", value: "viewer", description: "僅能查看與評論" },
];

export function MemberActions({ member, isOwner, isSelf }: MemberActionsProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRoleChange = async (newRole: string) => {
    if (newRole === member.role) {
      setOpen(false);
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("project_members")
        .update({ role: newRole })
        .eq("id", member.id);

      if (error) throw error;
      toast.success(`已將權限變更為 ${newRole.toUpperCase()}`);
      setOpen(false);
      router.refresh();
    } catch (error: any) {
      toast.error("變更失敗：" + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 如果不是 Owner，或是查看自己，顯示純文字 Badge
  if (!isOwner || isSelf) {
    return (
      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
        {member.role}
      </span>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button 
          className={cn(
            "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded transition-colors",
            "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          )}
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : member.role}
          <ChevronDown className="w-2.5 h-2.5 opacity-50" />
        </button>
      </PopoverTrigger>
      
      <PopoverContent className="w-56 p-2 bg-zinc-900 border-zinc-800 text-white shadow-2xl" align="start">
        <div className="px-2 py-1.5 mb-1 border-b border-zinc-800">
          <p className="text-[10px] font-bold text-zinc-500 uppercase">變更成員權限</p>
        </div>
        
        <div className="space-y-1">
          {ROLES.map((role) => (
            <button
              key={role.value}
              onClick={() => handleRoleChange(role.value)}
              disabled={loading}
              className={cn(
                "w-full flex items-start justify-between p-2 rounded-md text-left transition-all",
                "hover:bg-zinc-800 group",
                member.role === role.value ? "bg-blue-600/10 text-blue-400" : "text-zinc-300"
              )}
            >
              <div className="flex flex-col">
                <span className="text-xs font-bold">{role.label}</span>
                <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 italic">
                  {role.description}
                </span>
              </div>
              {member.role === role.value && <Check className="w-4 h-4 mt-0.5" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}