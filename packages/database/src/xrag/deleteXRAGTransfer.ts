import { deletePreparedXRAGTransfer } from "./deletePreparedXRAGTransfer.ts";
import { z } from "zod";
import {
  getXRAGClaims,
  getXRAGUserId,
  type XRAGOptions,
} from "./authentication.ts";
import { requirePlatformAccess } from "../mcp/platformAccess.ts";
import { transferPathSchema } from "./transferSchema.ts";
export const deleteXRAGTransferSchema = z.object({ path: transferPathSchema });
/** Authorize exact ownership before using the privileged Storage client.
 * Removes only the temporary archive, never imported resources/publications. */
export async function deleteXRAGTransfer(
  input: z.infer<typeof deleteXRAGTransferSchema>,
  options: XRAGOptions,
) {
  const { path } = deleteXRAGTransferSchema.parse(input);
  requirePlatformAccess(await getXRAGClaims(options), "admin", "workspace");
  if (path.split("/")[0] !== (await getXRAGUserId(options)))
    throw new Error("NOT_AUTHORIZED");
  await deletePreparedXRAGTransfer(path, {
    supabase: options.supabaseServiceRole,
  });
}
