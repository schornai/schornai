// @vitest-environment jsdom
import "./client-setup";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { InfoModel } from "../../apps/web/app/_components/InfoModel";
import { AgentInfoMCPs } from "../../apps/web/app/(main)/agent/_components/AgentInfoMCPs";
import { ChatToolApprovalStorageWriteFile } from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatToolApprovalStorageWriteFile";
import { AgentInfoModel } from "../../apps/web/app/(main)/agent/_components/AgentInfoModel";
afterEach(cleanup);
for (const ModelComponent of [InfoModel, AgentInfoModel]) {
  it.each([
    "optional-on",
    "mandatory-on",
    "optional-off",
    "mandatory-off",
    undefined,
  ] as const)(
    "renders model thinking %s and optional vision, image and description",
    (thinking) => {
      const model = {
        identifier: "model",
        name: "Model",
        type: "ollama_llm_v1",
        config: { featureVision: thinking !== undefined, contextSize: 4096 },
        image: thinking ? { path: "image.png" } : undefined,
        description: thinking === undefined ? "" : "Description",
      } as any;
      const view = render(
        <ModelComponent
          modelIdentifier="model"
          modelThinking={thinking}
          model={model}
          editable
          editRoleId={thinking ? "role" : undefined}
          editDefaultModelIdentifier="old"
          editPathname="/edit"
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "labelTitle" }));
      expect(view.container.textContent).toContain("labelModelSize");
      expect(!!view.container.querySelector("img")).toBe(!!thinking);
      expect(!!screen.queryByText("descriptionFeatureVision")).toBe(!!thinking);
      expect(view.container.querySelector("a")!.getAttribute("href")).toContain(
        thinking ? "view=roles" : "view=settings",
      );
    },
  );
  it.each([
    undefined,
    {
      name: "Embedding",
      type: "ollama_embedding_v1",
      config: {},
      description: undefined,
    },
  ])(
    "shows missing or non-language models without LLM capabilities",
    (model) => {
      render(<ModelComponent modelIdentifier="missing" model={model as any} />);
      fireEvent.click(screen.getByRole("button", { name: "labelTitle" }));
      expect(!!screen.queryByText("labelNotFound")).toBe(
        !model || ModelComponent === AgentInfoModel,
      );
      expect(screen.queryByText("descriptionFeatureVision")).toBeNull();
    },
  );
}
it.each([
  undefined,
  [],
  [
    { id: "named", name: "Named connector", url: "https://first.test" },
    { id: "host", url: "https://host.test/mcp" },
    { id: "invalid", url: "broken" },
  ],
])(
  "expands connector details and validates optional names and URLs %j",
  (mcps) => {
    render(
      <AgentInfoMCPs
        agentRole={{ mcps } as any}
        editRoleId="role"
        editDefaultRole={{ mcps: [] } as any}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "labelTitle" }));
    if (mcps?.length) {
      expect(screen.getByText("Named connector")).toBeTruthy();
      expect(screen.getByText("host.test")).toBeTruthy();
      expect(screen.getByText("unknownMcp")).toBeTruthy();
      expect(screen.getByText("invalidUrl")).toBeTruthy();
    } else expect(screen.queryByText("invalidUrl")).toBeNull();
  },
);
it.each([
  null,
  "invalid",
  {},
  { path: 1, content: 2 },
  { path: "/file.txt" },
  { content: "" },
  { path: "/file.MD", content: "**markdown**" },
  { path: "/file.txt", content: "plain text" },
])("previews only valid proposed file paths and contents %j", (input) => {
  const view = render(<ChatToolApprovalStorageWriteFile input={input} />);
  const content =
    typeof input === "object" &&
    input !== null &&
    "content" in input &&
    typeof input.content === "string"
      ? input.content
      : undefined;
  if (content === undefined) expect(screen.queryByRole("button")).toBeNull();
  else {
    fireEvent.click(screen.getByRole("button", { name: "labelShowContent" }));
    expect(view.container.textContent).toContain(
      content || "descriptionEmptyFile",
    );
    fireEvent.click(screen.getByRole("button", { name: "labelHideContent" }));
    expect(
      screen.getByRole("button", { name: "labelShowContent" }),
    ).toBeTruthy();
  }
});

import { AgentInfoRole } from "../../apps/web/app/(main)/agent/_components/AgentInfoRole";
import { AgentInfoPrompt } from "../../apps/web/app/(main)/agent/_components/AgentInfoPrompt";
import { AgentInfoRoleSelectionHint } from "../../apps/web/app/(main)/agent/_components/AgentInfoRoleSelectionHint";
it.each([true, false])(
  "renders configured role sections editable=%s",
  (editable) => {
    const role = {
      id: "role",
      prompt: "Prompt",
      mcps: [{ id: "mcp", url: "https://mcp.test" }],
      documentRepositoryMounts: [
        {
          id: "mount",
          documentRepositoryIdentifier: "repo",
          mount: "/docs",
          pathRepository: "/",
          permission: "read-only",
        },
      ],
      modelIdentifierOverride: "model",
      modelThinkingOverride: "mandatory-on",
      roleSelectionHint: "Selection hint",
    };
    const view = render(
      <AgentInfoRole
        role={role as any}
        documentRepositoryMap={new Map()}
        modelMap={new Map()}
        editable={editable}
        editDefaultRole={role as any}
      />,
    );
    expect(view.container.textContent).toContain("labelPrompt");
    expect(view.container.textContent).toContain("labelTitle");
  },
);
for (const [Component, property, label] of [
  [AgentInfoPrompt, "prompt", "labelPrompt"],
  [AgentInfoRoleSelectionHint, "roleSelectionHint", "labelTitle"],
] as const) {
  it(`${Component.name} switches plain and markdown representations`, () => {
    const view = render(
      <Component agentRole={{ [property]: "**Text**" }} editRoleId="role" />,
    );
    fireEvent.click(screen.getByRole("button", { name: label }));
    const toggle = screen.getByRole("button", { name: "labelMarkdown" });
    fireEvent.click(toggle);
    expect(view.container.querySelector("pre")!.textContent).toBe("**Text**");
    fireEvent.click(toggle);
    expect(view.container.querySelector("pre")).toBeNull();
  });
}
