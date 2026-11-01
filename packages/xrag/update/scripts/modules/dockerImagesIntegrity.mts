import type { DockerImageIntegrity } from "./integrity.ts";
import { checkIntegrity } from "./integrity.ts";
import { run } from "./run.mts";

export async function dockerImagesIntegrity(
  dockerBin: string,
  expectedImages: DockerImageIntegrity[],
) {
  const { stdout: imagesOutput } = await run(
    dockerBin,
    ["images", "--format", "{{.Repository}}:{{.Tag}}@{{.Digest}}"],
    {},
  );

  const imageOutput = imagesOutput
    .split("\n")
    .filter((line) => line.trim() !== "");

  const loadedImages: DockerImageIntegrity[] = imageOutput.map((line) => {
    const match = line.match(/^(.+):(.+)@sha256:([0-9a-f]{64})$/);
    if (!match) {
      throw new Error(`Unexpected docker images output line: "${line}"`);
    }
    const [, name, tag, digest] = match;

    if (!name || !tag || !digest) {
      throw new Error(`Could not parse docker images output line: "${line}"`);
    }

    return {
      digest,
      name,
      tag,
      type: "docker-image",
    };
  });

  for (const expectedImage of expectedImages) {
    const loadedImage = loadedImages.find(
      (img) => img.name === expectedImage.name && img.tag === expectedImage.tag,
    );
    if (!loadedImage) {
      throw new Error(
        `Expected docker image "${expectedImage.name}:${expectedImage.tag}" not found among loaded images`,
      );
    }
    checkIntegrity(expectedImage, loadedImage);
  }
}
