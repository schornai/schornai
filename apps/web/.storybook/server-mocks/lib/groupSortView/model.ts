import { getServiceFixture } from "../../../service-fixtures";
export const getGroupSortViewPreferences = async () =>
  getServiceFixture("getGroupSortViewPreferences", { view: "table" });
