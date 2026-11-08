import { getServiceFixture } from "../../../../../../service-fixtures";
export const getXRAGPublication = async () =>
  getServiceFixture("getXRAGPublication", {
    id: "00000000-0000-4000-8000-000000000001",
    state: "published",
    artifactId: "a".repeat(64),
  });
