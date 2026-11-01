import * as readline from "node:readline/promises";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { finished, pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import { createWriteStream } from "node:fs";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

type OllamaBlob = {
  mediaType: string;
  digest: string;
  size: number;
};

type OllamaManifest = {
  schemaVersion: number;
  mediaType: string;
  config: OllamaBlob;
  layers: OllamaBlob[];
};

async function collectMeta() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ollamaInput = await rl.question("Model name: ");
  const [modelName, modelTagInput] = ollamaInput
    .replace("ollama run ", "")
    .replace("ollama pull ", "")
    .split(":");

  if (!modelName) {
    throw new Error("Invalid model name");
  }

  const name = await rl.question("Name: ");

  const includeDescriptionInput = await rl.question(
    "Include description (y/n): ",
  );
  const includeDescription = includeDescriptionInput === "y";

  const imageUrlInput = await rl.question("Image URL (optional): ");
  const imageUrl =
    imageUrlInput.trim().length > 0 ? imageUrlInput.trim() : undefined;

  const modelTag = modelTagInput ?? "latest";

  const defaultModelIndentifier = `ai.schorn__ollama__${modelName}:${modelTag}`;
  const identifierInput = await rl.question(
    `Custom intentifier (leave empty for default "${defaultModelIndentifier}")`,
  );
  const identifier =
    identifierInput.trim().length > 0
      ? identifierInput.trim()
      : defaultModelIndentifier;

  const modelTypeInput = await rl.question("Model type (1-llm, 2-embedding): ");

  switch (modelTypeInput.trim()) {
    case "1":
    case "llm": {
      const contextSizeInput = await rl.question("Context size (in k): ");
      const contextSize = Number(contextSizeInput) * 1000;

      const featureThinkingInput = await rl.question(
        "Feature thinking (y/n): ",
      );
      const featureThinking = featureThinkingInput === "y";

      const featureToolsInput = await rl.question("Feature tools (y/n): ");
      const featureTools = featureToolsInput === "y";

      const featureVisionInput = await rl.question("Feature vision (y/n): ");
      const featureVision = featureVisionInput === "y";

      return {
        contextSize,
        featureThinking,
        featureTools,
        featureVision,
        identifier,
        imageUrl,
        includeDescription,
        modelName,
        modelTag,
        name,
        type: "ollama_llm_v1",
      };
    }
    case "2":
    case "embedding": {
      const contextSizeInput = await rl.question("Context size (in k): ");
      const contextSize = Number(contextSizeInput) * 1000;

      const vectorSizeInput = await rl.question(
        "Embedding vector size (1-384, 2-768, 3-1024, 4-1536)",
      );

      switch (vectorSizeInput.trim()) {
        case "1":
        case "384":
          return {
            contextSize,
            embeddingVectorSize: 384,
            identifier,
            imageUrl,
            includeDescription,
            modelName,
            modelTag,
            name,
            type: "ollama_embedding_v1",
          };
        case "2":
        case "768":
          return {
            contextSize,
            embeddingVectorSize: 768,
            identifier,
            imageUrl,
            includeDescription,
            modelName,
            modelTag,
            name,
            type: "ollama_embedding_v1",
          };
        case "3":
        case "1024":
          return {
            contextSize,
            embeddingVectorSize: 1024,
            identifier,
            imageUrl,
            includeDescription,
            modelName,
            modelTag,
            name,
            type: "ollama_embedding_v1",
          };
        case "4":
        case "1536":
          return {
            contextSize,
            embeddingVectorSize: 1536,
            identifier,
            imageUrl,
            includeDescription,
            modelName,
            modelTag,
            name,
            type: "ollama_embedding_v1",
          };
      }
    }
  }
  throw new Error("Invalid input");
}

function getLength(chunk: unknown) {
  if (
    typeof chunk === "object" &&
    chunk &&
    "length" in chunk &&
    typeof chunk.length === "number"
  ) {
    return chunk.length;
  }

  return 0;
}

async function downloadBlob(
  modelPath: string,
  blobsDir: string,
  blob: OllamaBlob,
) {
  console.time(`${blob.digest} downloaded`);
  const fileName = `${blobsDir}/${blob.digest.replaceAll(":", "-")}`;

  let downloadedBytes = 0;
  let currentPercentage = 0;
  const progress = new Transform({
    transform(chunk, _, callback) {
      const bytes = getLength(chunk);
      downloadedBytes += bytes;

      const percentage = Math.floor((downloadedBytes / blob.size) * 100);
      if (currentPercentage !== percentage) {
        console.log(
          `Download ${blob.digest} ${percentage.toString().padStart(3)}%`,
        );
        currentPercentage = percentage;
      }

      callback(null, chunk);
    },
  });

  const blobResponse = await fetch(
    `https://registry.ollama.ai/v2/${modelPath}/blobs/${blob.digest}`,
  );

  if (!blobResponse.body) {
    throw new Error("Blob response has no body");
  }

  await pipeline(blobResponse.body, progress, createWriteStream(fileName));

  console.timeEnd(`${blob.digest} downloaded`);
}

console.log("Create Ollama Model XRAG");
console.time("Ollama Model XRAG finished");

const tmpDir = `${import.meta.dirname}/.tmp/${randomUUID()}`;
const blobsDir = `${tmpDir}/blobs`;

await mkdir(tmpDir, { recursive: true });
await mkdir(blobsDir, { recursive: true });

try {
  const { modelName, modelTag, imageUrl, includeDescription, ...meta } =
    await collectMeta();

  const xrag = {
    meta,
    modelName,
    modelTag,
    xrag_type: "ollamaModel",
    xrag_version: 1,
  };

  await writeFile(`${tmpDir}/xrag.json`, JSON.stringify(xrag));

  if (imageUrl) {
    const imageResponse = await fetch(imageUrl);
    const contentType = imageResponse.headers.get("Content-Type");
    const imageFileName = (() => {
      switch (contentType) {
        case "image/png":
          return "image.png";
        case "image/jpg":
        case "image/jpeg":
          return "image.jpg";
        case "image/gif":
          return "image.gif";
        case "image/webp":
          return "image.webp";
        case "image/svg+xml":
          return "image.svg";
      }
      throw new Error(`Invalid image type ${contentType}`);
    })();

    if (!imageResponse.body) {
      throw new Error("Image response has no body");
    }

    await pipeline(
      imageResponse.body,
      createWriteStream(`${tmpDir}/${imageFileName}`),
    );
  }

  if (includeDescription) {
    await cp(
      `${import.meta.dirname}/description.md`,
      `${tmpDir}/description.md`,
    );
  }

  const modelPath = modelName.includes("/")
    ? modelName
    : `library/${modelName}`;

  const manifestResponse = await fetch(
    `https://registry.ollama.ai/v2/${modelPath}/manifests/${
      modelTag ?? "latest"
    }`,
  );
  const manifestText = await manifestResponse.text();
  await writeFile(`${tmpDir}/manifest.json`, manifestText);

  const manifest = JSON.parse(manifestText) as OllamaManifest;

  await downloadBlob(modelPath, blobsDir, manifest.config);

  for (const layer of manifest.layers) {
    await downloadBlob(modelPath, blobsDir, layer);
  }

  const tarProcess = spawn("tar", [
    "-cf",
    `${import.meta.dirname}/model.xrag.tar`,
    "-C",
    tmpDir,
    ".",
  ]);
  await finished(tarProcess.stdout);
} catch (error) {
  console.error(error);
} finally {
  await rm(tmpDir, { recursive: true });
  console.timeEnd("Ollama Model XRAG finished");
}

process.exit();
