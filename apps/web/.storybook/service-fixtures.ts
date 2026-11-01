import { adaptFixture, scenarioState } from "./scenario";

let overrides: Record<string, unknown> = {};
export function configureServiceFixtures(fixtures?: Record<string, unknown>) {
  overrides = fixtures ?? {};
}

export function getServiceFixture<T>(name: string, base: T): T {
  const value = adaptFixture(base, scenarioState.current);
  const override = overrides[name];
  if (override === undefined) return value;
  return value && typeof value === "object" && !Array.isArray(value)
    ? ({ ...value, ...(override as object) } as T)
    : (override as T);
}
