import { z } from "zod";
import type { SupabaseClient } from "../_shared/_types.ts";
import { getXRAGWorkerOptions } from "./getXRAGWorkerOptions.ts";
import { userClaimsSchema } from "../auth/_schemas.ts";
import { transferSourceSchema } from "./transferSchema.ts";
import { prepareXRAGTransfer } from "./prepareXRAGTransfer.ts";

const payloadSchema = z.object({
  userId: z.uuid(),
  claims: userClaimsSchema,
  queuedAt: z.number().int().positive(),
  source: transferSourceSchema,
});

export async function prepareXRAGJob(
  payload: unknown,
  supabase: SupabaseClient,
  signal: AbortSignal,
) {
  const { userId, claims, source, queuedAt } = payloadSchema.parse(payload);
  const options = await getXRAGWorkerOptions(userId, claims, supabase, signal);
  await prepareXRAGTransfer(source, { ...options, queuedAt });
}
