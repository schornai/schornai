// Data access itself is mocked at the exported database functions.
export async function createSupabaseServerClient() {
  return { auth: {}, storage: { from: () => ({}) } };
}
