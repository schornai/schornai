import { createRequire } from "node:module";
import { dirname, relative } from "node:path";
import type { NextConfig } from "next";

const undiciDirectory = dirname(
  createRequire(import.meta.url).resolve("undici/package.json"),
);

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
    "/*": [`${relative(import.meta.dirname, undiciDirectory)}/**/*`],
  },
  reactCompiler: true,
  transpilePackages: ["@schornio/aibox-package-ui"],
};

export default nextConfig;
