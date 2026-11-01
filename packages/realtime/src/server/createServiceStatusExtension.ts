import type { Extension } from "@hocuspocus/server";
import type { AuthenticationContext } from "./createRealtimeAuthentication.ts";
import {
  getMachines,
  machineReportSchema,
  servicesDocumentName,
} from "../documents/services/_schema.ts";

/** Machines can report their own status, but cannot edit Yjs documents directly. */
export function createServiceStatusExtension(): Extension<AuthenticationContext> {
  return {
    async onStateless({ connection, document, documentName, payload }) {
      const context = connection.context as AuthenticationContext | undefined;
      const id = context?.authorization?.serviceId;
      if (
        !id ||
        documentName !== servicesDocumentName ||
        payload.length > 32_768
      )
        return;
      let data: unknown;
      try {
        data = JSON.parse(payload);
      } catch {
        return;
      }
      const report = machineReportSchema.safeParse(data);
      if (!report.success) return;
      getMachines(document).set(id, {
        ...report.data,
        id,
        receivedAt: new Date().toISOString(),
      });
    },
  };
}
