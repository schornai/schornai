import { describe, expect, it } from "vitest";
import {
  includesPlatformAccess,
  platformAccessLevels,
  platformAccessPath,
  requirePlatformAccess,
} from "../packages/database/src/mcp/platformAccess.ts";

describe("platform access", () => {
  it("exposes cumulative levels at the four public paths", () => {
    expect(platformAccessLevels.map(platformAccessPath)).toEqual([
      "/mcp",
      "/mcp/editor",
      "/mcp/workspace",
      "/mcp/admin",
    ]);
    for (const [i, granted] of platformAccessLevels.entries()) {
      for (const [j, required] of platformAccessLevels.entries()) {
        expect(includesPlatformAccess(granted, required)).toBe(i >= j);
      }
    }
  });

  it("applies the consent ceiling even to global administrators", () => {
    expect(() => requirePlatformAccess("admin", "user", "editor", "a")).toThrow(
      "NOT_AUTHORIZED",
    );
    expect(() =>
      requirePlatformAccess("admin", "admin", "workspace", "a"),
    ).not.toThrow();
  });

  it("checks the target workspace instead of the user's strongest role", () => {
    const claims = [
      { organization_id: "a", role: "workspace-admin" },
      { organization_id: "b", role: "user" },
    ] as const;
    expect(() =>
      requirePlatformAccess([...claims], "workspace", "editor", "a"),
    ).not.toThrow();
    expect(() =>
      requirePlatformAccess([...claims], "workspace", "editor", "b"),
    ).toThrow("NOT_AUTHORIZED");
    expect(() => requirePlatformAccess([...claims], "admin", "admin")).toThrow(
      "NOT_AUTHORIZED",
    );
    expect(() =>
      requirePlatformAccess([...claims], "user", "user", "missing"),
    ).toThrow("NOT_AUTHORIZED");
  });

  it("does not give an unassigned user workspace access", () => {
    expect(() => requirePlatformAccess([], "admin", "user")).toThrow(
      "NOT_AUTHORIZED",
    );
  });
});

import { limitPlatformClaims } from "../packages/database/src/mcp/platformAccess.ts";
it("limits delegated chat permissions to the tool's ceiling without adding memberships", () => {
  expect(limitPlatformClaims("admin", "user", ["a", "b"])).toEqual([
    { organization_id: "a", role: "user" },
    { organization_id: "b", role: "user" },
  ]);
  expect(
    limitPlatformClaims(
      [
        { organization_id: "a", role: "workspace-admin" },
        { organization_id: "b", role: "user" },
      ],
      "editor",
    ),
  ).toEqual([
    { organization_id: "a", role: "editor" },
    { organization_id: "b", role: "user" },
  ]);
});
