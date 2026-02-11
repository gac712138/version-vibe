/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // ✅ 將限制放寬至 10MB
      bodySizeLimit: '10mb',
    },
  },
// ✅ 加入圖片網域白名單
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // 允許 Google 圖片
      },
      {
        protocol: 'https',
        hostname: 'givpegjmlceocvdlrogc.supabase.co', // 允許你的 Supabase 圖片
      },
    ],
  },
};



export default nextConfig;
