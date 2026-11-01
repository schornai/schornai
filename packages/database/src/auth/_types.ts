import type { userClaimsSchema } from "./_schemas.ts";
import type z from "zod/mini";

export type UserClaims = z.infer<typeof userClaimsSchema>;
