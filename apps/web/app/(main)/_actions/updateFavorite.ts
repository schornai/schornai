"use server";

import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { setCurrentUserConfig } from "@schornio/aibox-package-database/config/setCurrentUserConfig";
import { settingFavoritesSchema } from "../../_models/currentUserConfigFavorites";
import { z } from "zod/mini";

export const updateFavorite = serverActionClient
  .inputSchema(z.partial(settingFavoritesSchema))
  .action(async ({ parsedInput }) => {
    const supabase = await createSupabaseServerClient();
    await setCurrentUserConfig("favorites", parsedInput, { supabase });
    revalidatePath("/", "layout");
  });
