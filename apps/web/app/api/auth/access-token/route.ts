import type { AccessTokenWebhookBody } from "@schornio/aibox-package-database/user/_types";
import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { z } from "zod";
import { buildAccessToken } from "@schornio/aibox-package-database/user/buildAccessToken";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";

const bodySchema = z
  .looseObject({
    user_id: z.uuid(),
    claims: z.looseObject({ sub: z.uuid() }),
  })
  .refine((body) => body.user_id === body.claims.sub);
const MAX_BODY_BYTES = 256 * 1024;

export async function POST(request: Request) {
  // Supabase HTTP Auth hooks use Standard Webhooks signatures, not user JWTs.
  const secret = process.env.SUPABASE_AUTH_HOOK_SECRET?.replace(/^v1,/, "");
  if (
    !secret ||
    !/^whsec_[A-Za-z0-9+/]+={0,2}$/.test(secret) ||
    Buffer.from(secret.slice(6), "base64").length < 32
  ) {
    return new Response(null, { status: 503 });
  }
  if (!request.headers.get("webhook-signature")) {
    return new Response(null, { status: 401 });
  }

  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return new Response(null, { status: 413 });
    }
    chunks.push(value);
  }

  let body: unknown;
  try {
    body = new Webhook(secret).verify(
      Buffer.concat(chunks),
      Object.fromEntries(request.headers),
    );
  } catch {
    return new Response(null, { status: 401 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return new Response(null, { status: 400 });

  try {
    const accessToken = parsed.data as AccessTokenWebhookBody;
    const organizationRoles = await buildAccessToken(accessToken, {
      supabaseServiceRole: createSupabaseServiceRoleClient(),
    });
    accessToken.claims.organization_roles = organizationRoles;
    return NextResponse.json(accessToken, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return new Response(null, { status: 500 });
  }
}
