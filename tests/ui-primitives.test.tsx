// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import * as alert from "../packages/ui/src/components/alert";
import * as attachment from "../packages/ui/src/components/attachment";
import * as breadcrumb from "../packages/ui/src/components/breadcrumb";
import * as bubble from "../packages/ui/src/components/bubble";
import * as card from "../packages/ui/src/components/card";
import * as checklist from "../packages/ui/src/components/checklist";
import * as empty from "../packages/ui/src/components/empty";
import * as field from "../packages/ui/src/components/field";
import * as inputGroup from "../packages/ui/src/components/input-group";
import * as marker from "../packages/ui/src/components/marker";
import * as message from "../packages/ui/src/components/message";
import * as pagination from "../packages/ui/src/components/pagination";
import { Button } from "../packages/ui/src/components/button";
import { ButtonAction } from "../packages/ui/src/components/button-action";
import { Input } from "../packages/ui/src/components/input";
import { Textarea } from "../packages/ui/src/components/textarea";
import { Badge } from "../packages/ui/src/components/badge";
import { Label } from "../packages/ui/src/components/label";
import { Skeleton } from "../packages/ui/src/components/skeleton";
import { CodeInline } from "../packages/ui/src/components/code-inline";
import { ContainerStyled } from "../packages/ui/src/components/container-styled";
import { ContainerMain } from "../packages/ui/src/components/container-main";
import { Link } from "../packages/ui/src/components/link";
import { AvatarUser } from "../packages/ui/src/components/avatar-user";
import { AvatarApp } from "../packages/ui/src/components/avatar-app";
import { cn } from "../packages/ui/src/lib/utils";

vi.mock("lucide-react/dynamic", () => ({
  DynamicIcon: ({ name }: { name: string }) => <svg data-icon={name} />,
}));
afterEach(cleanup);

// All entries are production components imported by an app; contextual controls
// (menus, dialogs, tabs, tables) are tested in composed suites instead.
const wrappers = {
  ...alert,
  ...attachment,
  ...bubble,
  ...card,
  ...checklist,
  ...empty,
  ...inputGroup,
  ...marker,
  ...message,
  Field: field.Field,
  FieldContent: field.FieldContent,
  FieldDescription: field.FieldDescription,
  FieldGroup: field.FieldGroup,
  FieldLabel: field.FieldLabel,
  FieldTitle: field.FieldTitle,
  BreadcrumbLink: breadcrumb.BreadcrumbLink,
  BreadcrumbPage: breadcrumb.BreadcrumbPage,
  Pagination: pagination.Pagination,
  PaginationContent: pagination.PaginationContent,
  PaginationItem: pagination.PaginationItem,
  PaginationLink: pagination.PaginationLink,
  Badge,
  Label,
  Skeleton,
  CodeInline,
  ContainerStyled,
  ContainerMain,
};
const components = Object.entries(wrappers).filter(
  ([name, value]) =>
    /^[A-Z]/.test(name) &&
    typeof value === "function" &&
    !["InputGroupInput", "InputGroupTextarea"].includes(name),
);

