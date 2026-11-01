import { readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { run } from "./run.mts";

export type FileIntegrity = {
  hash: string;
  name: string;
  type: "file";
};

export type DirectoryIntegrity = {
  content: FileOrDirectoryIntegrity[];
  name: string;
  type: "directory";
};

export type FileOrDirectoryIntegrity = FileIntegrity | DirectoryIntegrity;

export type DockerImageIntegrity = {
  digest: string;
  name: string;
  tag: string;
  type: "docker-image";
};

export type BinVersionIntegrity = {
  name: string;
  version: string;
  fileIntegrity: FileIntegrity;
  type: "bin-version";
};

export type Integrity =
  FileOrDirectoryIntegrity | DockerImageIntegrity | BinVersionIntegrity;

export type UpdateIntegrity = {
  apps: DirectoryIntegrity;
  bin: DirectoryIntegrity;
  scripts: DirectoryIntegrity;
  // pythonInterface: DirectoryIntegrity;
  // pythonPackages: DirectoryIntegrity;
  // pythonRequirements: FileIntegrity;
  dockerCompose: FileIntegrity;
  containerImages: DockerImageIntegrity[];
  containerVolumes: DirectoryIntegrity;
};

function getFileHash(path: string) {
  return new Promise<string>((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("error", (err) => reject(err));
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

export async function getFileSystemIntegrity(
  path: string,
): Promise<FileOrDirectoryIntegrity> {
  const stats = await stat(path);
  if (stats.isFile()) {
    return {
      hash: await getFileHash(path),
      name: path.split("/").pop() ?? "@@INVALID_FILE_NAME@@",
      type: "file",
    };
  } else if (stats.isDirectory()) {
    const contentNames = await readdir(path);

    const content: FileOrDirectoryIntegrity[] = [];

    for (const contentName of contentNames) {
      const contentPath = `${path}/${contentName}`;
      const contentDescription = await getFileSystemIntegrity(contentPath);
      content.push(contentDescription);
    }

    return {
      content,
      name: path.split("/").pop() ?? "@@INVALID_DIRECTORY_NAME@@",
      type: "directory",
    };
  }

  throw new Error(
    `Cannot get integrity of "${path}" because it is of unsupported type`,
  );
}

export async function getDirectoryIntegrity(
  path: string,
): Promise<DirectoryIntegrity> {
  const description = await getFileSystemIntegrity(path);

  if (description.type === "file") {
    throw new Error(
      `Cannot get directory integrity for "${path}" because it is a file`,
    );
  }

  return description;
}

export async function getFileIntegrity(path: string): Promise<FileIntegrity> {
  const description = await getFileSystemIntegrity(path);

  if (description.type === "directory") {
    throw new Error(
      `Cannot get file integrity for "${path}" because it is a directory`,
    );
  }

  return description;
}

export function getDockerImageIntegrityFromPullOutput(
  imageName: string,
  imageTag: string,
  pullOutput: string,
): DockerImageIntegrity {
  const digest = pullOutput.match(/Digest: sha256:([0-9a-f]{64})/)?.[1];
  if (!digest) {
    throw new Error(
      `Could not extract digest or image ID from docker pull output for image "${imageName}:${imageTag}"`,
    );
  }

  return {
    digest,
    name: imageName,
    tag: imageTag,
    type: "docker-image",
  };
}

export async function getDockerImageIntegrity(
  imageName: string,
  imageTag: string,
): Promise<DockerImageIntegrity> {
  const { stdout } = await run("docker", [
    "image",
    "inspect",
    `${imageName}:${imageTag}`,
  ]);
  const inspectOutput = JSON.parse(stdout) as {
    RepoDigests?: string[];
    Id?: string;
  }[];
  const digest = (
    inspectOutput[0]?.RepoDigests?.[0] ?? inspectOutput[0]?.Id
  )?.match(/sha256:([0-9a-f]{64})/)?.[1];

  if (!digest) {
    throw new Error(
      `Could not extract digest or image ID from docker build output for image "${imageName}:${imageTag}"`,
    );
  }
  return {
    digest,
    name: imageName,
    tag: imageTag,
    type: "docker-image",
  };
}

export function checkIntegrity(
  expected: Integrity,
  actual: Integrity,
  path = "",
): void {
  if (expected.type !== actual.type) {
    throw new Error(
      `Expected integrity of type "${expected.type}" but got type "${actual.type}" for "${expected.name}"`,
    );
  }

  if (expected.name !== actual.name) {
    throw new Error(
      `Expected integrity with name "${expected.name}" but got name "${actual.name}"`,
    );
  }

  if (expected.type === "file" && actual.type === "file") {
    if (expected.hash !== actual.hash) {
      throw new Error(
        `Expected file integrity with hash "${expected.hash}" but got hash "${actual.hash}" for file "${expected.name}"`,
      );
    }
  } else if (expected.type === "directory" && actual.type === "directory") {
    if (expected.content.length > actual.content.length) {
      throw new Error(
        `Expected directory integrity with ${expected.content.length} content items but got ${actual.content.length} content items for directory "${expected.name}"`,
      );
    }

    for (const expectedContent of expected.content) {
      const actualContent = actual.content.find(
        (content) => content.name === expectedContent.name,
      );

      if (!actualContent) {
        throw new Error(
          `Expected directory integrity to contain content with name "${expectedContent.name}" but it was not found in directory "${expected.name}"`,
        );
      }

      checkIntegrity(
        expectedContent,
        actualContent,
        `${path}/${expected.name}`,
      );
    }
  } else if (
    expected.type === "docker-image" &&
    actual.type === "docker-image"
  ) {
    if (expected.digest !== actual.digest) {
      throw new Error(
        `Expected docker image integrity with digest "${expected.digest}" but got digest "${actual.digest}" for image "${expected.name}:${expected.tag}"`,
      );
    }
  } else if (expected.type === "bin-version" && actual.type === "bin-version") {
    if (expected.version !== actual.version) {
      throw new Error(
        `Expected bin version integrity with version "${expected.version}" but got version "${actual.version}" for bin "${expected.name}"`,
      );
    }
    checkIntegrity(
      expected.fileIntegrity,
      actual.fileIntegrity,
      `${path}/${expected.name}`,
    );
  } else {
    throw new Error(
      `Unsupported integrity types for "${expected.name}": expected type "${expected.type}", actual type "${actual.type}"`,
    );
  }

  console.log(`Integrity check passed for "${path}/${expected.name}"`);
}
