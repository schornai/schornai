import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";
import { publishArtifact } from "@schornio/aibox-database/xrag/publishArtifact";
import { deleteArtifact } from "@schornio/aibox-database/xrag/deleteArtifact";
import { getArtifact } from "@schornio/aibox-database/xrag/getArtifact";
import { ServerRealtimeProvider } from "../../server/ServerRealtimeProvider.ts";
import { addArtifactLog, artifactCatalogDocumentName } from "./_utils.ts";

/** Caller must authorize a global admin. Storage owns bytes/metadata, Yjs delivers CRUD changes. */
export class ArtifactCatalogSession extends ServerRealtimeProvider {
  constructor(
    options: Omit<
      ConstructorParameters<typeof ServerRealtimeProvider>[0],
      "documentName"
    >,
  ) {
    super({ ...options, documentName: artifactCatalogDocumentName });
  }
  async publish(name: string, options: { supabase: SupabaseClient }) {
    await this.waitForSynced({ abortSignal: AbortSignal.timeout(30_000) });
    const id = await publishArtifact(name, options);
    addArtifactLog(this.document, await getArtifact(id, options));
    await this.waitForSynced({ abortSignal: AbortSignal.timeout(30_000) });
    return id;
  }
  async remove(id: string, options: { supabase: SupabaseClient }) {
    await this.waitForSynced({ abortSignal: AbortSignal.timeout(30_000) });
    try {
      addArtifactLog(this.document, await deleteArtifact(id, options));
      await this.waitForSynced({ abortSignal: AbortSignal.timeout(30_000) });
    } catch (error) {
      // A failed purge may already have withdrawn the archive. Broadcast that
      // state so clients can retry cleanup without installing it again.
      const current = await getArtifact(id, options).catch(() => undefined);
      if (current) addArtifactLog(this.document, current);
      throw error;
    }
  }
}
