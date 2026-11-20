"use server";
import { z } from "zod";
import { resourceKindSchema } from "xrag/schema";
import { serverActionClient } from "@/lib/serverActionClient";
import { getXRAGContext } from "@/lib/xrag/getXRAGContext";
import { getAuthorizedResource } from "@schornio/aibox-package-database/xrag/getAuthorizedResource";
import { getResourceIdentity as getIdentity } from "@schornio/aibox-package-database/xrag/getResourceIdentity";
export const getResourceIdentity = serverActionClient
  .inputSchema(z.object({ kind: resourceKindSchema, id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const context = await getXRAGContext({ selection: parsedInput });
    const object = await getAuthorizedResource(
      parsedInput.kind,
      parsedInput.id,
      context,
    );
    return {
      globalId: await getIdentity(
        parsedInput.kind,
        object.id,
        object.workspaceId,
        { supabase: context.supabaseServiceRole, name: object.name },
      ),
    };
  });
