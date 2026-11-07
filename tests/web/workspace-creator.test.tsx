// @vitest-environment jsdom
import "./client-setup";
import { client } from "./client-setup";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { WorkspaceCreator } from "../../apps/web/app/(settings)/settings/workspace/_components/WorkspaceCreator";
vi.mock(
  "../../apps/web/app/(settings)/settings/workspace/_actions/createWorkspace",
  () => ({ createWorkspace: vi.fn() }),
);
afterEach(cleanup);
beforeEach(() => {
  client.pending = false;
  client.execute.mockClear();
});

it.each(["", "   "])(
  "rejects blank workspace names including direct form submission: %j",
  (name) => {
    const view = render(<WorkspaceCreator />);
    fireEvent.change(screen.getByLabelText("labelName"), {
      target: { value: name },
    });
    expect(
      (screen.getByRole("button", { name: "labelCreate" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    fireEvent.submit(view.container.querySelector("form")!);
    expect(client.execute).not.toHaveBeenCalled();
  },
);

it("submits the draft and keeps it after failure so users can retry", () => {
  render(<WorkspaceCreator />);
  fireEvent.change(screen.getByLabelText("labelName"), {
    target: { value: "Research" },
  });
  fireEvent.change(screen.getByLabelText("labelDescription"), {
    target: { value: "Shared documents" },
  });
  fireEvent.click(screen.getByRole("button", { name: "labelCreate" }));
  expect(client.execute).toHaveBeenCalledExactlyOnceWith({
    name: "Research",
    description: "Shared documents",
  });
  act(() => client.actionOptions.onError({ error: { serverError: "failed" } }));
  expect(screen.getByRole("alert").textContent).toBe("errorCreate");
  expect((screen.getByLabelText("labelName") as HTMLInputElement).value).toBe(
    "Research",
  );
  expect(
    (screen.getByLabelText("labelDescription") as HTMLTextAreaElement).value,
  ).toBe("Shared documents");
  fireEvent.click(screen.getByRole("button", { name: "labelCreate" }));
  expect(client.execute).toHaveBeenCalledTimes(2);
});

it("blocks submission and edits while a create request is pending", () => {
  const view = render(<WorkspaceCreator />);
  fireEvent.change(screen.getByLabelText("labelName"), {
    target: { value: "Research" },
  });
  client.pending = true;
  view.rerender(<WorkspaceCreator />);
  expect(view.container.querySelector("fieldset")!.disabled).toBe(true);
  fireEvent.submit(view.container.querySelector("form")!);
  expect(client.execute).not.toHaveBeenCalled();
});
