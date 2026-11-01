export function trySync<T>(
  fn: () => T,
): { data: T; error: undefined } | { data: undefined; error: unknown } {
  try {
    const data = fn();
    return { data, error: undefined };
  } catch (error) {
    return { data: undefined, error };
  }
}
