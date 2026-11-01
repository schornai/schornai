import type { Meta, StoryObj } from "@storybook/react-vite";
import { Markdown } from "./markdown.tsx";
const meta = {
  title: "UI/Markdown",
  component: Markdown,
  parameters: { docs: { source: { type: "code" } } },
  render: (args) => <Markdown {...args} />,
  args: { children: "Beispieltext" },
} satisfies Meta<typeof Markdown>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Empty: Story = { args: { children: "" } };
export const Formatting: Story = {
  args: {
    children:
      "# Titel\n\n**Fett**, *kursiv*, ~~durchgestrichen~~ und `inline code`.\n\n---\n\n> Zitat\n\nZeile 1  \nZeile 2",
  },
};
export const Headings: Story = {
  args: {
    children:
      "# \u00dcberschrift 1\n\n## \u00dcberschrift 2\n\n### \u00dcberschrift 3\n\n#### \u00dcberschrift 4\n\n##### \u00dcberschrift 5\n\n###### \u00dcberschrift 6",
  },
};
export const Lists: Story = {
  args: {
    children:
      "- Eins\n- Zwei\n\n1. Eins\n2. Zwei\n\n- [x] Erledigt\n- [ ] Offen",
  },
};
export const Table: Story = {
  args: {
    children:
      "| Links | Mitte | Rechts |\n| :--- | :---: | ---: |\n| A | B | C |\n| 1 | 2 | 3 |",
  },
};
export const Links: Story = {
  args: { children: "[Intern](/internal) und [Extern](https://example.test/)" },
};
export const Code: Story = {
  args: { children: "```typescript\nconst answer: number = 42;\n```" },
};
export const Math: Story = {
  args: { children: "Inline $E=mc^2$.\n\n$$\n\\frac{a}{b}\n$$" },
};
export const HTML: Story = {
  args: {
    children: 'Text<br>Neue Zeile\n\n<script>alert("kein HTML")</script>',
  },
};
export const Image: Story = {
  args: { children: "![Beispiel](/api/storage/storybook-avatar.svg)" },
};
export const LongContent: Story = {
  args: {
    children:
      "Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. Ein langer Absatz mit vielen W\u00f6rtern. \n\n`long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_long_`",
  },
};
export const Note: Story = {
  args: { children: "> [!NOTE]\n> Beispielhinweis" },
};
export const Tip: Story = { args: { children: "> [!TIP]\n> Beispielhinweis" } };
export const Important: Story = {
  args: { children: "> [!IMPORTANT]\n> Beispielhinweis" },
};
export const Warning: Story = {
  args: { children: "> [!WARNING]\n> Beispielhinweis" },
};
export const Caution: Story = {
  args: { children: "> [!CAUTION]\n> Beispielhinweis" },
};
export const AST: Story = {
  args: {
    children: {
      type: "paragraph",
      children: [{ type: "text", value: "AST Inhalt" }],
    },
  },
};
export const ASTArray: Story = {
  args: {
    children: [
      { type: "text", value: "Erster " },
      { type: "strong", children: [{ type: "text", value: "zweiter" }] },
    ],
  },
};
export const Null: Story = { args: { children: null } };
