export function pickRandom<T>(arr: T[] | undefined, fallback: T) {
  if (!arr) return fallback;
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex] ?? fallback;
}
