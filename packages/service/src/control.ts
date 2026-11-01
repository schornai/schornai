import { request } from "node:http";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";

export function socketPath(root: string) {
  // Unix socket paths on macOS are limited to 104 bytes; home paths can be long.
  return join(
    tmpdir(),
    `schornai-${process.getuid?.() ?? "user"}-${createHash("sha256").update(root).digest("hex").slice(0, 20)}.sock`,
  );
}
export function control(root: string, action: "status" | "stop" | "sync") {
  return new Promise<{ pid: number; state: string; services: string[] }>(
    (resolve, reject) => {
      const req = request(
        {
          socketPath: socketPath(root),
          path: `/${action}`,
          method: action === "status" ? "GET" : "POST",
          timeout: 2000,
        },
        (response) => {
          let body = "";
          response.setEncoding("utf8");
          response.on("data", (chunk: string) => {
            body += chunk;
            if (body.length > 16_384)
              req.destroy(new Error("Invalid control response"));
          });
          response.on("end", () => {
            try {
              if (response.statusCode !== 200)
                throw new Error(
                  response.statusCode === 409
                    ? "Sharing is not configured or service is stopping"
                    : "Control request failed",
                );
              resolve(JSON.parse(body));
            } catch (error) {
              reject(error);
            }
          });
        },
      );
      req.on("error", reject);
      req.on("timeout", () =>
        req.destroy(new Error("Control request timed out")),
      );
      req.end();
    },
  );
}
