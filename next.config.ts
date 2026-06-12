import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/media/**",
      },
      {
        // LAN / local-network access (e.g. 192.168.x.x)
        protocol: "http",
        hostname: "192.168.1.189",
        port: "8000",
        pathname: "/media/**",
      },
      {
        // Any hostname – covers all possible local IPs during development
        protocol: "http",
        hostname: "**",
        port: "8000",
        pathname: "/media/**",
      },
    ],
  },
};

export default nextConfig;
