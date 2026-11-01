import { expect, it, vi } from "vitest";
import { updateAIModelMetadata } from "../packages/database/src/aiModel/updateAIModelMetadata";
import { deleteAIModel } from "../packages/database/src/aiModel/deleteAIModel";
function client(result = { data: { id: "model" }, error: null } as any) {
  const single = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ single });
  const eq = vi.fn().mockReturnValue({ select });
  const update = vi.fn().mockReturnValue({ eq });
  const remove = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ update, delete: remove });
  return { supabase: { from } as any, from, update, remove, eq };
}
it("updates display metadata without changing model configuration or identity", async () => {
  const c = client();
  await updateAIModelMetadata(
    { id: "model", name: "Display", description: "## Documentation" },
    c,
  );
  expect(c.from).toHaveBeenCalledWith("ai_models");
  expect(c.update).toHaveBeenCalledWith({
    name: "Display",
    description: "## Documentation",
  });
  expect(c.eq).toHaveBeenCalledWith("id", "model");
});
it("clears documentation without affecting the name", async () => {
  const c = client();
  await updateAIModelMetadata(
    { id: "model", name: "Display", description: "" },
    c,
  );
  expect(c.update).toHaveBeenCalledWith({ name: "Display", description: null });
});
it("deletes only the requested registry entry", async () => {
  const c = client();
  await deleteAIModel("model", c);
  expect(c.from).toHaveBeenCalledExactlyOnceWith("ai_models");
  expect(c.remove).toHaveBeenCalledOnce();
  expect(c.eq).toHaveBeenCalledWith("id", "model");
});
it("reports missing rows and hides upstream errors", async () => {
  const c = client({ data: null, error: { message: "private" } });
  await expect(deleteAIModel("missing", c)).rejects.toThrow(
    /^MODEL_DELETE_FAILED$/,
  );
  await expect(
    updateAIModelMetadata({ id: "missing", name: "Name", description: "" }, c),
  ).rejects.toThrow(/^MODEL_UPDATE_FAILED$/);
});
