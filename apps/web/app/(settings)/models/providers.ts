import {
  externalModelProviders,
  type ExternalModelProvider,
} from "@schornio/aibox-package-database/aiModel/_schema";
export { externalModelProviders };
export const providers: Record<
  ExternalModelProvider,
  { name: string; baseUrl: string }
> = {
  mistral: { name: "Mistral", baseUrl: "https://api.mistral.ai/v1" },
  huggingface: {
    name: "Hugging Face",
    baseUrl: "https://router.huggingface.co/v1",
  },
  openai: { name: "OpenAI", baseUrl: "https://api.openai.com/v1" },
  "openai-azure": { name: "Azure OpenAI", baseUrl: "" },
  antropic: { name: "Anthropic", baseUrl: "https://api.anthropic.com/v1" },
  "antropic-aws": {
    name: "Anthropic · Amazon Bedrock",
    baseUrl: "https://bedrock-runtime.eu-central-1.amazonaws.com",
  },
  google: {
    name: "Google",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  },
  "openai-compatible": { name: "OpenAI-compatible", baseUrl: "" },
};
