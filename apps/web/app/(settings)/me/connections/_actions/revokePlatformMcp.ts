"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { getCurrentUser } from "@schornio/aibox-package-database/user/getCurrentUser";
import { revokeUserGrant } from "@schornio/aibox-package-database/platformMcp/revokeUserGrant";

export const revokePlatformMcp = serverActionClient
  .inputSchema(z.object({ grantId: z.uuid() }))
  .action(async ({ parsedInput: { grantId } }) => {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser({ supabaseAuth: supabase.auth });
    await revokeUserGrant(user.id, grantId, {
      supabase: createSupabaseServiceRoleClient(),
    });
    revalidatePath("/me/connections");
  });
