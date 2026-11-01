const objCache = new WeakMap<WeakKey, string>();

export function composite<T>(obj: T): string {
  if (obj === undefined) return "undefined";
  if (obj === null) return "null";

  if (typeof obj === "string") return `string-${obj}`;
  if (typeof obj === "number") return `number-${obj.toString()}`;
  if (typeof obj === "boolean") return `boolean-${obj.toString()}`;

  const chachedId = objCache.get(obj);
  if (chachedId) return chachedId;

  if (Array.isArray(obj)) {
    const serializedArray = obj.map((item) => composite(item)).join(",");

    const cacheId = `array-${serializedArray}`;
    objCache.set(obj, cacheId);

    return cacheId;
  }

  if (typeof obj === "object") {
    const serializedObject = Object.entries(obj)
      .toSorted(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}:${composite(value)}`)
      .join("_");

    const cacheId = `object-${serializedObject}`;
    objCache.set(obj, cacheId);

    return cacheId;
  }

  return `unknown-${crypto.randomUUID()}`;
}
