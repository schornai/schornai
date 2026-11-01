import { scenarioState } from "../../../scenario";
export const storageTransferFile = async () =>
  scenarioState.current === "error"
    ? { data: { error: "FILE_ALREADY_EXISTS" } }
    : {
        data: { result: { processing: "queued", file: { path: "notes.txt" } } },
      };
