/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production build phải validate TypeScript (lỗi type sẽ chặn build trên Vercel)
  images: {
    unoptimized: true,
  },
}

export default nextConfig
