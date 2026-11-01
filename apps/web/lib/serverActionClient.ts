import { createSafeActionClient } from "next-safe-action";

export const serverActionClient = createSafeActionClient({
  // Database/provider errors can carry credentials, SQL and private payloads.
  // Client components use the presence of serverError, never its raw details.
  handleServerError: () => "INTERNAL_SERVER_ERROR",
});
