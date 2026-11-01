// At top of file or in vite.config/jest setup
import { fileURLToPath } from "url";
import { dirname } from "path";

export function getDirname(url: string) {
  const __filename = fileURLToPath(url);
  const __dirname = dirname(__filename);
  return __dirname;
}
