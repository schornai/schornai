import { getServiceFixture } from "../../../service-fixtures";
export const fileUploadToStorageObjectAction = async () =>
  getServiceFixture("fileUploadToStorageObjectAction", {
    target: {
      type: "text",
      name: "Beispiel",
      path: "/beispiel.txt",
      createdAtISO: "2026-01-15T12:00:00.000Z",
      file: true,
      readableContent: "text",
      size: 1,
      updatedAtISO: "2026-01-15T12:00:00.000Z",
    },
    progress: 45,
    state: "uploading",
  });
