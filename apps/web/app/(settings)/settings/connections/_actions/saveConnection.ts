"use server";

import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { getConnectionCredentials } from "@schornio/aibox-package-database/connections/getConnectionCredentials";
import { saveConnection as saveConnectionDatabase } from "@schornio/aibox-package-database/connections/saveConnection";
import { connectionInputSchema } from "../connectionInputSchema";

export const saveConnection = serverActionClient
  .inputSchema(connectionInputSchema)
  .action(async ({ parsedInput: input }) => {
    const options = { supabase: await saveCreateSupabaseServiceRoleClient() };
    const current = input.id
      ? await getConnectionCredentials(input.id, options)
      : null;
    if (input.id && !current) throw new Error("CONNECTION_NOT_FOUND");
    if (current && current.kind !== input.kind)
      throw new Error("CONNECTION_KIND_IMMUTABLE");
    const editingOAuth = current?.kind === "oauth";
    if (
      editingOAuth &&
      ((input.clientId !== undefined && input.clientId !== current.client_id) ||
        input.secret)
    )
      throw new Error("OAUTH_CREDENTIALS_IMMUTABLE");
    const clientId =
      input.kind === "oauth" ? (current?.client_id ?? input.clientId) : null;
    const secret = editingOAuth
      ? current.secret
      : input.secret || current?.secret;
    if (!secret?.trim() || (input.kind === "oauth" && !clientId))
      throw new Error("CONNECTION_CREDENTIALS_REQUIRED");
    const id = input.id ?? crypto.randomUUID();
    await saveConnectionDatabase(
      {
        id,
        name: input.name,
        kind: input.kind,
        client_id: clientId ?? null,
        secret,
        market: input.kind === "staan" ? input.market || null : null,
      },
      options,
    );
    revalidatePath("/settings/connections");
    return { id };
  });
