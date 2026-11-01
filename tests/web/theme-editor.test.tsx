// @vitest-environment jsdom
import "./client-setup";
import { client } from "./client-setup";
import {
  act,
  cleanup,
  fireEvent,
  render as testingRender,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { cloneElement, type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "@schornio/aibox-package-ui/components/sidebar";
import { ThemeEditor } from "../../apps/web/app/(settings)/settings/theme/_components/ThemeEditor";
import type { Theme } from "../../apps/web/lib/theme";
import { updateThemeSettings as updateTheme } from "../../apps/web/app/(settings)/settings/theme/_actions/updateThemeSettings";
import { defaultColors } from "../../apps/web/lib/defaultColors";

const uploads = vi.hoisted(() => [] as { options: any }[]);
vi.mock("@/lib/supabase/use-session-token", () => ({
  useSessionToken: () => "session-token",
}));
vi.mock("tus-js-client", () => ({
  Upload: class {
    constructor(
      _file: File,
      public options: any,
    ) {
      uploads.push(this);
    }
    start() {}
  },
}));

vi.mock(
  "../../apps/web/app/(settings)/settings/theme/_actions/updateThemeSettings",
  () => ({ updateThemeSettings: vi.fn() }),
);
vi.mock(
  "../../apps/web/app/(settings)/settings/theme/_actions/updateWelcomeMessage",
  () => ({ updateWelcomeMessage: vi.fn() }),
);
afterEach(cleanup);
beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  client.execute.mockReset();
  client.actionOptionsByAction.clear();
  client.pending = false;
  client.supportedLanguages = ["en", "de"];
  uploads.length = 0;
  client.params = new URLSearchParams();
  client.pathname = "/settings/theme";
  client.push.mockReset();
});
function render(ui: ReactElement) {
  const result = testingRender(<SidebarProvider>{ui}</SidebarProvider>);
  const rerender = (next: ReactElement) =>
    result.rerender(<SidebarProvider>{next}</SidebarProvider>);
  client.push.mockImplementation((url: string) => {
    client.params = new URL(url, "http://localhost").searchParams;
    rerender(cloneElement(ui));
  });
  return { ...result, rerender };
}

const theme: Theme = {
  version: "theme-v2",
  colors: [
    {
      id: "hue",
      name: "Brand",
      color: { type: "color-oklch-hue", oklchHue: 42 },
    },
    {
      id: "rgb",
      name: "Accent",
      color: { type: "color-rgb", red: 10, green: 20, blue: 30, opacity: 0.4 },
    },
  ],
  logo: { de: { url: "/logo.svg", alt: "Brand logo" }, fr: { url: "/fr.svg" } },
};
function openColors(...names: string[]) {
  fireEvent.click(screen.getByRole("tab", { name: "labelTabColors" }));
  for (const name of names) {
    fireEvent.click(screen.getByRole("button", { name: new RegExp(name) }));
  }
}
function submitSettings() {
  fireEvent.click(screen.getByRole("button", { name: "labelSave" }));
  return client.execute.mock.lastCall?.[0];
}
function save() {
  return submitSettings().theme;
}
function discardTheme() {
  fireEvent.click(screen.getByRole("button", { name: "labelDiscardTheme" }));
  fireEvent.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: "labelDiscard",
    }),
  );
}

