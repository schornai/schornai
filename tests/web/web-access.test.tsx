// @vitest-environment jsdom
import "./client-setup";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { defaultWebAccess } from "../../packages/database/src/agent/webAccess";
import { AgentEditorRoleWebAccess } from "../../apps/web/app/(main)/agent/_components/AgentEditorRoleWebAccess";
import { AgentInfoToolWebAccess } from "../../apps/web/app/(main)/agent/_components/AgentInfoToolWebAccess";
import { ChatMessagePartToolWebFetch } from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePartToolWebFetch";
import { ChatMessagePartToolWebSearch } from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePartToolWebSearch";
import { AgentEditorRoleTools } from "../../apps/web/app/(main)/agent/_components/AgentEditorRoleTools";

const mocks = vi.hoisted(() => ({
  role: undefined as any,
  update: undefined as any,
  setAgentRole: vi.fn(),
}));
vi.mock("../../apps/web/app/(main)/agent/_components/AgentEditor", () => ({
  useAgentEditor: () => ({
    relations: {
      connections: [
        { id: "brave-connection", name: "Central", kind: "brave" },
        { id: "staan-connection", name: "Staan", kind: "staan" },
      ],
    },
    defaultAgent: { roles: [{ id: "role", documentRepositoryMounts: [] }] },
    setAgentRole: (id: string, action: any) => {
      mocks.setAgentRole(id, action);
      mocks.update?.((prev: any) =>
        typeof action === "function" ? action(prev) : action,
      );
    },
  }),
}));
afterEach(() => {
  cleanup();
  mocks.setAgentRole.mockClear();
  mocks.update = undefined;
});
function Editor({ config = defaultWebAccess }: { config?: any }) {
  const [role, setRole] = useState({
    id: "role",
    prompt: "",
    documentRepositoryMounts: [],
    toolWebAccess: config,
  });
  mocks.role = role;
  mocks.update = setRole;
  return <AgentEditorRoleWebAccess role={role} />;
}
function expand() {
  fireEvent.click(screen.getAllByRole("button")[0]!);
}

