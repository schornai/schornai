// Database functions are mocked individually at their service boundaries.
export function createSupabaseAnonClient() {
  return { auth: {}, storage: { from: () => ({}) } };
}
