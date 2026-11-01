import { getServiceFixture } from "../../../service-fixtures";
export const getCurrentUserProfile = async () =>
  getServiceFixture("getCurrentUserProfile", {
    id: "11111111-1111-4111-8111-111111111111",
    email: "alex@example.test",
    firstName: "Alex",
    lastName: "Beispiel",
    name: "Beispiel",
    signInMethod: "email",
    lastSignInAt: new Date("2026-01-15T12:00:00.000Z"),
  });
