/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // ✅ 將限制放寬至 4MB
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
