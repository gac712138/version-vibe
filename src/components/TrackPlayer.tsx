"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation"; 
import { PlayerControls } from "./PlayerControls";
import { VersionList } from "./VersionList";
// 1. Import the new TrackComments component
import { TrackComments } from "@/components/track/TrackComments"; 
import { createClient } from "@/utils/supabase/client";
import { getComments, type CommentWithUser } from "@/app/actions/comments"; 
import { updateAssetName, deleteAsset } from "@/app/actions/assets"; 
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface Version {
  id: string;
  version_number: number;
  name: string;
  created_at: string;
  storage_path: string;
}

interface TrackPlayerProps {
  projectId: string;
  versions: Version[];
  canEdit: boolean;
}

export function TrackPlayer({ projectId, versions, canEdit }: TrackPlayerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- State: Version & Playback ---
  const [currentVersion, setCurrentVersion] = useState<Version | null>(versions[0] || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [pendingSeekTime, setPendingSeekTime] = useState<number | null>(null);
  const [shouldPlayAfterSeek, setShouldPlayAfterSeek] = useState(false);

  // --- State: Comments (Lifted State) ---
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // --- State: Asset Management ---
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");


  // 1. Get User
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, [supabase]);


  // 2. Fetch Comments (Memoized function to be passed down)
  const fetchComments = useCallback(async () => {
    if (!currentVersion) return;
    try {
      const data = await getComments(currentVersion.id, projectId);
      setComments(data);
    } catch (error) {
      console.error("Failed to fetch comments", error);
    }
  }, [currentVersion, projectId]);

  // Initial fetch when version changes
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);


  // 3. URL Sync & Audio Source
  useEffect(() => {
    const targetVersionId = searchParams.get("versionId");
    if (targetVersionId && currentVersion?.id !== targetVersionId) {
      const targetVersion = versions.find(v => v.id === targetVersionId);
      if (targetVersion) setCurrentVersion(targetVersion);
    }
  }, [searchParams, versions, currentVersion]);

  useEffect(() => {
    if (currentVersion && audioRef.current) {
      const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
      const cleanPath = currentVersion.storage_path.startsWith('/') 
        ? currentVersion.storage_path.slice(1) 
        : currentVersion.storage_path;
      const newSrc = `${publicUrl}/${cleanPath}`;
      if (audioRef.current.src !== newSrc && !audioRef.current.src.endsWith(newSrc)) {
         audioRef.current.src = newSrc;
         audioRef.current.load();
      }
    }
  }, [currentVersion]);


  // --- Handlers ---

  const handleVersionSelect = (version: Version) => {
    if (currentVersion?.id === version.id) {
        togglePlayPause();
        return;
    }
    if (audioRef.current) {
        const currentPos = audioRef.current.currentTime;
        setPendingSeekTime(currentPos);
        setShouldPlayAfterSeek(isPlaying); 
    }
    setCurrentVersion(version);
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !currentVersion) return;
    isPlaying ? audioRef.current.pause() : audioRef.current.play().catch(console.error);
  };

  const handleSeek = (value: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value;
      setCurrentTime(value);
    }
  };

  const handleRenameAsset = async () => {
    if (!currentVersion || !newName.trim()) return;
    try {
      await updateAssetName(projectId, currentVersion.id, newName);
      toast.success("版本名稱已更新");
      setIsRenameDialogOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("更新失敗");
    }
  };

  const handleDeleteAsset = async () => {
    if (!currentVersion) return;
    if (!confirm(`確定要刪除版本 "${currentVersion.name}" 嗎？此操作無法復原。`)) return;
    try {
      await deleteAsset(projectId, currentVersion.id);
      toast.success("版本已刪除");
      const remaining = versions.filter(v => v.id !== currentVersion.id);
      if (remaining.length > 0) setCurrentVersion(remaining[0]);
      else router.refresh();
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("刪除失敗");
    }
  };


  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <audio
        ref={audioRef}
        preload="auto"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          if (pendingSeekTime !== null) {
            e.currentTarget.currentTime = pendingSeekTime;
            if (shouldPlayAfterSeek) {
                const playPromise = e.currentTarget.play();
                if (playPromise !== undefined) playPromise.then(() => setIsPlaying(true)).catch(console.warn);
            } else {
                e.currentTarget.pause();
                setIsPlaying(false);
            }
            setPendingSeekTime(null);
          }
        }}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Header Info */}
      <div className="px-2">
         <div className="flex items-center gap-3 mb-1">
           <h2 className="text-2xl font-bold text-white truncate">
             {currentVersion?.name}
           </h2>
           <span className="shrink-0 text-xs font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
             v{currentVersion?.version_number}
           </span>
         </div>
         <p className="text-xs text-zinc-500">
            Created at {currentVersion && currentVersion.created_at.split('T')[0]}
         </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Player & Versions */}
        <div className="lg:col-span-2">
           <div className="relative bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
              
              {/* Asset Settings Menu */}
              {canEdit && (
                <div className="absolute top-6 right-6 z-20">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full">
                        <MoreHorizontal className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                      <DropdownMenuItem 
                        onClick={() => {
                          if (currentVersion) {
                            setNewName(currentVersion.name);
                            setIsRenameDialogOpen(true);
                          }
                        }}
                        className="cursor-pointer focus:bg-zinc-800 focus:text-white"
                      >
                        <Edit className="mr-2 h-4 w-4" /> 重新命名
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-zinc-800" />
                      <DropdownMenuItem 
                        onClick={handleDeleteAsset}
                        className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-900/20"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> 刪除版本
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              <div className="p-6 pb-2">
                <PlayerControls
                  isPlaying={isPlaying}
                  onPlayPauseToggle={togglePlayPause}
                  currentVersionName={currentVersion?.name}
                  currentTime={currentTime}
                  duration={duration}
                  onSeek={handleSeek}
                  comments={comments} // Pass comments for waveform markers
                />
              </div>

              <div className="px-6 pb-6 pt-2">
                <VersionList
                  versions={versions}
                  currentVersionId={currentVersion?.id || null}
                  isPlaying={isPlaying}
                  onVersionSelect={handleVersionSelect}
                  className="w-full"
                />
              </div>
           </div>
        </div>
        
        {/* Right Column: Comments (Using new component) */}
        <TrackComments 
           projectId={projectId}
           assetId={currentVersion?.id || ""}
           currentTime={currentTime}
           canEdit={canEdit}
           comments={comments}       // Receive data from parent
           currentUserId={currentUserId}
           onSeek={handleSeek}
           onRefresh={fetchComments} // Callback to refresh data
        />
      </div>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader><DialogTitle>重新命名版本</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white focus:ring-blue-600"
              placeholder="輸入新的版本名稱"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" className="text-zinc-400 hover:text-white">取消</Button>
            </DialogClose>
            <Button onClick={handleRenameAsset} className="bg-blue-600 hover:bg-blue-500">儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}