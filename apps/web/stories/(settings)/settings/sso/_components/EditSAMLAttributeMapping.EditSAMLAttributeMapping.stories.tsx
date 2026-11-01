import { repeatFixtures } from "../../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import EditSAMLAttributeMapping from "../../../../../app/(settings)/settings/sso/_components/EditSAMLAttributeMapping";

const meta = {
  title: "Web/(settings)/settings/sso/EditSAMLAttributeMapping",
  component: EditSAMLAttributeMapping,
  args: {
    ssoProvider: {
      created_at: "Beispiel",
      disabled: false,
      domains: ["Beispiel"],
      id: "11111111-1111-4111-8111-111111111111",
      saml: {
        attribute_mapping: { keys: {} },
        entity_id: "11111111-1111-4111-8111-111111111111",
        metadata_url: "Beispiel",
        metadata_xml: "Beispiel",
      },
      updated_at: "Beispiel",
    },
  },
} satisfies Meta<typeof EditSAMLAttributeMapping>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SsoProvider_disabled_false: Story = { args: {} };
export const SsoProvider_disabled_true: Story = {
  args: {
    ssoProvider: {
      created_at: "Beispiel",
      disabled: true,
      domains: ["Beispiel"],
      id: "11111111-1111-4111-8111-111111111111",
      saml: {
        attribute_mapping: { keys: {} },
        entity_id: "11111111-1111-4111-8111-111111111111",
        metadata_url: "Beispiel",
        metadata_xml: "Beispiel",
      },
      updated_at: "Beispiel",
    },
  },
};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const SsoProviderDomainsEmpty: Story = {
  args: { ssoProvider: { ...meta.args["ssoProvider"], domains: [] } },
};
export const SsoProviderDomainsMultiple: Story = {
  args: {
    ssoProvider: {
      ...meta.args["ssoProvider"],
      domains: repeatFixtures(meta.args["ssoProvider"]["domains"]),
    },
  },
};
