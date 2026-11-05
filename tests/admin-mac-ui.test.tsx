// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import { App } from "../apps/admin-mac/src/renderer/App";
import { ServiceView } from "../apps/admin-mac/src/renderer/components/ServiceView";
import { createAdminI18n } from "../apps/admin-mac/src/i18n";
import type {
  AdminAPI,
  ChildProcessMessage,
} from "../apps/admin-mac/src/types";

afterEach(cleanup);

async function mount(command: AdminAPI["command"]) {
  let log: (message: ChildProcessMessage) => void = () => {};
  const unsubscribe = vi.fn();
  vi.stubGlobal("aiboxAdminAPI", {
    command,
    onRunBoxMessage: (callback: typeof log) => {
      log = callback;
      return unsubscribe;
    },
  } satisfies AdminAPI);
  const i18n = createAdminI18n("de-AT");
  let view!: ReturnType<typeof render>;
  await act(async () => {
    view = render(
      <I18nextProvider i18n={i18n}>
        <App />
      </I18nextProvider>,
    );
  });
  return { view, unsubscribe, log };
}

describe("Admin Mac service controls", () => {
  it("starts through the existing bridge, polls status, and leaves the service running on close", async () => {
    vi.useFakeTimers();
    const command = vi.fn(async () => JSON.stringify({ state: "running" }));
    const { view, unsubscribe } = await mount(command);
    expect(command.mock.calls).toEqual([["start"], ["status"]]);
    expect(screen.getByRole("status").textContent).toBe("Läuft");
    expect(
      (screen.getByRole("button", { name: "Starten" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(command.mock.calls).toEqual([["start"], ["status"], ["status"]]);
    view.unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(6000);
    expect(command).toHaveBeenCalledTimes(3);
  });

  it("blocks duplicate controls while pending and recovers after a failed command", async () => {
    let fail!: (error: Error) => void;
    const command = vi
      .fn<AdminAPI["command"]>()
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            fail = reject;
          }),
      )
      .mockResolvedValue(JSON.stringify({ state: "running" }));
    await mount(command);
    const start = screen.getByRole("button", {
      name: "Starten",
    }) as HTMLButtonElement;
    const stop = screen.getByRole("button", {
      name: "Stoppen",
    }) as HTMLButtonElement;
    expect(start.disabled).toBe(true);
    expect(stop.disabled).toBe(true);
    fireEvent.click(start);
    fireEvent.click(stop);
    expect(command).toHaveBeenCalledTimes(1);
    await act(async () => fail(new Error("Missing config.json")));
    expect(screen.getByRole("alert").textContent).toContain(
      "Missing config.json",
    );
    expect(start.disabled).toBe(false);
    await act(async () => fireEvent.click(start));
    expect(command.mock.calls).toEqual([["start"], ["start"], ["status"]]);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("Läuft");
  });

  it("keeps the newest 1,000 logs per sender and resets text and sender filters together", async () => {
    const { log } = await mount(
      vi.fn(async () => JSON.stringify({ state: "running" })),
    );
    await act(async () => {
      for (let index = 0; index < 1002; index++)
        log({
          sender: "web",
          level: "stdout",
          timestampISO: new Date(
            Date.UTC(2026, 0, 1, 0, 0, index),
          ).toISOString(),
          message: `web entry ${index}`,
        });
      log({
        sender: "transcriber-mlx",
        level: "stderr",
        timestampISO: "2026-01-01T00:20:00.000Z",
        message: "Model missing",
      });
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Protokolle anzeigen" }),
    );
    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(rows).toHaveLength(1002);
    expect(rows[1]!.textContent).toContain("Model missing");
    expect(rows[2]!.textContent).toContain("web entry 1001");
    expect(screen.queryByText("web entry 0")).toBeNull();
    expect(screen.queryByText("web entry 1")).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: "transcriber-mlx" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "WEB" } });
    expect(await screen.findByText("Keine passenden Meldungen")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Filter zurücksetzen" }),
    );
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("");
    expect(
      screen
        .getByRole("checkbox", { name: "transcriber-mlx" })
        .getAttribute("aria-checked"),
    ).toBe("false");
    await waitFor(() =>
      expect(
        within(screen.getByRole("table")).getAllByRole("row"),
      ).toHaveLength(1002),
    );
  });

  it("searches entire multiline messages with typos and keeps live matches in chronological order", async () => {
    const { log } = await mount(
      vi.fn(async () => JSON.stringify({ state: "running" })),
    );
    await act(async () => {
      log({
        sender: "web",
        level: "stdout",
        timestampISO: "2026-01-15T11:00:00.000Z",
        message: "artifact",
      });
      log({
        sender: "transcriber-mlx",
        level: "stderr",
        timestampISO: "2026-01-15T11:01:00.000Z",
        message: `${"Loading configuration…\n".repeat(20)}Artifact extraction failed.`,
      });
      log({
        level: "stdout",
        timestampISO: "2026-01-15T11:02:00.000Z",
        message: "Ready",
      });
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Protokolle anzeigen" }),
    );
    const search = screen.getByRole("textbox", {
      name: "Protokolle durchsuchen",
    });
    fireEvent.change(search, { target: { value: "  ARTIFCAT  " } });
    await waitFor(() =>
      expect(
        within(screen.getByRole("table")).getAllByRole("row"),
      ).toHaveLength(3),
    );
    expect(
      within(screen.getByRole("table")).getAllByRole("row")[1]!.textContent,
    ).toContain("Artifact extraction failed.");
    await act(async () =>
      log({
        sender: "web",
        level: "stdout",
        timestampISO: "2026-01-15T11:03:00.000Z",
        message: "New artifact received",
      }),
    );
    expect(
      within(screen.getByRole("table")).getAllByRole("row")[1]!.textContent,
    ).toContain("New artifact received");
    fireEvent.click(screen.getByRole("checkbox", { name: "web" }));
    expect(screen.queryByText(/Artifact extraction failed/)).toBeNull();
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(
      3,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Filter zurücksetzen" }),
    );
    await waitFor(() =>
      expect(
        within(screen.getByRole("table")).getAllByRole("row"),
      ).toHaveLength(5),
    );
    for (const [query, expected] of [
      ["TRANSCRIBER", "Artifact extraction failed"],
      ["stderr", "Artifact extraction failed"],
      ["Unbekannt", "Ready"],
    ]) {
      fireEvent.change(search, { target: { value: query } });
      await waitFor(() => {
        const rows = within(screen.getByRole("table")).getAllByRole("row");
        expect(rows).toHaveLength(2);
        expect(rows[1]!.textContent).toContain(expected);
      });
    }
    fireEvent.change(search, { target: { value: "   " } });
    await waitFor(() =>
      expect(
        within(screen.getByRole("table")).getAllByRole("row"),
      ).toHaveLength(5),
    );
  });
});