function disabled(name: string) {
  return (screen.getByRole("button", { name }) as HTMLButtonElement).disabled;
}
async function addOverride() {
  fireEvent.click(screen.getAllByRole("button", { name: "labelAdd" })[0]!);
  fireEvent.click(screen.getByRole("button", { name: "labelCreate" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}
async function uploadLogo(index = 0) {
  const count = uploads.length;
  fireEvent.change(screen.getAllByLabelText("labelUpload")[index]!, {
    target: {
      files: [new File(["<svg/>"], "my logo.svg", { type: "image/svg+xml" })],
    },
  });
  await waitFor(() => expect(uploads).toHaveLength(count + 1));
  return uploads[count]!;
}

describe("theme editor", () => {
  it("reads deep links, preserves query parameters and restores views from navigation", () => {
    client.params = new URLSearchParams("view=colors&keep=1");
    const { rerender } = render(<ThemeEditor defaultTheme={theme} />);
    expect(
      screen
        .getByRole("tab", { name: "labelTabColors" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("tab", { name: "labelTabLogo" }));
    expect(client.push).toHaveBeenLastCalledWith(
      "/settings/theme?view=logos&keep=1",
      { scroll: false },
    );
    fireEvent.click(screen.getByRole("tab", { name: "labelOverview" }));
    expect(client.push).toHaveBeenLastCalledWith("/settings/theme?keep=1", {
      scroll: false,
    });
    fireEvent.click(screen.getByRole("button", { name: "labelEditText" }));
    expect(client.push).toHaveBeenLastCalledWith(
      "/settings/theme?keep=1&view=texts",
      { scroll: false },
    );
    client.params = new URLSearchParams("view=logos");
    rerender(<ThemeEditor defaultTheme={theme} />);
    expect(
      screen
        .getByRole("tab", { name: "labelTabLogo" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    client.params = new URLSearchParams("view=unknown");
    rerender(<ThemeEditor defaultTheme={theme} />);
    expect(
      screen
        .getByRole("tab", { name: "labelOverview" })
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("saves a color draft from the overview using the action beside the tabs", () => {
    render(<ThemeEditor defaultTheme={theme} />);
    openColors("Brand");
    fireEvent.change(screen.getByDisplayValue("Brand"), {
      target: { value: "Updated brand" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "labelOverview" }));
    const saveButton = screen.getByRole("button", { name: "labelSave" });
    expect(saveButton.closest("form")).toBeNull();
    expect(saveButton.getAttribute("form")).toBeTruthy();
    expect(disabled("labelSave")).toBe(false);
    expect(save().colors[0].name).toBe("Updated brand");
  });

  it("edits hue and RGB colors while preserving IDs, opacity and other logos", () => {
    render(<ThemeEditor defaultTheme={theme} />);
    openColors("Brand", "Accent");
    expect(disabled("labelSave")).toBe(true);
    fireEvent.change(screen.getByDisplayValue("Brand"), {
      target: { value: "Changed" },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "labelHue" }), {
      target: { value: "180" },
    });
    fireEvent.change(screen.getByLabelText("labelRgb"), {
      target: { value: "#ff0080" },
    });
    expect(save()).toEqual({
      ...theme,
      colors: [
        {
          id: "hue",
          name: "Changed",
          color: { type: "color-oklch-hue", oklchHue: 180 },
        },
        {
          id: "rgb",
          name: "Accent",
          color: {
            type: "color-rgb",
            red: 255,
            green: 0,
            blue: 128,
            opacity: 0.4,
          },
        },
      ],
    });
    discardTheme();
    expect(screen.getByDisplayValue("Brand")).toBeTruthy();
    expect(disabled("labelSave")).toBe(true);
  });
  it("adds, reorders and removes colors and restores the default palette", () => {
    render(<ThemeEditor defaultTheme={theme} />);
    openColors("Brand", "Accent");
    fireEvent.click(screen.getByRole("button", { name: "labelAddColor" }));
    expect(save().colors).toHaveLength(3);
    act(() =>
      client.onDragEnd({
        canceled: true,
        operation: {
          source: { id: "hue", initialIndex: 0, index: 1 },
          target: { id: "rgb" },
          canceled: true,
        },
      }),
    );
    expect(save().colors[0].id).toBe("hue");
    act(() =>
      client.onDragEnd({
        canceled: false,
        operation: {
          source: { id: "hue", initialIndex: 0, index: 1 },
          target: { id: "rgb" },
          canceled: false,
        },
      }),
    );
    expect(save().colors[0].id).toBe("rgb");
    fireEvent.click(screen.getAllByRole("button", { name: "labelRemove" })[0]!);
    expect(save().colors.map((color: any) => color.id)).not.toContain("rgb");
    fireEvent.click(screen.getByRole("button", { name: "labelDefaultColors" }));
    expect(screen.getByText(defaultColors[0]!.name)).toBeTruthy();
    expect(save().colors).toBeUndefined();
  });
  it("removes explicit logo overrides and preserves other languages", async () => {
    render(<ThemeEditor defaultTheme={theme} />);
    openColors("Brand", "Accent");
    fireEvent.click(screen.getByRole("tab", { name: "labelTabLogo" }));
    expect(screen.queryByLabelText("labelUrl")).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: "labelRemove" })[0]!);
    expect(save().logo).toEqual({ fr: { url: "/fr.svg" } });
    await addOverride();
    expect(disabled("labelSave")).toBe(true);
    fireEvent.change(screen.getAllByLabelText("labelAlt")[1]!, {
      target: { value: "English logo" },
    });
    const upload = await uploadLogo(1);
    await act(async () => upload.options.onSuccess());
    expect(upload.options.metadata.bucketName).toBe("theme_logos");
    expect(save().logo).toEqual({
      fr: { url: "/fr.svg" },
      en: {
        url: `/api/storage/theme_logos/${upload.options.metadata.objectName.split("/").map(encodeURIComponent).join("/")}`,
        alt: "English logo",
      },
    });
  });
  it("rejects invalid input and retains the draft on save errors", () => {
    render(<ThemeEditor defaultTheme={theme} />);
    openColors("Brand", "Accent");
    fireEvent.change(screen.getByDisplayValue("Brand"), {
      target: { value: " " },
    });
    expect(disabled("labelSave")).toBe(true);
    fireEvent.change(screen.getAllByLabelText("labelName")[0]!, {
      target: { value: "Changed" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "labelTabLogo" }));
    expect(screen.queryByDisplayValue("Changed")).toBeNull();
    save();
    act(() => client.actionOptionsByAction.get(updateTheme).onError());
    expect(screen.getByText("errorSave")).toBeTruthy();
    openColors("Changed");
    expect(screen.getByDisplayValue("Changed")).toBeTruthy();
    expect(disabled("labelSave")).toBe(false);
  });
  it("shows discard in the heading only for drafts and lets users cancel", async () => {
    render(<ThemeEditor defaultTheme={theme} />);
    expect(
      screen.queryByRole("button", { name: "labelDiscardTheme" }),
    ).toBeNull();
    openColors("Brand");
    fireEvent.change(screen.getByDisplayValue("Brand"), {
      target: { value: "Draft" },
    });
    const trigger = screen.getByRole("button", { name: "labelDiscardTheme" });
    expect(trigger.closest("h1")).toBeTruthy();
    fireEvent.click(trigger);
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "labelCancel",
      }),
    );
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.getByDisplayValue("Draft")).toBeTruthy();
    discardTheme();
    expect(screen.getByDisplayValue("Brand")).toBeTruthy();
  });

  it("keeps one save action on texts and discards all sections together after a failure", () => {
    client.params = new URLSearchParams("view=texts");
    render(
      <ThemeEditor
        defaultTheme={theme}
        defaultWelcomeMessage={{ de: "Welcome" }}
        defaultAccessMessage={{
          de: { subject: "Access", body: "Hello {{firstName}}" },
        }}
      />,
    );
    expect(screen.getAllByRole("button", { name: "labelSave" })).toHaveLength(
      1,
    );
    expect(
      screen.queryByRole("button", { name: "labelSaveTemplates" }),
    ).toBeNull();
    fireEvent.change(screen.getByDisplayValue("Welcome"), {
      target: { value: "Draft welcome" },
    });
    fireEvent.change(screen.getByLabelText("labelSubject"), {
      target: { value: "Draft subject" },
    });
    fireEvent.change(screen.getByLabelText("labelBody"), {
      target: { value: "{{invalid}}" },
    });
    expect(disabled("labelSave")).toBe(true);
    fireEvent.change(screen.getByLabelText("labelBody"), {
      target: { value: "Hello {{fullName}}" },
    });
    openColors("Brand");
    fireEvent.change(screen.getByDisplayValue("Brand"), {
      target: { value: "Draft color" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "labelWelcome" }));
    const input = submitSettings();
    expect(input.welcomeMessage).toEqual({ de: "Draft welcome" });
    expect(input.accessMessage.de).toEqual({
      subject: "Draft subject",
      body: "Hello {{fullName}}",
    });
    expect(input.theme.colors[0].name).toBe("Draft color");
    act(() => client.actionOptionsByAction.get(updateTheme).onError());
    expect(screen.getByDisplayValue("Draft subject")).toBeTruthy();
    discardTheme();
    expect(screen.getByDisplayValue("Welcome")).toBeTruthy();
    expect(screen.getByDisplayValue("Access")).toBeTruthy();
    expect(screen.getByDisplayValue("Hello {{firstName}}")).toBeTruthy();
    openColors("Brand");
    expect(screen.getByDisplayValue("Brand")).toBeTruthy();
    expect(disabled("labelSave")).toBe(true);
  });

  it("uses the successful save as the new discard baseline", () => {
    render(<ThemeEditor defaultTheme={theme} />);
    openColors("Brand", "Accent");
    fireEvent.change(screen.getByDisplayValue("Brand"), {
      target: { value: "Saved name" },
    });
    const input = submitSettings();
    act(() =>
      client.actionOptionsByAction.get(updateTheme).onSuccess({ input }),
    );
    expect(disabled("labelSave")).toBe(true);
    fireEvent.change(screen.getByDisplayValue("Saved name"), {
      target: { value: "Unsaved" },
    });
    discardTheme();
    expect(screen.getByDisplayValue("Saved name")).toBeTruthy();
  });
  it("renders default colors without creating an unsaved change", () => {
    render(<ThemeEditor defaultTheme={{ version: "theme-v2" }} />);
    openColors();
    expect(screen.getByText(defaultColors[0]!.name)).toBeTruthy();
    expect(disabled("labelSave")).toBe(true);
    expect(disabled("labelDefaultColors")).toBe(true);
    act(() =>
      client.onDragEnd({
        canceled: false,
        operation: {
          source: { id: defaultColors[0]!.id, initialIndex: 0, index: 0 },
          target: { id: defaultColors[0]!.id },
          canceled: false,
        },
      }),
    );
    expect(disabled("labelSave")).toBe(true);
  });
  it("disables changes during saving", () => {
    client.pending = true;
    render(<ThemeEditor defaultTheme={theme} />);
    openColors();
    expect(disabled("labelAddColor")).toBe(true);
    expect(disabled("labelSave")).toBe(true);
    expect(screen.getByText("Brand").closest("fieldset")?.disabled).toBe(true);
  });
  it("only shows chosen logo languages and can discard an incomplete override", async () => {
    render(<ThemeEditor defaultTheme={{ version: "theme-v2" }} />);
    fireEvent.click(screen.getByRole("tab", { name: "labelTabLogo" }));
    expect(screen.queryByLabelText("labelAlt")).toBeNull();
    await addOverride();
    expect(screen.getAllByLabelText("labelAlt")).toHaveLength(1);
    fireEvent.change(screen.getAllByLabelText("labelAlt")[0]!, {
      target: { value: "Draft logo text" },
    });
    expect(disabled("labelDiscardTheme")).toBe(false);
    expect(disabled("labelSave")).toBe(true);
    discardTheme();
    expect(screen.queryByDisplayValue("Draft logo text")).toBeNull();
    expect(screen.queryByLabelText("labelAlt")).toBeNull();
  });

  it("keeps uploads alive across tabs and uses a new path without replacing the saved logo", async () => {
    render(<ThemeEditor defaultTheme={theme} />);
    fireEvent.click(screen.getByRole("tab", { name: "labelTabLogo" }));
    const first = await uploadLogo();
    expect(disabled("labelSave")).toBe(true);
    expect(
      screen.queryByRole("button", { name: "labelDiscardTheme" }),
    ).toBeNull();
    openColors();
    expect(disabled("labelAddColor")).toBe(true);
    await act(async () => first.options.onSuccess());
    fireEvent.click(screen.getByRole("tab", { name: "labelTabLogo" }));
    expect(save().logo.de.url).toContain("/api/storage/theme_logos/");
    const second = await uploadLogo();
    expect(second.options.metadata.objectName).not.toBe(
      first.options.metadata.objectName,
    );
    await act(async () => second.options.onSuccess());
    discardTheme();
    expect(screen.getByAltText("Brand logo").getAttribute("src")).toBe(
      "/logo.svg",
    );
    expect(disabled("labelSave")).toBe(true);
  });

  it("uploads dropped logos to the selected language and blocks drops while uploading", async () => {
    render(<ThemeEditor defaultTheme={theme} />);
    fireEvent.click(screen.getByRole("tab", { name: "labelTabLogo" }));
    const target = screen.getAllByLabelText("labelUpload")[1]!;
    const drop = async (files: File[]) => {
      await act(async () => {
        fireEvent.drop(target, {
          dataTransfer: {
            items: files.map((file) => ({
              webkitGetAsEntry: () => ({
                isFile: true,
                isDirectory: false,
                name: file.name,
                fullPath: `/${file.name}`,
                file: (resolve: (file: File) => void) => resolve(file),
              }),
            })),
          },
        });
      });
    };
    const file = new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" });
    await drop([file, file]);
    expect(screen.getByText("errorFile")).toBeTruthy();
    expect(uploads).toHaveLength(0);
    await drop([new File(["html"], "logo.html", { type: "text/html" })]);
    expect(uploads).toHaveLength(0);
    await drop([file]);
    await waitFor(() => expect(uploads).toHaveLength(1));
    expect(disabled("labelSave")).toBe(true);
    fireEvent.dragOver(target);
    expect(screen.queryByText("drop")).toBeNull();
    await drop([file]);
    expect(uploads).toHaveLength(1);
    await act(async () => uploads[0]!.options.onSuccess());
    expect(save().logo).toEqual({
      de: theme.logo!.de,
      fr: { url: expect.stringContaining("/api/storage/theme_logos/") },
    });
  });

  it("rejects unsupported or oversized files and recovers from an upload error", async () => {
    render(<ThemeEditor defaultTheme={theme} />);
    fireEvent.click(screen.getByRole("tab", { name: "labelTabLogo" }));
    const tooLarge = new File(["large"], "logo.png", { type: "image/png" });
    Object.defineProperty(tooLarge, "size", { value: 5242881 });
    for (const file of [
      new File(["html"], "logo.html", { type: "text/html" }),
      tooLarge,
    ]) {
      fireEvent.change(screen.getAllByLabelText("labelUpload")[0]!, {
        target: { files: [file] },
      });
      expect(await screen.findByText("errorFile")).toBeTruthy();
      expect(uploads).toHaveLength(0);
    }
    const failed = await uploadLogo();
    await act(async () => failed.options.onError(new Error("network")));
    expect(screen.getByText("errorUpload")).toBeTruthy();
    expect(screen.getByAltText("Brand logo").getAttribute("src")).toBe(
      "/logo.svg",
    );
    const retry = await uploadLogo();
    await act(async () => retry.options.onSuccess());
    expect(screen.queryByText("errorUpload")).toBeNull();
    expect(disabled("labelSave")).toBe(false);
  });
});

it("creates text overrides only for selected supported languages and removes them to restore defaults", async () => {
  client.supportedLanguages = ["ja", "fr", "en", "de", "cimode"];
  render(<ThemeEditor defaultTheme={{ version: "theme-v2" }} />);
  fireEvent.click(screen.getByRole("tab", { name: "labelWelcome" }));
  expect(screen.queryByRole("textbox")).toBeNull();
  await addOverride();
  expect(screen.getByText("Japanese")).toBeTruthy();
  expect(screen.getAllByRole("textbox")).toHaveLength(1);
  expect(submitSettings().welcomeMessage).toEqual({ ja: "_welcomeMessage" });
  await addOverride();
  expect(screen.getByText("French")).toBeTruthy();
  expect(screen.getAllByRole("textbox")).toHaveLength(2);
  fireEvent.click(screen.getAllByRole("button", { name: "labelRemove" })[0]!);
  expect(submitSettings().welcomeMessage).toEqual({ fr: "_welcomeMessage" });
  discardTheme();
  expect(screen.queryByRole("textbox")).toBeNull();
});

it("uses the first language variant in the overview and when adding a text language", async () => {
  const overview = () =>
    within(screen.getByRole("tabpanel", { name: "labelOverview" }));
  render(
    <ThemeEditor
      defaultTheme={{
        version: "theme-v2",
        logo: { fr: { url: "/fr.svg", alt: "Shared logo" } },
      }}
      defaultWelcomeMessage={{ fr: "Shared welcome" }}
    />,
  );
  expect(
    screen.getByRole("img", { name: "Shared logo" }).getAttribute("src"),
  ).toBe("/fr.svg");
  fireEvent.click(screen.getByRole("button", { name: "labelText" }));
  expect(overview().getByText("Shared welcome")).toBeTruthy();
  fireEvent.click(screen.getByRole("tab", { name: "labelWelcome" }));
  await addOverride();
  expect(
    screen
      .getAllByRole("textbox")
      .map((input) => (input as HTMLTextAreaElement).value),
  ).toEqual(["Shared welcome", "Shared welcome"]);
  fireEvent.change(screen.getAllByRole("textbox")[1]!, {
    target: { value: "English welcome" },
  });
  fireEvent.click(screen.getByRole("tab", { name: "labelOverview" }));
  fireEvent.click(screen.getByRole("button", { name: "labelText" }));
  expect(overview().getByText("English welcome")).toBeTruthy();
  fireEvent.click(screen.getByRole("tab", { name: "labelWelcome" }));
  fireEvent.click(screen.getAllByRole("button", { name: "labelRemove" })[0]!);
  const panel = screen.getByRole("tabpanel", { name: "labelWelcome" });
  const defaultDescription = within(panel).getByText("descriptionDefault");
  expect(
    defaultDescription.closest('[data-slot="card"]')?.textContent,
  ).toContain("English");
  fireEvent.click(screen.getByRole("button", { name: "labelRemove" }));
  expect(submitSettings().welcomeMessage).toEqual({});
  fireEvent.click(screen.getByRole("tab", { name: "labelOverview" }));
  expect(screen.getByText("labelDefaultText")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "labelText" }));
  expect(overview().getByText("_welcomeMessage")).toBeTruthy();
});

it("saves and discards text and color drafts together across tabs", () => {
  render(
    <ThemeEditor
      defaultTheme={theme}
      defaultWelcomeMessage={{ de: "Willkommen", en: "Welcome", fr: "Bonjour" }}
    />,
  );
  expect(
    screen.getAllByRole("tab").map((tab) => tab.textContent?.trim()),
  ).toEqual([
    "labelOverview",
    "labelTabLogo",
    "labelWelcome",
    "labelTabColors",
  ]);
  expect(
    screen
      .getByRole("tab", { name: "labelOverview" })
      .getAttribute("aria-selected"),
  ).toBe("true");
  expect(disabled("labelSave")).toBe(true);
  openColors();
  expect(screen.queryByRole("textbox", { name: "labelName" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Brand/ }));
  fireEvent.change(screen.getByDisplayValue("Brand"), {
    target: { value: "Color draft" },
  });
  fireEvent.click(screen.getByRole("tab", { name: "labelWelcome" }));
  fireEvent.change(screen.getByDisplayValue("Willkommen"), {
    target: { value: "# Willkommen\n\n**Hallo**" },
  });
  fireEvent.change(screen.getByDisplayValue("Welcome"), {
    target: { value: "" },
  });
  fireEvent.click(screen.getByRole("tab", { name: "labelOverview" }));
  fireEvent.click(screen.getByRole("button", { name: "labelColors" }));
  fireEvent.click(screen.getByRole("button", { name: "labelText" }));
  expect(screen.getByText("Color draft")).toBeTruthy();
  expect(
    screen.getByText(/# Willkommen\s+\*\*Hallo\*\*/, { selector: "div" }),
  ).toBeTruthy();
  openColors("Color draft");
  expect(screen.getByDisplayValue("Color draft")).toBeTruthy();
  fireEvent.click(screen.getByRole("tab", { name: "labelWelcome" }));
  const input = submitSettings();
  expect(input.welcomeMessage).toEqual({
    de: "# Willkommen\n\n**Hallo**",
    fr: "Bonjour",
  });
  expect(input.theme.colors[0].name).toBe("Color draft");
  act(() => client.actionOptionsByAction.get(updateTheme).onError());
  expect(screen.getByText("errorSave")).toBeTruthy();
  expect(
    (
      screen.getAllByRole("textbox", {
        name: "labelText",
      })[0] as HTMLTextAreaElement
    ).value,
  ).toBe("# Willkommen\n\n**Hallo**");
  act(() => client.actionOptionsByAction.get(updateTheme).onSuccess({ input }));
  expect(disabled("labelSave")).toBe(true);
  fireEvent.change(screen.getByDisplayValue("Bonjour"), {
    target: { value: "Unsaved" },
  });
  discardTheme();
  expect(screen.getByDisplayValue("Bonjour")).toBeTruthy();
  fireEvent.click(screen.getByRole("tab", { name: "labelOverview" }));
  fireEvent.click(screen.getByRole("button", { name: "labelColors" }));
  fireEvent.click(screen.getByRole("button", { name: "labelText" }));
  expect(screen.getByText("Color draft")).toBeTruthy();
  expect(
    screen.getByText(/# Willkommen\s+\*\*Hallo\*\*/, { selector: "div" }),
  ).toBeTruthy();
  openColors("Color draft");
  expect(screen.getByDisplayValue("Color draft")).toBeTruthy();
  expect(disabled("labelSave")).toBe(true);
});
