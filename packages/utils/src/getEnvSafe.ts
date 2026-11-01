export function getEnvSafe(key: string) {
  const value = process.env[key];
  if (!value || value.length === 0) {
    throw new Error(`Missing environment variable: "${key}"`);
  }
  return value;
}
