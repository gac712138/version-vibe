import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AssetActionDialogsProps {
  isRenameDialogOpen: boolean;
  setIsRenameDialogOpen: (open: boolean) => void;
  newName: string;
  setNewName: (name: string) => void;
  handleRenameAsset: () => void;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: (open: boolean) => void;
  isDeletingAsset: boolean;
  confirmDelete: () => void;
}

export function AssetActionDialogs({
  isRenameDialogOpen,
  setIsRenameDialogOpen,
  newName,
  setNewName,
  handleRenameAsset,
  isDeleteDialogOpen,
  setIsDeleteDialogOpen,
  isDeletingAsset,
  confirmDelete,
}: AssetActionDialogsProps) {
  return (
    <>
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader><DialogTitle>重新命名版本</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white focus:ring-blue-600" placeholder="輸入新的版本名稱" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRenameDialogOpen(false)} className="text-zinc-400 hover:text-white">取消</Button>
            <Button onClick={handleRenameAsset} className="bg-blue-600 hover:bg-blue-500">儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500">刪除此版本嗎？</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">此動作無法復原。音檔與留言將被永久刪除。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-zinc-800 text-zinc-400">取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeletingAsset} className="bg-red-600">確認刪除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
