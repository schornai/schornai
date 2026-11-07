import { z } from "zod/mini";
export const settingFavoritesSchema = z.object({
  favorites: z.array(
    z.object({
      id: z.string(),
      type: z.union([
        z.literal("agent"),
        z.literal("transcriber"),
        z.literal("documentRepository"),
        z.literal("workspace"),
      ]),
    }),
  ),
  showInSidebar: z._default(z.boolean(), true),
  version: z.literal("favorites-v2"),
});

export type SettingFavorites = z.infer<typeof settingFavoritesSchema>;
