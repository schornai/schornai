import { Doc } from "yjs";
import { describe, expect, it, vi } from "vitest";
import { database } from "./helpers/supabase";
import { ensureDocument } from "../packages/realtime/src/server/ensureDocument";
import { getAllowedUserIdsByDocumentName } from "../packages/realtime/src/_lib/getAllowedUserIdsByDocumentName";
import { setReindexStates } from "../packages/realtime/src/documents/reindex/setReindexStates";
describe("realtime document access and reindex progress", () => {
  it("uses the atomic document/ACL operation", async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: "document" }),
    } as any;
    await ensureDocument(
      "activity" as any,
      { userIds: ["user"] },
      { supabase },
    );
    expect(supabase.rpc).toHaveBeenCalledWith("ensure_realtime_document", {
      p_document_name: "activity",
      p_user_ids: ["user"],
    });
  });
  it("propagates denied claims without exposing database internals", async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "private database details" },
      }),
    } as any;
    await expect(
      ensureDocument(
        "activity" as any,
        { userIds: ["user", "other"] },
        { supabase },
      ),
    ).rejects.toThrow("DOCUMENT_ACCESS_DENIED");
  });
  it.each([
    null,
    { realtime_document_access: [{ user_id: "user" }, { user_id: "other" }] },
  ])("reads allowed users for %j", async (data) => {
    const { supabase, builders } = database({ realtime_documents: { data } });
    const signal = new AbortController().signal;
    expect(
      await getAllowedUserIdsByDocumentName("activity", {
        supabase,
        abortSignal: signal,
      }),
    ).toEqual(data ? ["user", "other"] : []);
    expect(builders.realtime_documents.abortSignal).toHaveBeenCalledWith(
      signal,
    );
  });
  it("updates progress in place while appending newly discovered files", () => {
    const doc = new Doc();
    setReindexStates(doc, [
      { id: "one", status: "queued" },
      { id: "two", status: "queued" },
    ] as any);
    setReindexStates(doc, [
      { id: "two", status: "success" },
      { id: "three", status: "error" },
    ] as any);
    expect(doc.getArray("state").toArray()).toEqual([
      { id: "one", status: "queued" },
      { id: "two", status: "success" },
      { id: "three", status: "error" },
    ]);
    setReindexStates(doc, []);
    expect(doc.getArray("state").length).toBe(3);
  });
});
