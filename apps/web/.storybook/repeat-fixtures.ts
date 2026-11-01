export function repeatFixtures<T>(items: readonly T[]): T[] {
  return [
    ...items,
    ...items.map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return item;
      return {
        ...item,
        ...("id" in item
          ? { id: `22222222-2222-4222-8222-${String(index).padStart(12, "0")}` }
          : {}),
      };
    }),
  ];
}
