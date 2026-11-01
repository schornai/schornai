// @vitest-environment jsdom
import "./client-setup";
import { client } from "./client-setup";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { FileIcon } from "../../apps/web/app/_components/FileIcon";
import { FileLabel } from "../../apps/web/app/_components/FileLabel";
import { UserRoleIcon } from "../../apps/web/app/_components/UserRoleIcon";
import { UserRoleText } from "../../apps/web/app/_components/UserRoleText";
import { InputChangeIndicator } from "../../apps/web/app/_components/InputChangeIndicator";
import { StorageBreadcrumbs } from "../../apps/web/app/_components/StorageBreadcrumbs";
import { Pagination } from "../../apps/web/app/_components/Pagination";
import {
  TabsMainListContext,
  TabsMainList,
  TabsMainTrigger,
  TabsMainContent,
} from "../../apps/web/app/_components/TabsMain";
import { TabsSub, TabsSubList } from "../../apps/web/app/_components/Tabs";
import {
  TabsTrigger,
  TabsContent,
} from "../../packages/ui/src/components/tabs";
afterEach(cleanup);
beforeEach(() => {
  client.params = new URLSearchParams();
  client.push.mockClear();
});

it.each([
  "audio.mp3",
  "video.mp4",
  "code.ts",
  "image.png",
  "plain.txt",
  "slides.pptx",
  "document.pdf",
  "sheet.xlsx",
  "unknown.xyz",
  undefined,
])("renders the matching file icon for %s", (path) => {
  const { container } = render(<FileIcon path={path} className="custom" />);
  expect(container.querySelector("svg")!.classList.contains("custom")).toBe(
    true,
  );
});
it.each(["admin", "workspace-admin", "editor", "user", "unknown", undefined])(
  "renders role %s consistently",
  (role) => {
    const { container } = render(
      <>
        <UserRoleIcon role={role} className="custom" />
        <UserRoleText role={role} />
      </>,
    );
    expect(container.querySelector("svg")!.classList.contains("custom")).toBe(
      true,
    );
    expect(container.textContent).toBe(
      ["admin", "workspace-admin", "editor", "user"].includes(role!)
        ? role
        : "none",
    );
  },
);
it("labels file extensions and displays change indicators only when values differ", () => {
  const view = render(<FileLabel path="folder/file.txt" className="custom" />);
  expect(view.container.textContent).toBe("txt");
  view.rerender(
    <InputChangeIndicator defaultValue="same" value="same" readOnly />,
  );
  expect(
    view.container.querySelector('[data-slot="input-group-addon"]'),
  ).toBeNull();
  view.rerender(
    <InputChangeIndicator defaultValue="before" value="after" readOnly />,
  );
  expect(
    view.container.querySelector('[data-slot="input-group-addon"]'),
  ).not.toBeNull();
});
it("builds normalized breadcrumb paths with a root link", () => {
  const view = render(
    <StorageBreadcrumbs basePathApp="/files" path="/one/./two/../three" />,
  );
  expect(
    screen.getAllByRole("link").map((link) => link.getAttribute("href")),
  ).toEqual(["/files", "/files/one", "/files/one/three"]);
  view.rerender(<StorageBreadcrumbs basePathApp="/files" path="/" />);
  expect(screen.getAllByRole("link")).toHaveLength(1);
});
it("clamps pagination, sends zero-based values and hides unnecessary pages", () => {
  const onChange = vi.fn();
  const view = render(<Pagination max={1} onChange={onChange} />);
  expect(view.container.textContent).toBe("");
  view.rerender(<Pagination max={5} onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: "labelPrev" }));
  expect(onChange).toHaveBeenLastCalledWith(0);
  fireEvent.click(screen.getByRole("button", { name: "labelNext" }));
  expect(onChange).toHaveBeenLastCalledWith(1);
  for (const [label, value] of [
    ["1", 0],
    ["2", 1],
    ["3", 2],
  ] as const) {
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(onChange).toHaveBeenLastCalledWith(value);
  }
  view.rerender(<Pagination max={5} value={4} onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: "labelNext" }));
  expect(onChange).toHaveBeenLastCalledWith(4);
  expect(screen.getByRole("button", { name: "5" })).not.toBeNull();
  view.rerender(<Pagination max={2} value={1} />);
  fireEvent.click(screen.getByRole("button", { name: "labelPrev" }));
  expect(screen.queryByRole("button", { name: "3" })).toBeNull();
});
it("routes main tab changes with a configurable parameter and renders only current content", () => {
  const view = render(
    <TabsMainListContext searchParamView="tab">
      <TabsMainList stickyTop>
        <TabsMainTrigger view="default">Overview</TabsMainTrigger>
        <TabsMainTrigger view="settings">Settings</TabsMainTrigger>
      </TabsMainList>
      <TabsMainContent view="default">Default content</TabsMainContent>
      <TabsMainContent view="settings">Settings content</TabsMainContent>
    </TabsMainListContext>,
  );
  expect(screen.queryByText("Settings content")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  expect(client.push).toHaveBeenLastCalledWith("/test?tab=settings");
  fireEvent.click(screen.getByRole("button", { name: "Overview" }));
  expect(client.push).toHaveBeenLastCalledWith("/test");
  client.params = new URLSearchParams("tab=settings");
  view.rerender(
    <TabsMainListContext searchParamView="tab">
      <TabsMainContent view="settings">Settings content</TabsMainContent>
    </TabsMainListContext>,
  );
  expect(screen.getByText("Settings content")).not.toBeNull();
});
it("preserves unrelated search parameters for subtabs and clears the default value", () => {
  const content = () => (
    <TabsSub searchParamsKey="sub">
      <TabsSubList>
        <TabsTrigger value="default">Overview</TabsTrigger>
        <TabsTrigger value="other">Other</TabsTrigger>
      </TabsSubList>
      <TabsContent value="default">Default</TabsContent>
      <TabsContent value="other">Other content</TabsContent>
    </TabsSub>
  );
  const view = render(content());
  fireEvent.click(screen.getByRole("tab", { name: "Other" }));
  expect(client.push).toHaveBeenLastCalledWith("/test?sub=other", {
    scroll: false,
  });
  client.params = new URLSearchParams("filter=keep&sub=other");
  view.rerender(content());
  fireEvent.click(screen.getByRole("tab", { name: "Overview" }));
  expect(client.push).toHaveBeenLastCalledWith("/test?filter=keep", {
    scroll: false,
  });
  client.params = new URLSearchParams("sub=other");
  view.rerender(
    <TabsSub searchParamsKey="sub">
      <TabsSubList>
        <TabsTrigger value="default">Overview</TabsTrigger>
      </TabsSubList>
    </TabsSub>,
  );
  fireEvent.click(screen.getByRole("tab", { name: "Overview" }));
  expect(client.push).toHaveBeenLastCalledWith("/test", { scroll: false });
});
