import type { Meta, StoryObj } from "@storybook/react-vite";
import { ContainerTable } from "./container-table.tsx";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "./table.tsx";
const meta = {
  title: "UI/ContainerTable",
  component: ContainerTable,
  args: {
    children: (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Alex</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    ),
  },
} satisfies Meta<typeof ContainerTable>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Empty: Story = { args: { children: undefined } };
export const Overflow: Story = {
  args: {
    children: (
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>{"Inhalt ".repeat(100)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    ),
  },
};