describe("web access configuration", () => {
  it("enables fetch/search independently and retains configuration when toggled off", async () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("switch", { name: "labelFetch" }));
    expect(mocks.role.toolWebAccess.webFetch).toBe("on");
    expect(mocks.role.toolWebAccess.webSearch).toBe("off");
    fireEvent.click(screen.getByRole("switch", { name: "labelSearch" }));
    await waitFor(() =>
      expect(
        (
          screen.getByRole("combobox", {
            name: "labelSearch",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
    await userEvent.click(
      screen.getByRole("combobox", { name: "labelSearch" }),
    );
    await userEvent.click(
      await screen.findByRole("option", { name: "Central (Brave)" }),
    );
    fireEvent.click(screen.getByRole("switch", { name: "labelAskSearch" }));
    expect(mocks.role.toolWebAccess.webSearch).toBe("ask");
    fireEvent.click(screen.getByRole("switch", { name: "labelFetch" }));
    expect(mocks.role.toolWebAccess.webSearch).toBe("ask");
    expect(mocks.role.toolWebAccess.webSearchConnectionId).toBe(
      "brave-connection",
    );
    expect(mocks.role.toolWebAccess.webFetch).toBe("off");
    expect(screen.queryByLabelText("labelApiKey")).toBeNull();
  });
  it("edits whitelist lines and shows invalid domains and an empty whitelist", () => {
    render(
      <Editor
        config={{
          ...defaultWebAccess,
          webFetch: "on",
          webFetchAccess: "allow-list",
        }}
      />,
    );
    expect(screen.getByText("descriptionEmptyWhitelist")).toBeTruthy();
    const field = screen.getByLabelText("labelDomains");
    fireEvent.change(field, { target: { value: "example.com\n*.docs.org\n" } });
    fireEvent.blur(field);
    expect(mocks.role.toolWebAccess.webFetchAllowList).toEqual([
      "example.com",
      "*.docs.org",
    ]);
    fireEvent.change(field, { target: { value: "https://example.com/path" } });
    expect(screen.getByText("errorDomains")).toBeTruthy();
    expect(field.getAttribute("aria-invalid")).toBe("true");
  });
  it("selects a central connection without copying its secret", async () => {
    render(
      <Editor
        config={{
          ...defaultWebAccess,
          webSearch: "on",
          webSearchConnectionId: "staan-connection",
        }}
      />,
    );
    await waitFor(() =>
      expect(
        (
          screen.getByRole("combobox", {
            name: "labelSearch",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
    await userEvent.click(
      screen.getByRole("combobox", { name: "labelSearch" }),
    );
    await userEvent.click(
      await screen.findByRole("option", { name: "Central (Brave)" }),
    );
    await waitFor(() =>
      expect(mocks.role.toolWebAccess.webSearchProvider).toBe("brave"),
    );
    expect(mocks.role.toolWebAccess.webSearchConnectionId).toBe(
      "brave-connection",
    );
    expect(screen.queryByLabelText("labelMarket")).toBeNull();
    expect(screen.queryByLabelText("labelApiKey")).toBeNull();
  });
  it("offers a working add-web tool action", () => {
    render(<AgentEditorRoleTools roleId="role" />);
    fireEvent.click(screen.getByRole("button", { name: "labelToolWebAccess" }));
    expect(mocks.setAgentRole).toHaveBeenCalledWith(
      "role",
      expect.any(Function),
    );
    expect(
      mocks.setAgentRole.mock.calls[0]![1]({ id: "role" }).toolWebAccess,
    ).toEqual(defaultWebAccess);
  });
  it("shows access policy and an edit link without leaking credentials", () => {
    render(
      <AgentInfoToolWebAccess
        agentRole={{
          toolWebAccess: {
            ...defaultWebAccess,
            webFetch: "ask",
            webFetchAccess: "allow-list",
            webFetchAllowList: ["example.com"],
            webSearch: "on",
            webSearchConnectionId: "brave-connection",
            webSearchProvider: "brave",
          },
        }}
        editRoleId="role"
      />,
    );
    expect(document.querySelector("a")!.getAttribute("href")).toContain(
      "role-role=tool-web",
    );
    expand();
    expect(screen.getByText("example.com")).toBeTruthy();
    expect(document.body.textContent).not.toContain("private-key");
    expect(document.body.textContent).toContain("(Brave)");
    expect(document.body.textContent).not.toContain("Google");
  });
});

describe("web tool chat rendering", () => {
  it("renders fetched text, pagination and a safe source link", () => {
    render(
      <ChatMessagePartToolWebFetch
        part={{
          type: "tool-web-fetch",
          toolCallId: "call",
          state: "output-available",
          input: { url: "https://example.com" },
          output: {
            ok: true,
            title: "Example",
            url: "https://example.com",
            content: "<script>plain text</script>",
            contentOffset: 0,
            totalLength: 30_000,
            truncated: true,
          },
        }}
      />,
    );
    expand();
    expect(screen.getByText("<script>plain text</script>")).toBeTruthy();
    expect(document.querySelector("script")).toBeNull();
    expect(
      screen.getByRole("link", { name: "Example" }).getAttribute("rel"),
    ).toBe("noopener noreferrer");
    expect(screen.getByText("descriptionTruncated")).toBeTruthy();
  });
  it.each(["ready", "failed", "unavailable"] as const)(
    "links downloaded files and exposes processing status %s",
    (processing) => {
      render(
        <ChatMessagePartToolWebFetch
          part={{
            type: "tool-web-fetch",
            toolCallId: "download",
            state: "output-available",
            input: { url: "https://example.com/report.pdf" },
            output: {
              ok: true,
              url: "https://example.com/report.pdf",
              storage: {
                type: "activity",
                agentId: "agent",
                activityId: "chat",
              },
              storagePath: "web/example.com/report.pdf",
              path: "/this_conversation/web/example.com/report.pdf",
              processing,
              content:
                processing === "ready"
                  ? "Extracted <script>text</script>"
                  : undefined,
              file: {
                file: true,
                name: "report.pdf",
                path: "/this_conversation/web/example.com/report.pdf",
                size: 1024,
                type: "application/pdf",
                createdAtISO: "2026-10-11",
                updatedAtISO: "2026-10-11",
              },
            },
          }}
        />,
      );
      expand();
      expect(
        screen.getByRole("link", { name: "report.pdf" }).getAttribute("href"),
      ).toBe("/agent/agent/chat/files/web/example.com/report.pdf");
      if (processing === "ready")
        expect(
          screen.getByText("Extracted <script>text</script>"),
        ).toBeTruthy();
      expect(document.querySelector("script")).toBeNull();
      expect(
        screen.getByText(
          processing === "ready"
            ? "descriptionFileReady"
            : processing === "failed"
              ? "descriptionProcessingFailed"
              : "descriptionProcessingUnavailable",
        ),
      ).toBeTruthy();
    },
  );
  it("renders search results and never links unsafe persisted URLs", () => {
    render(
      <ChatMessagePartToolWebSearch
        part={{
          type: "tool-web-search",
          toolCallId: "call",
          state: "output-available",
          input: { query: "test" },
          output: {
            ok: true,
            query: "test",
            provider: "brave",
            results: [
              { title: "Safe", url: "https://example.com", snippet: "Result" },
              {
                title: "Unsafe",
                url: "javascript:alert(1)",
                snippet: "No execution",
              },
            ],
          },
        }}
      />,
    );
    expand();
    expect(screen.getByRole("link", { name: "Safe" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Unsafe" })).toBeNull();
    expect(screen.getByText("Brave")).toBeTruthy();
  });
  it.each([
    [{ state: "input-streaming" }, "labelPending"],
    [
      { state: "approval-requested", approval: { id: "approval" } },
      "labelApproval",
    ],
    [
      { state: "output-denied", approval: { id: "approval", approved: false } },
      "labelDenied",
    ],
    [
      { state: "output-error", errorText: "Network unavailable" },
      "Network unavailable",
    ],
    [
      {
        state: "output-available",
        output: { ok: false, error: "Not allowed" },
      },
      "Not allowed",
    ],
    [
      {
        state: "output-available",
        output: { ok: true, query: "test", provider: "staan", results: [] },
      },
      "labelEmptyResults",
    ],
  ])("renders state %j", (part, expected) => {
    render(
      <ChatMessagePartToolWebSearch
        part={
          {
            type: "tool-web-search",
            toolCallId: "call",
            input: { query: "test" },
            ...part,
          } as any
        }
      />,
    );
    expand();
    expect(screen.getByText(expected)).toBeTruthy();
  });
});
