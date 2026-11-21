"use server";
import { serverActionClient } from "@/lib/serverActionClient";
import { getXRAGContext } from "@/lib/xrag/getXRAGContext";
import { packageObjectSchema } from "@schornio/aibox-package-database/xrag/packageSchema";
import { getModelExportSource } from "@schornio/aibox-package-database/xrag/getModelExportSource";
import {
  xragResourceDownloadUrl,
  xragModelDownloadUrl,
} from "@/lib/xrag/downloadUrl";
export const exportXRAG = serverActionClient
  .inputSchema(packageObjectSchema)
  .action(async ({ parsedInput }) => {
    const options = await getXRAGContext({ selection: parsedInput });
    if (parsedInput.kind === "model") {
      const source = await getModelExportSource(parsedInput.id, options);
      return {
        url: xragModelDownloadUrl(
          parsedInput.id,
          source.id ?? source.installed.version,
        ),
      };
    }
    return { url: xragResourceDownloadUrl(parsedInput.kind, parsedInput.id) };
  });
