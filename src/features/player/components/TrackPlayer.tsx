"use client";

import { useState, useEffect, useCallback } from "react";
import { PlayerControls } from "./PlayerControls";
import { VersionList } from "./VersionList";
import { TrackComments } from "@/features/comments"; 
import { useComments } from "@/features/comments"; 
import { MoreHorizontal, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// Hooks 與組件
import { useAudioEngine } from "../hooks/useAudioEngine";
import { useAssetManagement } from "../hooks/useAssetManagement";
import { AssetActionDialogs } from "./AssetActionDialogs";
import { useGlobalCommentCountRealtime } from "../hooks/useGlobalCommentCountRealtime";

interface Version {
  id: string;
  version_number: number;
  name: string;
  created_at: string;
  storage_path: string;
  comment_count?: { count: number }[];
}

interface TrackPlayerProps {
  projectId: string;
  versions: Version[];
  canEdit: boolean;
}

export function TrackPlayer({ projectId, versions: initialVersions, canEdit }: TrackPlayerProps) {
  // --- UI 狀態 ---
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isVersionsExpanded, setIsVersionsExpanded] = useState(true);

  // --- 1. 音訊引擎 Hook ---
   const {
     versions,
     currentVersion,
     isPlaying,
     currentTime,
     duration,
     isMuted,
     assetVolumes,
     audioRefs,
     togglePlay,
     seek,
     selectVersion,
     setVolume,
     toggleMute,
     setVersions,
     handleTimeUpdate,
     handleLoadedMetadata,
     handleEnded,
   } = useAudioEngine({ versions: initialVersions });

  // --- 2. 資產管理 Hook (Rename/Delete) ---
   const {
     isRenameDialogOpen,
     setIsRenameDialogOpen,
     newName,
     setNewName,
     isDeleteDialogOpen,
     setIsDeleteDialogOpen,
     isDeletingAsset,
     handleRenameAsset,
     confirmDelete,
     supabase,
   } = useAssetManagement({
     projectId,
     currentVersion,
     setVersions,
   });

  // --- 3. 留言連動邏輯 ---
  const handleCommentCountChange = useCallback((assetId: string, delta: number) => {
    setVersions((prev) =>
      prev.map((v) => {
        if (v.id === assetId) {
          const currentCount = v.comment_count?.[0]?.count || 0;
          return { ...v, comment_count: [{ count: Math.max(0, currentCount + delta) }] };
        }
        return v;
      })
    );
  }, [setVersions]);

  // 全域留言數即時同步
  useGlobalCommentCountRealtime(handleCommentCountChange);


  // 取得當前用戶資訊（合併為一個 useEffect）
  const [currentUserInfo, setCurrentUserInfo] = useState<{
    id: string;
    displayName: string;
    avatarUrl: string | null;
  } | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        setCurrentUserInfo({
          id: user.id,
          displayName: user.user_metadata?.full_name || user.email || "",
          avatarUrl: user.user_metadata?.avatar_url || null,
        });
      }
    };
    getUser();
  }, [supabase]);

  const { comments, fetchComments } = useComments({
    assetId: currentVersion?.id || "",
    projectId,
    onCommentChange: handleCommentCountChange,
    currentUserId: currentUserInfo?.id || "",
    currentUserDisplayName: currentUserInfo?.displayName || "",
    currentUserAvatarUrl: currentUserInfo?.avatarUrl || null,
  });

  // 副作用：切換版本時抓取留言
  useEffect(() => {
    if (currentVersion) {
      fetchComments();
    }
  }, [currentVersion, fetchComments]);

  // ...existing code...

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white">
      {/* 隱藏的 Audio DOM 節點 */}
      {versions.map((v) => (
        <audio
          key={v.id}
          ref={(el) => { if (el) audioRefs.current[v.id] = el; }}
          src={`${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${v.storage_path.replace(/^\//, '')}`}
          preload="auto"
          playsInline
          onTimeUpdate={(e) => handleTimeUpdate(v.id, e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => handleLoadedMetadata(v.id, e.currentTarget.duration)}
          onEnded={() => handleEnded(v.id)}
        />
      ))}

      {/* --- Section 1: 播放器控制列 --- */}
      <div className="shrink-0 p-4 md:p-6 bg-zinc-950 border-b border-zinc-800/50 relative z-10">
        {canEdit && (
          <div className="absolute top-2 right-2 md:top-4 md:right-4 z-20">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                <DropdownMenuItem 
                  onClick={() => { if (currentVersion) { setNewName(currentVersion.name); setIsRenameDialogOpen(true); }}} 
                  className="cursor-pointer focus:bg-zinc-800"
                >
                  <Edit className="mr-2 h-4 w-4" /> 重新命名版本
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem 
                  onClick={() => setIsDeleteDialogOpen(true)} 
                  className="cursor-pointer text-red-400 focus:bg-zinc-800"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> 刪除版本
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <PlayerControls
          isPlaying={isPlaying}
          onPlayPauseToggle={togglePlay}
          currentVersionName={currentVersion?.name}
          currentTime={currentTime}
          duration={duration}
          onSeek={seek}
          comments={comments}
          volume={assetVolumes[currentVersion?.id || ""] ?? 0.9}
          isMuted={isMuted}
          onVolumeChange={setVolume}
          onMuteToggle={toggleMute}
        />
      </div>

      {/* --- Section 2: 版本清單 (可摺疊) --- */}
      <div className="shrink-0 bg-zinc-950 border-b border-zinc-800 relative z-10">
        <div className={cn(
          "transition-all duration-1000 ease-in-out overflow-hidden",
          isVersionsExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}>
          <div className="max-h-[30vh] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 p-4 pt-4 pb-6">
              <VersionList 
                versions={versions} 
                currentVersionId={currentVersion?.id || null} 
                isPlaying={isPlaying} 
                onVersionSelect={(version) => selectVersion(version.id)} 
                className="w-full" 
              />
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 z-20">
          <button 
            onClick={() => setIsVersionsExpanded(!isVersionsExpanded)} 
            className="bg-zinc-950 border border-zinc-800 rounded-full w-12 h-5 flex items-center justify-center text-zinc-500 hover:text-white shadow-sm transition-colors cursor-pointer"
          >
            {isVersionsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* --- Section 3: 留言區塊 --- */}
      <div className="flex-1 min-h-0 flex flex-col bg-zinc-900/20 relative z-0">
        <TrackComments
            projectId={projectId}
            assetId={currentVersion?.id || ""}
            currentTime={currentTime}
            currentUserId={currentUserId}
            currentUserDisplayName={currentUserInfo?.displayName || ""}
            currentUserAvatarUrl={currentUserInfo?.avatarUrl || null}
            onSeek={seek}
            onCommentChange={handleCommentCountChange}
            className="flex-1 flex flex-col min-h-0"
        />
      </div>

      {/* 抽離出的彈窗組件 */}
      <AssetActionDialogs
        isRenameDialogOpen={isRenameDialogOpen}
        setIsRenameDialogOpen={setIsRenameDialogOpen}
        newName={newName}
        setNewName={setNewName}
        handleRenameAsset={handleRenameAsset}
        isDeleteDialogOpen={isDeleteDialogOpen}
        setIsDeleteDialogOpen={setIsDeleteDialogOpen}
        isDeletingAsset={isDeletingAsset}
        confirmDelete={confirmDelete}
      />
    </div>
  );
}