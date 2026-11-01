import { getServiceFixture } from "../../../service-fixtures";
export const getSystemConfigSignIn = async () =>
  getServiceFixture("getSystemConfigSignIn", {
    password: "hidden",
    sso: "hidden",
    ssoName: "Beispiel",
  });
