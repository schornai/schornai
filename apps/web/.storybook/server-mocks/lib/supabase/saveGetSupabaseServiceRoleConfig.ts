import { getServiceFixture } from "../../../service-fixtures";
export const saveGetSupabaseServiceRoleConfig = async () =>
  getServiceFixture("saveGetSupabaseServiceRoleConfig", {
    supabaseServiceRoleKey: "Beispiel",
    supabaseUrl: "Beispiel",
  });
