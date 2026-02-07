"use client";

import { useState } from "react";
import Cropper from "react-easy-crop";
import { Slider } from "@/components/ui/slider";

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete?: (croppedArea: any, croppedAreaPixels: any) => void;
}

export function ImageCropper({ imageSrc, onCropComplete }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  return (
    <div className="relative w-full h-full flex flex-col group bg-black">
      <div className="relative flex-1 w-full h-full">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1} // 強制正方形 (1:1)
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          showGrid={true}
        />
      </div>
      
      {/* 縮放控制條 (浮動在下方) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 bg-zinc-950/80 backdrop-blur-md px-4 py-2 rounded-full border border-zinc-800 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Zoom</span>
        <Slider
          value={[zoom]}
          min={1}
          max={3}
          step={0.1}
          onValueChange={(val) => setZoom(val[0])}
          className="flex-1 cursor-pointer"
        />
      </div>
    </div>
  );
}