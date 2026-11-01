import { it, expect } from "vitest";
import { Doc } from "yjs";
import { createServiceStatusExtension } from "../packages/realtime/src/server/createServiceStatusExtension.ts";
import { getMachines } from "../packages/realtime/src/documents/services/_schema.ts";
const id = "00000000-0000-4000-8000-000000000001";
const report = {
  id: "forged-id",
  receivedAt: "2099-01-01T00:00:00Z",
  name: "test",
  platform: "test",
  state: "running",
  roles: [],
  services: [],
  metrics: {
    cpuPercent: 10,
    memory: { used: 1, total: 2 },
    disk: null,
    gpus: [],
    uptimeSeconds: null,
  },
  sync: { state: "idle" },
};
it("accepts validated reports only from scoped machine connections and timestamps them on the server", async () => {
  const doc = new Doc();
  const extension = createServiceStatusExtension();
  const send = (
    authorization: unknown,
    payload: unknown = report,
    documentName = "services",
  ) =>
    extension.onStateless!({
      connection: { context: { authorization } },
      document: doc,
      documentName,
      payload: JSON.stringify(payload),
    } as any);
  try {
    await send({ worker: false });
    await send({ worker: true });
    await send({ serviceId: id }, report, "artifactCatalog");
    await send(
      { serviceId: id },
      { ...report, metrics: { ...report.metrics, cpuPercent: 999 } },
    );
    expect(getMachines(doc).size).toBe(0);
    await send({ serviceId: id });
    expect(getMachines(doc).size).toBe(1);
    const machine = getMachines(doc).get(id)!;
    expect(machine.id).toBe(id);
    expect(machine.receivedAt).not.toBe(report.receivedAt);
    expect(machine.metrics.cpuPercent).toBe(10);
  } finally {
    doc.destroy();
  }
});
