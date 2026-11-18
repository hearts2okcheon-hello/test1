import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // 한 번 본 화면은 30초 동안 기억해 둔다. 탭을 오갈 때 서버에 다시 묻지 않아 로딩이 없다
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
