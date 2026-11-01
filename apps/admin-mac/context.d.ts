import type { AdminAPI } from "./src/types";

declare global {
  interface Window {
    aiboxAdminAPI: AdminAPI;
  }
}
