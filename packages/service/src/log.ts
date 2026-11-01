import {
  appendFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  statSync,
} from "node:fs";
import { join } from "node:path";

export type LogEntry = {
  timestampISO: string;
  sender: string;
  level: "stdout" | "stderr";
  message: string;
};
export type Log = (
  sender: string,
  message: string,
  level?: "stdout" | "stderr",
) => void;
export function createLogger(
  root: string,
  environment: NodeJS.ProcessEnv,
  consoleOutput = false,
): Log {
  const dir = join(root, "logs");
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = join(dir, "service.log");
  const secrets = Object.entries(environment)
    .filter(
      ([key, value]) =>
        /SECRET|PASSWORD|TOKEN|KEY|DSN/.test(key) && value && value.length > 5,
    )
    .map(([, value]) => value!);
  return (sender, message, level = "stdout") => {
    for (const secret of secrets)
      message = message.replaceAll(secret, "[redacted]");
    const entry: LogEntry = {
      timestampISO: new Date().toISOString(),
      sender,
      level,
      message: message.slice(0, 16_384),
    };
    if (existsSync(file) && statSync(file).size > 10 * 1024 * 1024)
      renameSync(file, `${file}.1`);
    appendFileSync(file, `${JSON.stringify(entry)}\n`, { mode: 0o600 });
    if (consoleOutput) {
      const output = level === "stderr" ? process.stderr : process.stdout;
      output.write(`[${sender}] ${entry.message}\n`);
    }
  };
}
