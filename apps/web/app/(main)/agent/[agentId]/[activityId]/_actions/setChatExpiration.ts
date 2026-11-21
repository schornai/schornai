"use server";

import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { getCurrentUser } from "@schornio/aibox-package-database/user/getCurrentUser";
import { chatExpirationSchema } from "@schornio/aibox-package-database/chat/expirationSchema";
import { getChatExpiration } from "@schornio/aibox-package-database/chat/getChatExpiration";
import { setChatExpiration as save } from "@schornio/aibox-package-database/chat/setChatExpiration";

export const setChatExpiration = serverActionClient
  .inputSchema(chatExpirationSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser({ supabaseAuth: supabase.auth });
    await getChatExpiration(parsedInput, { supabase });
    await save(parsedInput, {
      userId: user.id,
      supabase: createSupabaseServiceRoleClient(),
    });
    revalidatePath(
      `/agent/${parsedInput.agentId}/${parsedInput.activityId}`,
      "layout",
    );
  });
