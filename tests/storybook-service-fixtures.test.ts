import { afterEach, expect, it } from "vitest";
import {
  configureServiceFixtures,
  getServiceFixture,
} from "../apps/web/.storybook/service-fixtures.ts";
afterEach(() => configureServiceFixtures());
it("preserves array action results instead of spreading them into the empty default object", () => {
  configureServiceFixtures({
    actionResult: [{ id: "bundle", name: "Example" }],
  });
  expect(getServiceFixture("actionResult", {})).toEqual([
    { id: "bundle", name: "Example" },
  ]);
  configureServiceFixtures({ actionResult: [] });
  expect(getServiceFixture("actionResult", {})).toEqual([]);
});
it("still merges partial object overrides and resets story-local data", () => {
  configureServiceFixtures({ actionResult: { id: "new" } });
  expect(
    getServiceFixture("actionResult", { id: "old", name: "Name" }),
  ).toEqual({ id: "new", name: "Name" });
  configureServiceFixtures();
  expect(getServiceFixture("actionResult", { id: "old" })).toEqual({
    id: "old",
  });
});
