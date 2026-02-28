import { useState } from "react";
import { toast } from "sonner";
import { updateAssetName, deleteAsset } from "@/app/actions/assets";
import { createClient } from "@/utils/supabase/client";
import { Version } from "../types";

interface UseAssetManagementProps {
  projectId: string;
  currentVersion: Version | null;
  setVersions: React.Dispatch<React.SetStateAction<Version[]>>;
  setCurrentVersion?: React.Dispatch<React.SetStateAction<Version | null>>;
}

export function useAssetManagement({
  projectId,
  currentVersion,
  setVersions,
  setCurrentVersion,
}: UseAssetManagementProps) {
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [isDeletingAsset, setIsDeletingAsset] = useState<boolean>(false);
  const supabase = createClient();

  const handleRenameAsset = async () => {
    if (!currentVersion || !newName.trim()) return;
    try {
      await updateAssetName(projectId, currentVersion.id, newName);
      toast.success("版本名稱已更新");
      setVersions(prev => prev.map(v => v.id === currentVersion.id ? { ...v, name: newName } : v));
      if (setCurrentVersion) setCurrentVersion(prev => prev ? { ...prev, name: newName } : null);
      setIsRenameDialogOpen(false);
    } catch (error) { toast.error("更新失敗"); }
  };

  const confirmDelete = async () => {
    if (!currentVersion) return;
    setIsDeletingAsset(true);
    try {
      await deleteAsset(projectId, currentVersion.id);
      toast.success("版本已刪除");
      setIsDeleteDialogOpen(false);
      setVersions(prev => prev.filter(v => v.id !== currentVersion.id));
      if (setCurrentVersion) setCurrentVersion(null);
    } catch (error) { toast.error("刪除失敗"); } finally { setIsDeletingAsset(false); }
  };

  return {
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
  };
}
