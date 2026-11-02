import { createInterface } from "node:readline/promises";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@schornio/aibox-package-database/_shared/_supabase";
import { createInitialAdminWithResetKey } from "@schornio/aibox-package-database/user/createInitialAdminWithResetKey";
import { hasUsers } from "@schornio/aibox-package-database/user/hasUsers";
import { z } from "zod";
import type { Context } from "./config.ts";
import { connectionEnvironment } from "./environment.ts";
import { initialAdminMessages } from "./initialAdminMessages.ts";

export function initialAdminCommand(configPath: string) {
  return `npx schornai service setup-admin --config '${configPath.replaceAll("'", "'\\''")}'`;
}

/** Runs only in the operator's terminal, never in the daemon or its logs. */
export async function setupInitialAdmin(context: Context) {
  const messages = initialAdminMessages();
  const retry = initialAdminCommand(context.configPath);
  // A reset key must not end up in redirected service/CI logs.
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.log(messages.skipped, retry);
    return;
  }
  const environment = connectionEnvironment(
    context,
    context.environment,
    "host",
  );
  const url = environment.SUPABASE_URL;
  const secret = environment.SUPABASE_SECRET_KEY;
  const site = z.url().safeParse(context.environment.SITE_URL);
  if (
    !context.config.services.includes("core") ||
    !url ||
    !secret ||
    !site.success
  )
    throw new Error(messages.configuration);
  const resetUrl = new URL("/signin/reset", site.data);
  if (
    !["http:", "https:"].includes(resetUrl.protocol) ||
    resetUrl.username ||
    resetUrl.password
  )
    throw new Error(messages.configuration);

  const supabaseServiceRole = createClient<Database>(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: AbortSignal.any([
            ...(init?.signal ? [init.signal] : []),
            AbortSignal.timeout(30_000),
          ]),
        }),
    },
  });
  const options = { supabaseServiceRole };
  try {
    if (await hasUsers(options)) {
      console.log(messages.existing);
      return;
    }
    const readline = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const controller = new AbortController();
    const cancel = () => controller.abort();
    readline.once("close", cancel);
    readline.once("SIGINT", cancel);
    let email: string | undefined;
    try {
      while (!controller.signal.aborted) {
        const answer = (
          await readline.question(messages.prompt, {
            signal: controller.signal,
          })
        ).trim();
        if (!answer) break;
        const parsed = z.email().safeParse(answer);
        if (parsed.success) {
          email = parsed.data;
          break;
        }
        console.log(messages.invalidEmail);
      }
    } catch (error) {
      if (!controller.signal.aborted) throw error;
    } finally {
      readline.close();
    }
    if (!email) {
      console.log(messages.skipped, retry);
      return;
    }
    const { passwordResetKey } = await createInitialAdminWithResetKey(
      { email },
      options,
    );
    console.log(messages.created);
    console.log(resetUrl.href);
    console.log(messages.email, email);
    console.log(messages.key, passwordResetKey);
    console.log(messages.instructions);
  } catch (error) {
    if (error instanceof Error && error.message === "INITIAL_ADMIN_EXISTS") {
      console.log(messages.existing);
      return;
    }
    throw new Error(
      error instanceof Error && error.message === "CREATE_USER_CLEANUP_FAILED"
        ? messages.cleanupFailed
        : `${messages.failed}\n${retry}`,
    );
  }
}
