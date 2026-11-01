export async function tryAsync<T>(
  fn: () => Promise<T>,
): Promise<
  { data: T; error: undefined } | { data: undefined; error: unknown }
> {
  try {
    const data = await fn();
    return { data, error: undefined };
  } catch (error) {
    return { data: undefined, error };
  }
}
