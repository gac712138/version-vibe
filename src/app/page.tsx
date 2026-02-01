import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Music2, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      {/* Header / Nav */}
      <header className="flex items-center justify-between p-6 md:px-12 border-b border-gray-900">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-600 rounded-full">
            <Music2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">VersionVibe</span>
        </div>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-gray-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </nav>
        <Link href="/login">
          <Button variant="outline" className="border-gray-700 hover:bg-gray-800 text-white bg-transparent">
            Log in
          </Button>
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 md:py-32 relative overflow-hidden">
        {/* 背景裝飾光暈 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[100px] -z-10" />

        <div className="space-y-6 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
            混音交付，<br />從未如此精準優雅。
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            告別雜亂的 Email 與過期的連結。VersionVibe 為音樂製作人提供
            無損音質 A/B 測試、版本控管與精確的時間軸留言系統。
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link href="/login">
              <Button size="lg" className="h-12 px-8 text-lg bg-white text-black hover:bg-gray-200 gap-2 font-bold">
                開始免費使用 <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-5xl mx-auto text-left">
          {[
            { title: "無縫 A/B 切換", desc: "獨家 WebAudio 引擎，實現零延遲版本比對與響度匹配。" },
            { title: "時間軸留言", desc: "精確到毫秒的修改意見，直接標記在波形圖上。" },
            { title: "私有雲儲存", desc: "基於 R2 的低成本高音質儲存，檔案安全不外流。" }
          ].map((feature, i) => (
            <div key={i} className="p-6 rounded-2xl border border-gray-800 bg-gray-900/30 hover:bg-gray-900/50 transition-colors">
              <CheckCircle2 className="h-8 w-8 text-blue-500 mb-4" />
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-600 text-sm border-t border-gray-900">
        © 2026 VersionVibe. Built for Producers.
      </footer>
    </div>
  );
}