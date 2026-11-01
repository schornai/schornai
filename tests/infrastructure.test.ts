import fs from "node:fs";
import { expect, it } from "vitest";
const template = fs.readFileSync(
  new URL("../apps/proxy/nginx.conf.template", import.meta.url),
  "utf8",
);
function location(route: string) {
  return new RegExp(
    `location ${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{([^}]+)\\}`,
    "s",
  ).exec(
    template
      .replaceAll("${WEB_ENV_URL}", "http://web:3003")
      .replaceAll("${REALTIME_ENV_URL}", "http://realtime:9000")
      .replaceAll("${SUPABASE_ENV_HOST}", "http://supabase:54321"),
  )?.[1];
}
it("routes browser pages, realtime and authentication to their configured upstreams", () => {
  expect(location("/")).toContain("proxy_pass http://web:3003");
  expect(location("/v2/realtime")).toContain("proxy_pass http://realtime:9000");
  for (const route of ["/auth", "/sso"])
    expect(location(route)).toContain("proxy_pass http://supabase:54321");
});
it.each(["/v2/realtime", "/_next/hmr"])(
  "supports long-lived websocket upgrades on %s",
  (route) => {
    const block = location(route);
    expect(block).toContain("proxy_set_header Upgrade $http_upgrade");
    expect(block).toContain('proxy_set_header Connection "upgrade"');
    expect(block).toContain("proxy_read_timeout 3600s");
    expect(template).toContain("proxy_http_version 1.1");
  },
);
it("starts Tika on the port used by the application extraction client", () => {
  const pkg = JSON.parse(
    fs.readFileSync(
      new URL("../apps/document-extractor/package.json", import.meta.url),
      "utf8",
    ),
  );
  expect(pkg.scripts.dev).toContain("--publish 127.0.0.1:9998:9998");
  expect(pkg.scripts.dev).toContain("apache/tika:");
});

it.each(["/auth", "/sso"])(
  "uses the Supabase upstream host and verifies TLS when proxying %s to Cloud",
  (route) => {
    expect(location(route)).toContain("proxy_set_header Host $proxy_host");
    expect(location(route)).toContain("proxy_ssl_server_name on");
    expect(location(route)).toContain("proxy_ssl_verify on");
  },
);
