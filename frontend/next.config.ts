import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  // Next's dev server gzip-compresses proxied /api responses by default.
  // Compression buffers internally, which defeats real-time SSE delivery
  // for /api/chat/stream — small token chunks never flush until the gzip
  // buffer fills or the stream ends, so the client sees one giant chunk
  // instead of a live stream. Disabling it keeps chunks flushed as sent.
  compress: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
