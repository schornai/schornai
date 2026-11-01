import { cacheTag } from "next/cache";
import { createSupabaseAnonClient } from "@/lib/supabase/createSupabaseAnonClient";
import { getSystemConfig } from "@schornio/aibox-package-database/config/getSystemConfig";
import { tryAsync } from "@schornio/aibox-package-utils/tryAsync";
import { trySync } from "@schornio/aibox-package-utils/trySync";
import { z } from "zod/mini";

const welcomeMessageSchema = z.object({
  localized: z.record(z.string(), z.string()),
});

export async function getSystemConfigWelcomeMessage() {
  "use cache: private";
  cacheTag("systemConfigWelcomeMessage");

  const supabase = createSupabaseAnonClient();
  const { data: welcomeMessageConfigString } = await tryAsync(() =>
    getSystemConfig("welcomeMessage", { supabase }),
  );

  const { data: parsedWelcomeMessageConfig } = trySync(
    () => JSON.parse(welcomeMessageConfigString ?? "") as unknown,
  );
  const { data: welcomeMessageConfig } = welcomeMessageSchema.safeParse(
    parsedWelcomeMessageConfig,
  );

  return welcomeMessageConfig?.localized;
}
