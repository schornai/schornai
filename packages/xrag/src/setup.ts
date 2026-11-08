import { xragSchemaSetup, type Artifact } from "./schema.ts";

export function compareSetupReleases(
  a: Pick<Artifact, "id" | "createdAt">,
  b: Pick<Artifact, "id" | "createdAt">,
) {
  return (
    Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
    a.id.localeCompare(b.id)
  );
}

export function setupMatches(
  artifact: Artifact,
  platform: string,
  arch: string,
) {
  const parsed = xragSchemaSetup.safeParse(artifact.xrag);
  return (
    parsed.success &&
    (!parsed.data.platform || parsed.data.platform === platform) &&
    (!parsed.data.arch || parsed.data.arch === arch)
  );
}

/** Include deletion tombstones: withdrawing a release must not cause a downgrade. */
export function latestSetupFor(
  artifacts: Artifact[],
  platform: string,
  arch: string,
) {
  return artifacts
    .filter((artifact) => setupMatches(artifact, platform, arch))
    .toSorted((a, b) => compareSetupReleases(b, a))[0];
}

export function currentSetupIds(artifacts: Artifact[]) {
  return new Set(
    ["darwin", "linux"].flatMap((platform) =>
      ["arm64", "x64"].flatMap((arch) => {
        const latest = latestSetupFor(artifacts, platform, arch);
        return latest ? [latest.id] : [];
      }),
    ),
  );
}
