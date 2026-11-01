import { access } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { getAIModels } from "@schornio/aibox-database/aiModel/getAIModels";
import { createSupabaseClient } from "@schornio/aibox-database/_util/createSupabaseClient";

/** This machine worker is provisioned by the operator with service credentials. */
export async function getInstalledModels() {
  const supabase = createSupabaseClient({
    environmentKeys: { supabaseKey: "SUPABASE_SERVICE_ROLE_KEY" },
  });
  const models = await getAIModels({ supabase });
  const root = process.env.SCHORNAI_HOME ?? join(homedir(), ".aibox");
  const available = await Promise.all(
    models.map(async (model) => {
      if (
        model.type !== "mlx_whisper_v1" ||
        !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(
          model.config.fileSystemIdentifier,
        )
      )
        return [];
      const path = join(
        root,
        "mlx/whisper/models",
        model.config.fileSystemIdentifier,
      );
      try {
        await Promise.all([
          access(join(path, "config.json")),
          access(join(path, "weights.npz")),
        ]);
        return [`transcriber:${model.identifier}`];
      } catch {
        return [];
      }
    }),
  );
  return available.flat();
}
