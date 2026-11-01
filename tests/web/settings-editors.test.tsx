// @vitest-environment jsdom
import "./client-setup";
import { client } from "./client-setup";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceEditorDescription } from "../../apps/web/app/(settings)/settings/workspace/_components/WorkspaceEditorDescription";
import { WorkspaceEditorSSOMappings } from "../../apps/web/app/(settings)/settings/workspace/_components/WorkspaceEditorSSOMappings";
import { WorkspaceEditorDocs } from "../../apps/web/app/(settings)/settings/workspace/_components/WorkspaceEditorDocs";
import { WorkspaceEditorAutoJoin } from "../../apps/web/app/(settings)/settings/workspace/_components/WorkspaceEditorAutoJoin";
import { EditorName } from "../../apps/web/app/(settings)/_components/EditorName";
import EditSAMLAttributeMapping from "../../apps/web/app/(settings)/settings/sso/_components/EditSAMLAttributeMapping";
import { PasswordSignIn } from "../../apps/web/app/signin/_components/PasswordSignIn";
import { AddSSOProvider } from "../../apps/web/app/(settings)/settings/sso/_components/AddSSOProvider";
vi.mock("@/lib/serverActionClient", () => ({
  serverActionClient: {
    inputSchema: () => ({ action: () => vi.fn() }),
    action: () => vi.fn(),
  },
}));
afterEach(cleanup);
beforeEach(() => {
  client.execute.mockReset().mockResolvedValue({});
  client.validationErrors = undefined;
  client.pending = false;
  client.params = new URLSearchParams();
});
function save() {
  fireEvent.click(screen.getByRole("button", { name: "buttonSave" }));
  return client.execute.mock.lastCall![0];
}
function discard(input: HTMLElement) {
  fireEvent.click(
    input.closest('[data-slot="field"]')!.querySelector("label button")!,
  );
}
describe("settings editors", () => {
  it("saves workspace text and restores a description without changing the name", () => {
    render(
      <WorkspaceEditorDescription
        workspaceId="workspace"
        defaultName="Workspace"
        defaultDescription="Original"
      />,
    );
    expect(
      (screen.getByRole("button", { name: "buttonSave" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    fireEvent.change(screen.getByDisplayValue("Workspace"), {
      target: { value: "New name" },
    });
    const description = screen.getByDisplayValue("Original");
    fireEvent.change(description, { target: { value: "New description" } });
    expect(save()).toEqual({
      workspaceId: "workspace",
      name: "New name",
      description: "New description",
    });
    discard(description);
    expect(screen.getByDisplayValue("Original")).toBeTruthy();
    expect(screen.getByDisplayValue("New name")).toBeTruthy();
    discard(screen.getByDisplayValue("New name"));
    expect(screen.getByDisplayValue("Workspace")).toBeTruthy();
    fireEvent.change(screen.getByDisplayValue("Original"), {
      target: { value: "Changed" },
    });
    fireEvent.click(screen.getByRole("button", { name: "buttonReset" }));
    expect(screen.getByDisplayValue("Original")).toBeTruthy();
  });
  it("starts with empty optional descriptions", () => {
    render(<WorkspaceEditorDescription workspaceId="workspace" />);
    expect(screen.getByLabelText("labelName").getAttribute("value")).toBe("");
    fireEvent.change(screen.getByLabelText("labelName"), {
      target: { value: "Created" },
    });
    expect(save().name).toBe("Created");
  });
  it("saves all SSO group mappings even when all three values change", () => {
    render(
      <WorkspaceEditorSSOMappings
        workspaceId="workspace"
        defaultSamlMappingUser="Users"
        defaultSamlMappingEditor="Editors"
        defaultSamlMappingWorkspaceAdmin="Admins"
      />,
    );
    expect(
      (screen.getByRole("button", { name: "buttonSave" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    for (const name of ["Users", "Editors", "Admins"])
      fireEvent.change(screen.getByDisplayValue(name), {
        target: { value: `New ${name}` },
      });
    expect(save()).toEqual({
      workspaceId: "workspace",
      samlMappingUser: "New Users",
      samlMappingEditor: "New Editors",
      samlMappingWorkspaceAdmin: "New Admins",
    });
    for (const name of ["Users", "Editors", "Admins"])
      discard(screen.getByDisplayValue(`New ${name}`));
    expect(
      (screen.getByRole("button", { name: "buttonSave" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    fireEvent.change(screen.getByDisplayValue("Users"), {
      target: { value: "Changed" },
    });
    fireEvent.click(screen.getByRole("button", { name: "buttonReset" }));
    expect(screen.getByDisplayValue("Users")).toBeTruthy();
  });
  it("uses blank defaults for unconfigured SSO groups", () => {
    render(<WorkspaceEditorSSOMappings workspaceId="workspace" />);
    expect(
      screen
        .getAllByRole("textbox")
        .map((input) => (input as HTMLInputElement).value),
    ).toEqual(["", "", ""]);
  });
  it("saves and resets markdown workspace documentation", () => {
    render(
      <WorkspaceEditorDocs workspaceId="workspace" defaultDocs="Original" />,
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "# Updated" },
    });
    expect(save()).toEqual({ docs: "# Updated", workspaceId: "workspace" });
    fireEvent.click(screen.getByRole("button", { name: "buttonReset" }));
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(
      "Original",
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Changed again" },
    });
    fireEvent.click(screen.getByText("legend").querySelector("button")!);
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(
      "Original",
    );
  });
  it.each([true, false])("toggles auto joining from %s", (autoJoin) => {
    render(
      <WorkspaceEditorAutoJoin workspaceId="workspace" autoJoin={autoJoin} />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(client.execute).toHaveBeenCalledWith({
      autoJoin: !autoJoin,
      workspaceId: "workspace",
    });
  });
  it("updates and restores profile names for an explicit user", () => {
    render(
      <EditorName
        targetUserId="user"
        defaultFirstName="Ada"
        defaultLastName="Lovelace"
      />,
    );
    fireEvent.change(screen.getByDisplayValue("Ada"), {
      target: { value: "Grace" },
    });
    fireEvent.change(screen.getByDisplayValue("Lovelace"), {
      target: { value: "Hopper" },
    });
    expect(save()).toEqual({
      targetUserId: "user",
      firstName: "Grace",
      lastName: "Hopper",
    });
    fireEvent.click(screen.getByRole("button", { name: "buttonReset" }));
    expect(screen.getByDisplayValue("Ada")).toBeTruthy();
    expect(screen.getByDisplayValue("Lovelace")).toBeTruthy();
  });
  it.each([
    {},
    {
      keys: {
        firstName: { name: "given" },
        lastName: { name: "surname" },
        avatarUrl: { name: "photo" },
        groups: { name: "groups" },
      },
    },
  ])("edits and discards SAML attribute mappings %j", (attribute_mapping) => {
    render(
      <EditSAMLAttributeMapping
        ssoProvider={{ saml: { attribute_mapping } } as any}
      />,
    );
    for (const [index, input] of screen.getAllByRole("textbox").entries())
      fireEvent.change(input, { target: { value: `attribute-${index}` } });
    expect(save()).toEqual({
      samlMappingAttributeFirstName: "attribute-0",
      samlMappingAttributeLastName: "attribute-1",
      samlMappingAttributeAvatarUrl: "attribute-2",
      samlMappingAttributePermissionGroups: "attribute-3",
    });
    fireEvent.click(screen.getByRole("button", { name: "buttonDiscard" }));
    expect((screen.getAllByRole("textbox")[0] as HTMLInputElement).value).toBe(
      (attribute_mapping as any).keys?.firstName.name ?? "",
    );
  });
  it("submits sign-in credentials with the return path and marks invalid fields", () => {
    client.params = new URLSearchParams("next=/agent");
    client.validationErrors = {
      email: { _errors: ["invalid"] },
      password: { _errors: ["invalid"] },
    };
    render(<PasswordSignIn />);
    const email = screen.getByLabelText("inputEmailLabel");
    const password = screen.getByLabelText("inputPasswordLabel");
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(password.getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(email, { target: { value: "user@example.test" } });
    fireEvent.change(password, { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "buttonSignIn" }));
    expect(client.execute).toHaveBeenCalledWith({
      email: "user@example.test",
      password: "secret",
      next: "/agent",
    });
  });
  it("collects SSO metadata before submitting a new provider", async () => {
    render(<AddSSOProvider />);
    fireEvent.click(screen.getByRole("button", { name: "labelAdd" }));
    const dialog = await screen.findByRole("dialog");
    expect(
      (
        within(dialog).getByRole("button", {
          name: "labelAdd",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.change(screen.getByLabelText("labelMetadataUrl"), {
      target: { value: "https://example.test/metadata" },
    });
    fireEvent.change(screen.getByLabelText("labelMetadata"), {
      target: { value: "<metadata />" },
    });
    await act(async () =>
      fireEvent.click(within(dialog).getByRole("button", { name: "labelAdd" })),
    );
    expect(client.execute).toHaveBeenCalledWith({
      metadataAsUrl: "https://example.test/metadata",
      metadataAsXML: "<metadata />",
    });
  });
});
