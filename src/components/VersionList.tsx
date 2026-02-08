"use client";

import * as React from "react";
import { Check, ChevronDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  //CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

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
  isPlaying: boolean;
  onVersionSelect: (version: Version) => void;
  className?: string;
}

export function VersionList({
  versions,
  currentVersionId,
  onVersionSelect,
  className,
}: VersionListProps) {
  const [open, setOpen] = React.useState(false);
  const selectedVersion = versions.find((v) => v.id === currentVersionId) || versions[0];

  const formatDate = (dateString: string) => {
    return dateString.split('T')[0];
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-zinc-950/50 border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white h-12 px-3",
            className
          )}
        >
          {/* 按鈕內容容器：min-w-0 是 truncate 生效的關鍵 */}
          <div className="flex items-center flex-1 min-w-0 mr-2">
            
            {/* 版本號放在最前 */}
            <span className="shrink-0 bg-blue-600/20 text-blue-400 text-[10px] font-mono px-1.5 py-0.5 rounded border border-blue-500/30 mr-2">
              v{selectedVersion?.version_number}
            </span>

            {/* 檔名：加上 truncate */}
            <span className="truncate text-sm font-medium text-left">
              {selectedVersion?.name}
            </span>

            {/* 日期 (手機隱藏) */}
            <span className="hidden sm:flex items-center ml-auto text-xs text-zinc-500 pl-4 shrink-0">
               <Clock className="w-3 h-3 mr-1" />
               {formatDate(selectedVersion?.created_at)}
            </span>
          </div>
          
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      {/* ✅ 關鍵修改：加上 style 強制寬度等於 Trigger 寬度 */}
      <PopoverContent 
        className="p-0 bg-zinc-950 border-zinc-800" 
        align="start"
        style={{ width: 'var(--radix-popover-trigger-width)' }}
      >
        <Command className="bg-zinc-950 text-zinc-300">
          
          <CommandList>
            <CommandEmpty>找不到版本</CommandEmpty>
            <CommandGroup>
              {versions.map((version) => (
                <CommandItem
                  key={version.id}
                  value={version.name}
                  onSelect={() => {
                    onVersionSelect(version);
                    setOpen(false);
                  }}
                  className="cursor-pointer aria-selected:bg-zinc-900 aria-selected:text-white"
                >
                  <div className="flex items-center w-full min-w-0">
                    <span className={cn(
                        "shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded border mr-2 w-8 text-center",
                        currentVersionId === version.id 
                            ? "bg-blue-600 text-white border-blue-500" 
                            : "bg-zinc-800 text-zinc-400 border-zinc-700"
                    )}>
                      v{version.version_number}
                    </span>

                    {/* ✅ 下拉選單內的檔名也加上 truncate，確保不撐開 */}
                    <span className={cn(
                        "truncate text-sm flex-1 text-left",
                        currentVersionId === version.id ? "text-white font-medium" : "text-zinc-400"
                    )}>
                      {version.name}
                    </span>

                    <span className="hidden sm:block text-xs text-zinc-600 ml-2 shrink-0">
                        {formatDate(version.created_at)}
                    </span>

                    {currentVersionId === version.id && (
                      <Check className="ml-2 h-4 w-4 text-blue-500 shrink-0" />
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}