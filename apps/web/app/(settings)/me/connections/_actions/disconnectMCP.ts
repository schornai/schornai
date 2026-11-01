"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { deleteMCPOAuthConnection } from "@schornio/aibox-package-database/mcp/deleteMCPOAuthConnection";

export const disconnectMCP = serverActionClient
  .inputSchema(z.object({ serverUrl: z.url() }))
  .action(async ({ parsedInput: { serverUrl } }) => {
    const {
      data: { user },
    } = await (await createSupabaseServerClient()).auth.getUser();
    if (!user) throw new Error("NOT_AUTHORIZED");
    await deleteMCPOAuthConnection(user.id, serverUrl, {
      supabase: createSupabaseServiceRoleClient(),
    });
    revalidatePath("/me/connections");
  });
