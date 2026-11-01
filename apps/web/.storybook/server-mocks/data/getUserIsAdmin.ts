import { getServiceFixture } from "../../service-fixtures";

export const getUserIsAdmin = async () =>
  getServiceFixture("getUserIsAdmin", false);
