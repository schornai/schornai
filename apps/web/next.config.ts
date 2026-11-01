import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: "base-uri 'self'; object-src 'none'; frame-ancestors 'self'",
          },
        ],
      },
    ];
  },
  experimental: {
    useTypeScriptCli: true,
  },
  output: "standalone",
  // The AI SDK loads undici dynamically, so keep it in the runtime image.
  outputFileTracingIncludes: {
    "/*": ["../../node_modules/undici/**/*"],
  },
  reactCompiler: true,
  transpilePackages: ["@schornio/aibox-package-ui"],
};

export default nextConfig;
