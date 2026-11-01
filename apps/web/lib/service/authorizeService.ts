import "server-only";
import { timingSafeEqual } from "node:crypto";

/** Machine sharing credential authorizes catalog/download reads only. */
export function authorizeService(request: Request) {
  const token = process.env.SERVICE_API_TOKEN;
  if (!token || token.length < 32) return false;
  const supplied = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${token}`;
  return (
    Buffer.byteLength(supplied) === Buffer.byteLength(expected) &&
    timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  );
}
