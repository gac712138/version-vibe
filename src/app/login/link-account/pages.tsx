"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner"; // 假設你有裝 toast，如果沒有可換成 alert 或自訂錯誤顯示

// 已移除 LINE 綁定頁面，僅保留空檔案。