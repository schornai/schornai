import type { Map as YMap, YMapEvent } from "yjs";

export class TypedYMap<T extends Record<string, unknown>> {
  #map: YMap<unknown>;

  constructor(map: YMap<unknown>) {
    this.#map = map;
  }

  get<K extends keyof T>(key: K): T[K] | undefined {
    return this.#map.get(key as string) as T[K] | undefined;
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    this.#map.set(key as string, value);
  }

  delete<K extends keyof T>(key: K): void {
    this.#map.delete(key as string);
  }

  has<K extends keyof T>(key: K): boolean {
    return this.#map.has(key as string);
  }

  getObject(): Partial<T> {
    return this.#map.toJSON() as Partial<T>;
  }

  setObject(obj: T): void {
    for (const key of Object.keys(obj) as (keyof T)[]) {
      this.#map.set(key as string, obj[key]);
    }
  }

  observe(callback: (event: YMapEvent<unknown>) => void) {
    this.#map.observe(callback);
  }

  unobserve(callback: (event: YMapEvent<unknown>) => void) {
    this.#map.unobserve(callback);
  }
}
