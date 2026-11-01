import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  symlinkSync,
  readlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { dockerLoadImages } from "../packages/xrag/update/scripts/modules/dockerLoadImages.mts";

const root = new URL("../packages/xrag/update/", import.meta.url);
const compose = parse(
  readFileSync(
    new URL("container/supabase/overrides.yml", root),
    "utf8",
  ).replaceAll("!override", ""),
);

describe("box startup after image upgrades", () => {
  it("fills missing defaults repeatedly without replacing keys or custom settings", () => {
    const dir = mkdtempSync(join(tmpdir(), "aibox-config-"));
    try {
      const defaults = join(dir, "defaults");
      const config = join(dir, "config");
      const bin = join(dir, "bin");
      mkdirSync(join(defaults, "conf.d"), { recursive: true });
      mkdirSync(config);
      mkdirSync(join(config, "conf.d"));
      mkdirSync(bin);
      writeFileSync(
        join(defaults, "conf.d", "pg_net.conf"),
        "pg_net.database_name = 'postgres'\n",
      );
      writeFileSync(join(defaults, "supautils.conf"), "new default");
      writeFileSync(join(config, "supautils.conf"), "operator override");
      writeFileSync(
        join(config, "conf.d", "operator.conf"),
        "keep nested setting",
      );
      writeFileSync(join(defaults, "linked.conf"), "new linked default");
      writeFileSync(join(defaults, "dangling.conf"), "new dangling default");
      symlinkSync("supautils.conf", join(config, "linked.conf"));
      symlinkSync("operator-managed.conf", join(config, "dangling.conf"));
      writeFileSync(join(config, "pgsodium_root.key"), "existing-private-key", {
        mode: 0o600,
      });
      writeFileSync(
        join(bin, "chown"),
        '#!/bin/sh\nprintf "%s\\n" "$@" > "$CHOWN_ARGS"\n',
        { mode: 0o755 },
      );
      const source = readFileSync(
        new URL("container/volumes/db/prepare-config.sh", root),
        "utf8",
      )
        .replaceAll("/etc/postgresql-custom", defaults)
        .replaceAll("/config", config);
      for (let pass = 0; pass < 2; pass++) {
        execFileSync("sh", ["-c", source], {
          env: {
            ...process.env,
            PATH: `${bin}:${process.env.PATH}`,
            CHOWN_ARGS: join(dir, "chown"),
          },
        });
        expect(readFileSync(join(config, "pgsodium_root.key"), "utf8")).toBe(
          "existing-private-key",
        );
        expect(readFileSync(join(config, "supautils.conf"), "utf8")).toBe(
          "operator override",
        );
        expect(
          readFileSync(join(config, "conf.d", "operator.conf"), "utf8"),
        ).toBe("keep nested setting");
        expect(readlinkSync(join(config, "linked.conf"))).toBe(
          "supautils.conf",
        );
        expect(readlinkSync(join(config, "dangling.conf"))).toBe(
          "operator-managed.conf",
        );
        expect(
          readFileSync(join(config, "conf.d", "pg_net.conf"), "utf8"),
        ).toContain("postgres");
        expect(readFileSync(join(dir, "chown"), "utf8")).toBe(
          `-R\npostgres:postgres\n${config}\n`,
        );
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("waits for config preparation and explicitly starts Kong", () => {
    expect(compose.services.db.depends_on["db-config-init"].condition).toBe(
      "service_completed_successfully",
    );
    expect(compose.services["db-config-init"].image).toBe(
      compose.services.db.image,
    );
    expect(compose.services["api-gw"].command).toEqual([
      "kong",
      "docker-start",
    ]);
  });

  it("keeps the signed hook on Auth loopback without publishing a relay port", () => {
    expect(
      compose.services.auth.environment.GOTRUE_HOOK_CUSTOM_ACCESS_TOKEN_URI,
    ).toBe("http://127.0.0.1:9998/api/auth/access-token");
    expect(
      compose.services.auth.environment.GOTRUE_HOOK_CUSTOM_ACCESS_TOKEN_SECRETS,
    ).toContain("SUPABASE_AUTH_HOOK_SECRET:?");
    expect(compose.services["auth-hook"].network_mode).toBe("service:auth");
    expect(compose.services["auth-hook"].ports).toBeUndefined();
    const config = readFileSync(
      new URL("container/volumes/api/auth-hook.conf", root),
      "utf8",
    );
    expect(config).toContain("listen 127.0.0.1:9998;");
    expect(config).toContain("location = /api/auth/access-token");
    expect(config).toContain("location / { return 404; }");
  });

  it("loads image archives without importing macOS metadata, directories or symlinks", async () => {
    const dir = mkdtempSync(join(tmpdir(), "aibox-image-import-"));
    try {
      const images = join(dir, "images");
      mkdirSync(images);
      writeFileSync(join(images, "image.tar"), "image");
      writeFileSync(join(images, "._image.tar"), "AppleDouble metadata");
      writeFileSync(join(images, "notes.txt"), "not an image");
      mkdirSync(join(images, "directory.tar"));
      symlinkSync("image.tar", join(images, "link.tar"));
      const docker = join(dir, "docker");
      writeFileSync(
        docker,
        '#!/bin/sh\nprintf "%s\\n" "$@" >> "$(dirname "$0")/arguments"\n',
        { mode: 0o755 },
      );
      await dockerLoadImages(images, docker);
      expect(readFileSync(join(dir, "arguments"), "utf8")).toBe(
        `load\n--input\n${join(images, "image.tar")}\n`,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
