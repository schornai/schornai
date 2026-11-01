import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";

const roots = {
  web: resolve("apps/web/storybook-static"),
  ui: resolve("packages/ui/storybook-static"),
  admin: resolve("apps/admin-mac/storybook-static"),
};
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
};
const port = Number(process.env.STORYBOOK_VISUAL_PORT ?? 6106);
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    const segments = decodeURIComponent(url.pathname)
      .split("/")
      .filter(Boolean);
    const book =
      segments[0] in roots
        ? segments.shift()
        : new URL(
            request.headers.referer ?? "http://localhost/web/",
          ).pathname.split("/")[1];
    const root = roots[book] ?? roots.web;
    const file = resolve(root, segments.join("/") || "index.html");
    if (!file.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      "Content-Type": mime[extname(file)] ?? "application/octet-stream",
      "Content-Length": info.size,
      "Cache-Control": url.pathname.includes("/assets/")
        ? "public, max-age=31536000, immutable"
        : "no-store",
    });
    if (request.method === "HEAD") response.end();
    else createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404).end();
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(`Storybooks: http://127.0.0.1:${port}/{web,ui,admin}/`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close());