it("shows empty logs and hides them again without controlling the service", async () => {
  const command = vi.fn(async () => JSON.stringify({ state: "running" }));
  await mount(command);
  fireEvent.click(screen.getByRole("button", { name: "Protokolle anzeigen" }));
  expect(screen.queryByRole("table")).toBeNull();
  expect(screen.queryByRole("checkbox")).toBeNull();
  expect(
    (
      screen.getByRole("button", {
        name: "Filter zurücksetzen",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(
    screen.getByRole("button", { name: "Protokolle ausblenden" }),
  );
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(command.mock.calls).toEqual([["start"], ["status"]]);
});

it("stops through the bridge and shows stopping until the command completes", async () => {
  const pending = Promise.withResolvers<string>();
  const command = vi
    .fn<AdminAPI["command"]>()
    .mockResolvedValue(JSON.stringify({ state: "running" }));
  await mount(command);
  command
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValue(JSON.stringify({ state: "stopped" }));
  fireEvent.click(screen.getByRole("button", { name: "Stoppen" }));
  expect(screen.getByRole("status").textContent).toBe("Stoppt");
  expect(
    (screen.getByRole("button", { name: "Stoppen" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  await act(async () => pending.resolve(""));
  expect(command.mock.calls.slice(-2)).toEqual([["stop"], ["status"]]);
  expect(
    (screen.getByRole("button", { name: "Starten" }) as HTMLButtonElement)
      .disabled,
  ).toBe(false);
});

it.each(["error", "custom-state"])(
  "displays service status %s without assuming a known label",
  async (status) => {
    const i18n = createAdminI18n("de");
    await act(async () =>
      render(
        <I18nextProvider i18n={i18n}>
          <ServiceView
            status={status}
            pending={null}
            error=""
            messages={[]}
            onControl={vi.fn()}
          />
        </I18nextProvider>,
      ),
    );
    expect(screen.getByRole("status").textContent).toBe(
      status === "error" ? "Fehler" : status,
    );
  },
);

it("can clear a sender filter by toggling the same sender again", async () => {
  const { log } = await mount(
    vi.fn(async () => JSON.stringify({ state: "running" })),
  );
  act(() => {
    log({
      sender: "web",
      level: "stdout",
      timestampISO: "2026-01-01T00:00:00Z",
      message: "Web ready",
    });
    log({
      sender: "worker",
      level: "stdout",
      timestampISO: "2026-01-01T00:00:01Z",
      message: "Worker ready",
    });
  });
  fireEvent.click(screen.getByRole("button", { name: "Protokolle anzeigen" }));
  const checkbox = screen.getByRole("checkbox", { name: "web" });
  fireEvent.click(checkbox);
  expect(screen.queryByText("Worker ready")).toBeNull();
  fireEvent.click(checkbox);
  expect(screen.getByText("Worker ready")).toBeTruthy();
});

it("does not poll during a pending command and surfaces status failures afterwards", async () => {
  vi.useFakeTimers();
  const pending = Promise.withResolvers<string>();
  const command = vi
    .fn<AdminAPI["command"]>()
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValue(JSON.stringify({ state: "running" }));
  await mount(command);
  await act(async () => vi.advanceTimersByTimeAsync(3000));
  expect(command).toHaveBeenCalledOnce();
  await act(async () => pending.resolve(""));
  command.mockRejectedValueOnce(new Error("status unavailable"));
  await act(async () => vi.advanceTimersByTimeAsync(3000));
  expect(screen.getByRole("alert").textContent).toContain("status unavailable");
});
