import type { appColorSchema, appIconSchema, imageSchema } from "./_schema.js";
import type { Database } from "./_supabase.js";
import type { SupabaseClient as SupabaseClientCore } from "@supabase/supabase-js";
import type z from "zod";

export type SupabaseDatabase = Database;

export type SupabaseClient = SupabaseClientCore<Database>;

export type SupabaseStorageAPI = ReturnType<SupabaseClient["storage"]["from"]>;

export type SupabaseFileObject = NonNullable<
  Awaited<ReturnType<SupabaseStorageAPI["list"]>>["data"]
>[number];

export type Image = z.infer<typeof imageSchema>;

export type AppIcon = z.infer<typeof appIconSchema>;
export type AppColor = z.infer<typeof appColorSchema>;

export type AppNamedColor = {
  color: AppColor;
  name: string;
};
