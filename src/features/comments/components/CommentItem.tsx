"use client";

import { useRef, useCallback, useMemo } from "react";
import React from "react";
import { useSearchParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { cn } from "@/lib/utils";
import { Pencil, Trash2, MessageSquare, X, Reply } from "lucide-react";

import type { CommentWithUser } from "../types";
import { getRelativeTime, formatMMSS } from "@/lib/utils/time";

export function useSmartGesture({
  onSingleClick,
  onDoubleClick,
  onLongPress,
  enableLongPress = true,
}: {
  onSingleClick: () => void;
  onDoubleClick: () => void;
  onLongPress: () => void;
  enableLongPress?: boolean;
}) {
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    isLongPressRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };

    if (enableLongPress) {
      longPressTimeoutRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(50);
        }
        onLongPress();
      }, 500);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (longPressTimeoutRef.current) {
      const moveX = Math.abs(e.clientX - startPosRef.current.x);
      const moveY = Math.abs(e.clientY - startPosRef.current.y);
      if (moveX > 10 || moveY > 10) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isLongPressRef.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressRef.current = false;
      return;
    }

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      onDoubleClick();
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        onSingleClick();
        clickTimeoutRef.current = null;
      }, 250);
    }
  };

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onClick: handleClick,
    style: { userSelect: 'none' as const, WebkitUserSelect: 'none' as const, touchAction: 'manipulation' as const },
  };
}

interface CommentItemProps {
  c: CommentWithUser;
  rootId?: string;
  currentUserId: string | null;
  activeThreadId: string | null;
  editingId: string | null;
  menuOpenId: string | null;
  onSeek: (time: number) => void;
  onReply: (comment: CommentWithUser, rootId: string) => void;
  onEdit: (comment: CommentWithUser) => void;
  onDelete: (id: string) => void;
  setMenuOpenId: (id: string | null) => void;
}

export function CommentItem({
  c,
  rootId,
  currentUserId,
  activeThreadId,
  editingId,
  menuOpenId,
  onSeek,
  onReply,
  onEdit,
  onDelete,
  setMenuOpenId,
}: CommentItemProps) {
  const searchParams = useSearchParams();
  const isReply = !!rootId;
  const isOwner = currentUserId === c.user_id;
  const isActiveThread = !isReply && activeThreadId === c.id;

  const targetId = searchParams.get("commentId");
  const isTarget = targetId === c.id;

  // gestureProps for smart gesture handling
  const gestureProps = useSmartGesture({
    onSingleClick: useCallback(() => {
      onSeek(c.timestamp);
    }, [onSeek, c.timestamp]),
    onDoubleClick: useCallback(() => {
      // 父留言: replyToId = id, 子留言: replyToId = parent_id
      const replyToId = rootId || c.id;
      onReply(c, replyToId);
    }, [onReply, c, rootId]),
    onLongPress: useCallback(() => {
      if (currentUserId === c.user_id) {
        setMenuOpenId(c.id);
      }
    }, [currentUserId, c.user_id, setMenuOpenId, c.id]),
    enableLongPress: true,
  });
  // isEdited: 判斷留言是否被編輯過
  const isEdited = !!c.updated_at && c.updated_at !== c.created_at;

  return (
    <div
      id={`comment-${c.id}`}
      className={cn(
        "flex gap-3 mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300 scroll-mt-24",
        isReply && "ml-12"
      )}
    >
      <Avatar className="w-9 h-9 border border-zinc-800 shrink-0 overflow-hidden rounded-full mt-1">
        <AvatarImage src={c.author.avatar_url || undefined} className="object-cover" />
        <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs flex items-center justify-center">
          {c.author.display_name?.[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div
        {...gestureProps}
        className={cn(
          "flex flex-col p-3 rounded-2xl w-fit min-w-[180px] max-w-[85%] md:max-w-[70%] border shadow-sm relative group transition-all duration-300 cursor-pointer active:scale-[0.98]",
          (isActiveThread || isReply) ? "bg-zinc-900/40 border-zinc-800/50 hover:bg-zinc-900/60" : "bg-zinc-900/60 border-zinc-800 hover:bg-zinc-800/80",
          editingId === c.id && "ring-2 ring-yellow-500/50 bg-yellow-500/10 border-yellow-500/50",
          isTarget && "ring-2 ring-blue-500 bg-blue-500/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
        )}
      >
        {isOwner && (
          <DropdownMenu open={menuOpenId === c.id} onOpenChange={(open) => !open && setMenuOpenId(null)}>
            <DropdownMenuTrigger asChild>
              <div className="absolute inset-0 w-full h-full pointer-events-none opacity-0 z-0" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              side="bottom" 
              align="end" 
              sideOffset={8} 
              collisionPadding={10} 
              className="bg-zinc-900 border-zinc-800 text-zinc-300 z-50 min-w-[100px] shadow-xl"
            >
              <DropdownMenuItem onClick={() => onEdit(c)} className="cursor-pointer text-xs py-2">
                <Pencil className="mr-2 h-3.5 w-3.5" /> 編輯留言
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(c.id)} className="cursor-pointer text-xs text-red-400 py-2 focus:text-red-400 focus:bg-red-400/10">
                <Trash2 className="mr-2 h-3.5 w-3.5" /> 刪除留言
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="flex justify-between items-center gap-4 mb-1.5 h-5 relative z-10">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-zinc-200">{c.author.display_name}</span>
            <span suppressHydrationWarning className="text-[10px] text-zinc-500 font-medium whitespace-nowrap">
              {getRelativeTime(c.created_at)} 
            </span>
            {isEdited && (
              <span className="text-[9px] text-zinc-600 italic -ml-1 whitespace-nowrap">
                (已編輯)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-end gap-2 relative z-10">
           <div className="flex-1 min-w-0">
              <div className="inline">
                <span className="inline-flex items-center justify-center mr-2 h-5 px-1.5 text-[10px] font-mono text-blue-400 bg-blue-500/10 rounded border border-blue-500/20 align-middle" style={{ transform: "translateY(-1px)" }}>
                  {formatMMSS(c.timestamp)}
                </span>
                <ParsedCommentContent content={c.content} />
              </div>
           </div>
           
           {!isReply && (c.replyCount ?? 0) > 0 && (
             <div className="shrink-0 flex items-center ml-1 h-5 self-end opacity-70">
                <MessageSquare size={12} className="text-zinc-500 mr-1" />
                <span className="text-[10px] font-bold text-zinc-500 tabular-nums">{c.replyCount}</span>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}


// basic renderer for comment text; preserves line breaks
export function ParsedCommentContent({ content }: { content: string }) {
  return (
    <div className="whitespace-pre-wrap break-words text-sm">
      {content}
    </div>
  );
}

export const MemoizedCommentItem = React.memo(CommentItem);
