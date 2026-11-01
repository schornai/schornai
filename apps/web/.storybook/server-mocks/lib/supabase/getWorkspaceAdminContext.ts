import { getServiceFixture } from "../../../service-fixtures";
export const getWorkspaceAdminContext = async () =>
  getServiceFixture("getWorkspaceAdminContext", {
    supabaseServiceRole: {},
    isGlobalAdmin: true,
  });
