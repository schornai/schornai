// @vitest-environment jsdom
vi.mock("next-i18next/client", () => ({
  useT: () => ({ t: (key: string) => key }),
}));
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { XRAGPublicationStatus } from "../../apps/web/app/(settings)/settings/xrag/_components/XRAGPublicationStatus";
const action = vi.hoisted(() => ({
  execute: vi.fn(),
  result: {} as { data?: { state: string } },
  status: "idle",
  isPending: false,
  hasErrored: false,
}));
vi.mock("next-safe-action/hooks", () => ({ useAction: () => action }));
vi.mock(
  "../../apps/web/app/(settings)/settings/xrag/_actions/getXRAGPublication",
  () => ({ getXRAGPublication: vi.fn() }),
);
beforeEach(() => {
  vi.useFakeTimers();
  action.execute.mockReset();
  action.result = {};
  action.status = "idle";
  action.isPending = false;
  action.hasErrored = false;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it("polls queued jobs without overlapping requests and stops after publication", () => {
  const view = render(<XRAGPublicationStatus id="job" name="release" />);
  act(() => vi.advanceTimersByTime(0));
  expect(action.execute).toHaveBeenCalledTimes(1);
  action.isPending = true;
  view.rerender(<XRAGPublicationStatus id="job" name="release" />);
  act(() => vi.advanceTimersByTime(20000));
  expect(action.execute).toHaveBeenCalledTimes(1);
  action.isPending = false;
  action.result = { data: { state: "queued" } };
  action.status = "hasSucceeded";
  view.rerender(<XRAGPublicationStatus id="job" name="release" />);
  act(() => vi.advanceTimersByTime(5000));
  expect(action.execute).toHaveBeenCalledTimes(2);
  action.result = { data: { state: "published" } };
  view.rerender(<XRAGPublicationStatus id="job" name="release" />);
  expect(screen.getByText("labelPublished")).toBeTruthy();
  act(() => vi.advanceTimersByTime(20000));
  expect(action.execute).toHaveBeenCalledTimes(2);
});
it("retries status-read failures but treats publication errors as terminal", () => {
  action.status = "hasErrored";
  action.hasErrored = true;
  const view = render(<XRAGPublicationStatus id="job" name="release" />);
  expect(screen.getByText("errorPublicationStatus")).toBeTruthy();
  act(() => vi.advanceTimersByTime(5000));
  expect(action.execute).toHaveBeenCalledOnce();
  action.hasErrored = false;
  action.result = { data: { state: "error" } };
  view.rerender(<XRAGPublicationStatus id="job" name="release" />);
  expect(screen.getByText("errorPublication")).toBeTruthy();
  act(() => vi.advanceTimersByTime(20000));
  expect(action.execute).toHaveBeenCalledOnce();
});
