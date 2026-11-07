import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import type { Transcriber_new } from "@schornio/aibox-package-database/transcriber/_types";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getAgentsByIds } from "@schornio/aibox-package-database/agent/getAgentsByIds";
import { getCurrentUserConfig } from "@schornio/aibox-package-database/config/getCurrentUserConfig";
import { getDocumentRepositoriesByIds } from "@schornio/aibox-package-database/documentRepositories/getDocumentRepositoriesByIds";
import { getTranscribersByIds } from "@schornio/aibox-package-database/transcriber/getTranscribersByIds";
import { z } from "zod/mini";

const settingFavoritesLegacySchema = z.array(
  z.object({
    id: z.string(),
    type: z.union([z.literal("chatbot"), z.literal("transcriber")]),
  }),
);

import {
  settingFavoritesSchema,
  type SettingFavorites,
} from "@schornio/aibox-package-database/config/favoritesSchema";
export {
  settingFavoritesSchema,
  type SettingFavorites,
} from "@schornio/aibox-package-database/config/favoritesSchema";

const settingFavoritesWithLegacySupportSchema = z.union([
  settingFavoritesSchema,
  settingFavoritesLegacySchema,
]);

function isLegacyFavorites(
  theme: z.infer<typeof settingFavoritesWithLegacySupportSchema>,
): theme is z.infer<typeof settingFavoritesLegacySchema> {
  return !("version" in theme);
}

export const getCurrentUserConfigFavorites = cache(
  async (): Promise<
    SettingFavorites & {
      agents?: Agent[];
      documentRepositories?: DocumentRepository[];
      transcribers?: Transcriber_new[];
    }
  > => {
    const supabase = await createSupabaseServerClient();
    const parsedFavoritesConfig = await getCurrentUserConfig("favorites", {
      supabase,
    });

    const { data: favoritesWithLegacySupportConfig } =
      settingFavoritesWithLegacySupportSchema.safeParse(parsedFavoritesConfig);

    if (!favoritesWithLegacySupportConfig) {
      return {
        favorites: [],
        showInSidebar: true,
        version: "favorites-v2",
      };
    }

    const { favorites, showInSidebar }: SettingFavorites = isLegacyFavorites(
      favoritesWithLegacySupportConfig,
    )
      ? {
          favorites: favoritesWithLegacySupportConfig.map((favorite) => ({
            ...favorite,
            type: favorite.type === "chatbot" ? "agent" : favorite.type,
          })),
          showInSidebar: true,
          version: "favorites-v2",
        }
      : favoritesWithLegacySupportConfig;

    const favoriteIds = favorites?.map((favorite) => favorite.id);

    const [agents, documentRepositories, transcribers] = await Promise.all([
      getAgentsByIds(favoriteIds, { supabase }),
      getDocumentRepositoriesByIds(favoriteIds, { supabase }),
      getTranscribersByIds(favoriteIds, { supabase }),
    ]);

    return {
      agents,
      documentRepositories,
      favorites,
      showInSidebar,
      transcribers,
      version: "favorites-v2",
    };
  },
);
