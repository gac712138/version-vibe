"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload, Trash2, User, Briefcase, Camera } from "lucide-react"; // 新增 Camera icon
import { toast } from "sonner";
import { ImageCropper } from "@/components/ImageCropper"; 
import { getCroppedImg } from "@/lib/canvasUtils"; 
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // 全域 Profile 狀態
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [googleAvatar, setGoogleAvatar] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // 裁切狀態
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);

  // 專案身份設定狀態
  const [memberships, setMemberships] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectNickname, setProjectNickname] = useState("");
  const [savingProjectNickname, setSavingProjectNickname] = useState(false);

  // 隱藏的檔案輸入框 Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. 初始化：讀取資料
  useEffect(() => {
    async function initData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);

      const gName = user.user_metadata?.full_name;
      const gPic = user.user_metadata?.avatar_url;
      setGoogleAvatar(gPic);

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setDisplayName(profile.display_name || gName || "");
        setAvatarUrl(profile.avatar_url || gPic);
      } else {
        setDisplayName(gName || "");
        setAvatarUrl(gPic);
      }

      const { data: members } = await supabase
        .from("project_members")
        .select(`
          id,
          project_id,
          display_name,
          projects ( id, name )
        `)
        .eq("user_id", user.id);
      
      if (members) {
        setMemberships(members);
        if (members.length > 0) {
          setSelectedProjectId(members[0].project_id);
          setProjectNickname(members[0].display_name || "");
        }
      }

      setLoading(false);
    }
    initData();
  }, [supabase, router]);

  // --- 裁切相關 Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedFile(reader.result as string);
        setIsCropperOpen(true); // 選完圖後開啟裁切彈窗
        // 清空 input 讓同一張圖可以重複選
        e.target.value = ""; 
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_: any, pixels: any) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirmCrop = async () => {
    if (!selectedFile || !croppedAreaPixels) return;
    try {
      const croppedImage = await getCroppedImg(selectedFile, croppedAreaPixels);
      if (croppedImage) {
        setAvatarUrl(croppedImage); 
        const response = await fetch(croppedImage);
        const blob = await response.blob();
        setCroppedBlob(blob);
        
        setIsCropperOpen(false); // 關閉裁切視窗
        toast.success("裁切完成，請記得點擊「儲存變更」");
      }
    } catch (e) {
      console.error(e);
      toast.error("裁切失敗");
    }
  };

  // --- 全域 Profile 儲存 ---
  const handleSave = async () => {
    if (!userId) return;
    setUploading(true);

    try {
      let finalAvatarUrl = avatarUrl;

      if (croppedBlob) {
        const fileName = `${userId}/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("avatars") 
          .upload(fileName, croppedBlob, { upsert: true, contentType: 'image/jpeg' });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);
        
        finalAvatarUrl = publicUrl;
      } else {
        if (!finalAvatarUrl || finalAvatarUrl.startsWith("blob:")) {
           finalAvatarUrl = googleAvatar;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          display_name: displayName,
          avatar_url: finalAvatarUrl,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      await supabase
        .from("project_members")
        .update({ avatar_url: finalAvatarUrl } as any)
        .eq("user_id", userId);
      
      toast.success("全域個人資料已更新！");
      setCroppedBlob(null);
      router.refresh(); 
    } catch (error: any) {
      console.error(error);
      toast.error("更新失敗: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  // --- 專案身份設定 Handlers ---
  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    const member = memberships.find(m => m.project_id === projectId);
    setProjectNickname(member?.display_name || displayName || "");
  };

  const handleSaveProjectNickname = async () => {
    if (!userId || !selectedProjectId) return;
    setSavingProjectNickname(true);
    try {
      const { error } = await supabase
        .from("project_members")
        .update({ display_name: projectNickname })
        .eq("project_id", selectedProjectId)
        .eq("user_id", userId);

      if (error) throw error;
      setMemberships(prev => prev.map(m => 
        m.project_id === selectedProjectId ? { ...m, display_name: projectNickname } : m
      ));
      toast.success("專案暱稱已更新！");
    } catch (error) {
      console.error(error);
      toast.error("更新失敗");
    } finally {
      setSavingProjectNickname(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("警告：這將永久刪除你的帳號與所有專案，無法恢復！")) return;
    toast.error("此功能需要後端 API 支援");
  };

  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white flex justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl space-y-8 pb-20">
        
        <div className="border-b border-zinc-800 pb-6">
          <h1 className="text-3xl font-bold tracking-tight">個人設定</h1>
          <p className="mt-2 text-sm text-zinc-400">
            管理您的個人檔案與帳號設定。
          </p>
        </div>

        {/* --- 全域設定區 --- */}
        <div className="space-y-8 bg-zinc-900/30 p-8 rounded-xl border border-zinc-800/50">
          
          {/* 頭像設定 (簡化版) */}
          <div className="flex flex-col items-center justify-center gap-4 py-4">
            <div className="relative group">
              {/* 頭像按鈕 */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-zinc-800 shadow-xl cursor-pointer transition-all group-hover:border-blue-600 group-hover:scale-105"
              >
                <Avatar className="w-full h-full">
                  <AvatarImage src={avatarUrl || googleAvatar || ""} className="object-cover" />
                  <AvatarFallback className="text-4xl bg-zinc-800 text-zinc-400">
                    {displayName?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                {/* Hover 提示遮罩 */}
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <Camera className="w-8 h-8 text-white mb-1" />
                   <span className="text-[10px] font-bold text-white uppercase tracking-wider">更換頭像</span>
                </div>
              </div>
              
              {/* 隱藏的 Input */}
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <p className="text-xs text-zinc-500">點擊頭像即可更換圖片 (支援 JPG, PNG)</p>
          </div>

          <div className="h-px bg-zinc-800 my-4" />

          {/* 顯示名稱 */}
          <div className="space-y-4">
            <Label htmlFor="display-name" className="text-base font-semibold text-zinc-300">
              全域顯示名稱
            </Label>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <User className="absolute left-3 top-2.5 h-5 w-5 text-zinc-500" />
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="pl-10 bg-zinc-950 border-zinc-700 focus:border-blue-500 h-10 text-white"
                  placeholder="例如：Andrew"
                />
              </div>
              <Button onClick={handleSave} disabled={uploading} className="bg-blue-600 hover:bg-blue-500 min-w-[100px]">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "儲存設定"}
              </Button>
            </div>
            <p className="text-xs text-zinc-500">這是您的預設名稱，若專案內未設定暱稱將顯示此名稱。</p>
          </div>
        </div>

        {/* --- 專案身份設定區 --- */}
        <div className="space-y-8 bg-zinc-900/30 p-8 rounded-xl border border-zinc-800/50">
          <div className="space-y-2">
             <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-white">專案身份設定</h2>
             </div>
             <p className="text-sm text-zinc-400">
                您可以為每個參與的專案設定不同的顯示名稱（例如在某個樂團擔任「鼓手」，在另一個擔任「製作人」）。
             </p>
          </div>

          {memberships.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
               <div className="space-y-2">
                  <Label className="text-xs text-zinc-500 uppercase tracking-wider">選擇專案</Label>
                  <Select value={selectedProjectId} onValueChange={handleProjectChange}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white h-11">
                      <SelectValue placeholder="選擇一個專案" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                      {memberships.map((m) => (
                        <SelectItem 
                          key={m.project_id} 
                          value={m.project_id}
                          className="focus:bg-zinc-800 focus:text-white cursor-pointer"
                        >
                          {m.projects?.name || "未命名專案"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
               </div>

               <div className="space-y-2">
                  <Label className="text-xs text-zinc-500 uppercase tracking-wider">在此專案的顯示名稱</Label>
                  <div className="flex gap-2">
                    <Input
                      value={projectNickname}
                      onChange={(e) => setProjectNickname(e.target.value)}
                      className="bg-zinc-950 border-zinc-700 focus:border-blue-500 h-11 text-white"
                      placeholder="例如：製作人 Andrew"
                    />
                    <Button 
                      onClick={handleSaveProjectNickname} 
                      disabled={savingProjectNickname}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white h-11 px-6"
                    >
                      {savingProjectNickname ? <Loader2 className="h-4 w-4 animate-spin" /> : "儲存"}
                    </Button>
                  </div>
               </div>
            </div>
          ) : (
             <div className="text-center py-8 text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                您尚未加入任何專案，無法設定個別暱稱。
             </div>
          )}
        </div>

        {/* 底部操作區 */}
        <div className="flex items-center justify-between pt-6 border-t border-zinc-800">
          <Button onClick={handleDeleteAccount} variant="ghost" className="text-red-500 hover:text-red-400 hover:bg-red-950/20 gap-2 px-0">
             <Trash2 className="h-4 w-4" /> 刪除帳號
          </Button>
          <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => router.back()}>
            返回上一頁
          </Button>
        </div>

      </div>

      {/* 裁切彈出視窗 (Dialog) */}
      <Dialog open={isCropperOpen} onOpenChange={setIsCropperOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-xl">
           <DialogHeader>
             <DialogTitle>裁切圖片</DialogTitle>
           </DialogHeader>
           
           <div className="relative w-full h-[400px] bg-black rounded-lg overflow-hidden border border-zinc-800">
             {selectedFile && (
               <ImageCropper 
                 imageSrc={selectedFile} 
                 onCropComplete={onCropComplete} 
               />
             )}
           </div>

           <DialogFooter>
             <Button variant="ghost" onClick={() => setIsCropperOpen(false)}>取消</Button>
             <Button className="bg-blue-600 hover:bg-blue-500" onClick={handleConfirmCrop}>確認裁切</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}