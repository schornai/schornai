export type Scenario = "default" | "empty" | "pending" | "error" | "success";

// Story-local state, shared by the deterministic service mocks.
export const scenarioState: { current: Scenario } = { current: "default" };

export function adaptFixture<T>(value: T, scenario: Scenario): T {
  if (Array.isArray(value)) {
    return (
      scenario === "empty"
        ? []
        : value.map((item) => adaptFixture(item, scenario))
    ) as T;
  }
  if (
    !value ||
    typeof value !== "object" ||
    value instanceof Map ||
    value instanceof Date
  )
    return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      if (/isPending$/i.test(key)) return [key, scenario === "pending"];
      if (/hasErrored$/i.test(key)) return [key, scenario === "error"];
      if (/hasSucceeded$/i.test(key)) return [key, scenario === "success"];
      if (key === "hasValidationError")
        return [key, () => scenario === "error"];
      if (key === "filter")
        return [key, scenario === "empty" ? "Keine Treffer" : ""];
      return [key, adaptFixture(item, scenario)];
    }),
  ) as T;
}
