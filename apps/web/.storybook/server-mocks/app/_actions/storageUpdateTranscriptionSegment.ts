import { getServiceFixture } from "../../../service-fixtures";
export const storageUpdateTranscriptionSegment = async () =>
  getServiceFixture("storageUpdateTranscriptionSegment", {
    serverError: "Preview only",
  });
