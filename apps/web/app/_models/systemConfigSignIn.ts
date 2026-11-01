import { cacheTag } from "next/cache";
import { createSupabaseAnonClient } from "@/lib/supabase/createSupabaseAnonClient";
import { getSystemConfig } from "@schornio/aibox-package-database/config/getSystemConfig";
import { trySync } from "@schornio/aibox-package-utils/trySync";
import { z } from "zod/mini";

const signInConfigSchema = z.object({
  password: z._default(
    z.union([z.literal("visible"), z.literal("hidden")]),
    "visible",
  ),
  sso: z._default(
    z.union([z.literal("visible"), z.literal("hidden")]),
    "visible",
  ),
  ssoName: z.optional(z.string()),
});

export async function getSystemConfigSignIn(): Promise<
  z.infer<typeof signInConfigSchema>
> {
  "use cache: private";
  cacheTag("systemConfigSignIn");

  const supabase = createSupabaseAnonClient();
  const signInConfigString = await getSystemConfig("signIn", {
    supabase,
  });

  const { data: parsedSignInConfig } = trySync(
    () => JSON.parse(signInConfigString ?? "") as unknown,
  );
  const { data: welcomeMessageConfig } =
    signInConfigSchema.safeParse(parsedSignInConfig);

  return welcomeMessageConfig ?? { password: "visible", sso: "visible" };
}
