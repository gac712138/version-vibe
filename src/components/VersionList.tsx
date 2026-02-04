"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface Version {
  id: string;
  version_number: number;
  name: string;
  created_at: string;
  storage_path: string; 
}

interface VersionListProps {
  versions: Version[];
  currentVersionId: string | null;
  onVersionSelect: (version: Version) => void;
  isPlaying: boolean;
  className?: string; // 👈 新增 className 屬性
}

export function VersionList({
  versions,
  currentVersionId,
  onVersionSelect,
  className = "", // 預設為空字串
}: VersionListProps) {
  
  const handleValueChange = (value: string) => {
    const selectedVersion = versions.find((v) => v.id === value);
    if (selectedVersion) {
      onVersionSelect(selectedVersion);
    }
  };

  return (
    // 移除原本的 max-w 限制，改用 w-full 並允許外部 className 覆蓋
    <div className={`w-full ${className}`}>
      <Select value={currentVersionId || ""} onValueChange={handleValueChange}>
        <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-zinc-200 focus:ring-blue-600 h-10">
          <SelectValue placeholder="選擇版本" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
          {versions.map((version) => (
            <SelectItem 
              key={version.id} 
              value={version.id}
              className="focus:bg-zinc-800 focus:text-white cursor-pointer"
            >
              <div className="flex items-center justify-between w-full gap-4">
                <span className="font-medium truncate">
                  {version.name}
                </span>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Badge variant="outline" className="border-zinc-700 text-zinc-400 h-5 px-1.5 hidden sm:inline-flex">
                    v{version.version_number}
                  </Badge>
                  <span className="hidden sm:flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(version.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}