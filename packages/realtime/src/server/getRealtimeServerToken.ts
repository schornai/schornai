/** Server-only shared credential. Never pass this token to a browser. */
export function getRealtimeServerSecret() {
  const secret = process.env.REALTIME_SERVER_SECRET;
  if (!secret || secret.length < 32 || /\s/.test(secret)) {
    throw new Error(
      "REALTIME_SERVER_SECRET must contain at least 32 non-whitespace characters.",
    );
  }
  return secret;
}

export function getRealtimeServerToken(): `Worker ${string}` {
  return `Worker ${getRealtimeServerSecret()}`;
}