describe("presentational component contracts", () => {
  it.each(components)(
    "%s forwards accessible content, custom classes and DOM attributes",
    (name, Component) => {
      const { container } = render(
        createElement(
          Component as any,
          {
            className: "test-custom",
            "data-testid": "component",
            "aria-label": name,
          },
          "Content",
        ),
      );
      const element = screen.getByTestId("component");
      expect(element.classList.contains("test-custom")).toBe(true);
      expect(element.getAttribute("aria-label")).toBe(name);
      expect(container.textContent).toContain("Content");
    },
  );
  it("merges conflicting Tailwind classes and conditional inputs", () => {
    expect(cn("p-2", false, { "p-4": true }, ["text-sm"])).toBe("p-4 text-sm");
  });
  it("renders structured form fields with deduplicated validation errors", () => {
    const form = render(
      <field.FieldSet>
        <field.FieldLegend>Form</field.FieldLegend>
        <field.FieldGroup>
          <field.Field orientation="horizontal">
            <field.FieldLabel htmlFor="name">Name</field.FieldLabel>
            <Input id="name" />
            <field.FieldError
              errors={[{ message: "Required" }, { message: "Required" }]}
            />
          </field.Field>
          <field.FieldSeparator>Or</field.FieldSeparator>
        </field.FieldGroup>
      </field.FieldSet>,
    );
    expect(screen.getByLabelText("Name").tagName).toBe("INPUT");
    expect(screen.getAllByText("Required")).toHaveLength(1);
    expect(screen.getByRole("alert").textContent).toBe("Required");
    form.rerender(
      <field.FieldError
        errors={[{ message: "Required" }, undefined, { message: "Invalid" }]}
      />,
    );
    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual(["Required", "Invalid"]);
    form.rerender(
      <field.FieldError errors={[{ message: "Ignored" }]}>
        Override
      </field.FieldError>,
    );
    expect(screen.getByRole("alert").textContent).toBe("Override");
    form.rerender(<field.FieldError errors={[]} />);
    expect(screen.queryByRole("alert")).toBeNull();
    form.rerender(<field.FieldError errors={[undefined]} />);
    expect(screen.queryByRole("alert")).toBeNull();
    form.rerender(<field.FieldSeparator />);
    expect(
      form.container.querySelector('[data-content="false"]'),
    ).not.toBeNull();
  });
  it("forwards input values and change handlers for all text controls", () => {
    const change = vi.fn();
    const view = render(
      <>
        <Input aria-label="Input" defaultValue="start" onChange={change} />
        <Textarea aria-label="Textarea" defaultValue="body" onChange={change} />
        <inputGroup.InputGroupInput aria-label="Grouped input" />
        <inputGroup.InputGroupTextarea aria-label="Grouped textarea" />
      </>,
    );
    fireEvent.change(screen.getByLabelText("Input"), {
      target: { value: "new" },
    });
    fireEvent.change(screen.getByLabelText("Textarea"), {
      target: { value: "new body" },
    });
    expect(change).toHaveBeenCalledTimes(2);
    expect((screen.getByLabelText("Input") as HTMLInputElement).value).toBe(
      "new",
    );
    expect(
      view.container.querySelectorAll('[data-slot="input-group-control"]'),
    ).toHaveLength(2);
  });
  it("blocks disabled buttons and forwards normal clicks", () => {
    const clicked = vi.fn();
    const view = render(<Button onClick={clicked}>Save</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(clicked).toHaveBeenCalledOnce();
    view.rerender(
      <Button disabled onClick={clicked} variant="destructive" size="sm">
        Save
      </Button>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(clicked).toHaveBeenCalledOnce();
  });
  it.each([
    [{}, true, false, false],
    [{ isPending: true }, true, true, true],
    [{ isPending: true, indicator: "replace" }, false, true, true],
    [{ hasErrored: true, indicator: "replace" }, false, false, false],
    [{ hasSucceeded: true }, true, false, false],
    [{ hasSucceeded: true, indicator: "replace" }, false, false, false],
    [{ hasErrored: true, isPending: true }, true, true, false],
    [{ disabled: true }, true, true, false],
  ])(
    "renders action-button status %j",
    (props, textVisible, disabled, spinner) => {
      render(<ButtonAction {...(props as any)}>Save</ButtonAction>);
      const button = screen.getByRole("button") as HTMLButtonElement;
      expect(button.textContent!.includes("Save")).toBe(textVisible);
      expect(button.disabled).toBe(disabled);
      expect(!!button.querySelector(".animate-spin")).toBe(spinner);
    },
  );
  it("distinguishes internal and external links and forwards anchor attributes", () => {
    const view = render(
      <Link href="/relative" title="Link">
        Local
      </Link>,
    );
    expect(view.container.querySelector("svg")).toBeNull();
    view.rerender(
      <Link href="https://external.test" target="_blank">
        External
      </Link>,
    );
    expect(view.container.querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("link").getAttribute("target")).toBe("_blank");
    view.rerender(<Link>Without URL</Link>);
    expect(view.container.textContent).toBe("Without URL");
  });
  it("renders user and app initials, icons and image alternatives", () => {
    const view = render(
      <AvatarUser firstName="Ada" lastName="Lovelace" size2XL />,
    );
    expect(view.container.textContent).toBe("AL");
    view.rerender(<AvatarUser size8XL />);
    expect(view.container.querySelector("svg")).not.toBeNull();
    view.rerender(<AvatarUser avatarUrl="avatar.png" />);
    expect(view.container.querySelector('[data-slot="avatar"]')).not.toBeNull();
    view.rerender(<AvatarApp fallback=" Ada Lovelace " />);
    expect(view.container.textContent).toBe("AL");
    view.rerender(<AvatarApp />);
    expect(view.container.textContent).toBe("");
    view.rerender(
      <AvatarApp icon={{ type: "icon-lucide", iconName: "bot" }} />,
    );
    expect(view.container.querySelector('[data-icon="bot"]')).not.toBeNull();
    view.rerender(
      <AvatarApp
        image={{
          type: "supabase-storage-path",
          storage: "bucket",
          path: "image",
        }}
      />,
    );
    expect(view.container.querySelector('[data-slot="avatar"]')).not.toBeNull();
  });
});
