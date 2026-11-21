export const externalModelPreview = {
  isCollection: true,
  source: { path: "user/archive/example.xrag.tar", name: "Agent.xrag.tar" },
  digest: "a".repeat(64),
  entries: [
    {
      archiveId: "b".repeat(64),
      id: "support",
      name: "Support Agent",
      kind: "agent" as const,
      color: { type: "color-oklch-hue" as const, oklchHue: 150 },
      icon: { type: "icon-lucide" as const, iconName: "bot" },
      description: "Beantwortet Fragen zu internen Abläufen.",
      needsWorkspace: true,
      revision: null,
      size: 1024,
    },
  ],
  externalModels: [
    {
      sourceIdentifier: "external:source",
      provider: "openai",
      modelId: "gpt-example",
      selectedIdentifier: null,
      candidates: [
        { identifier: "external:team", name: "OpenAI Team" },
        { identifier: "external:project", name: "OpenAI Projekt" },
      ],
    },
  ],
};
export const modelPreview = {
  isCollection: true,
  source: { path: "user/archive/example.xrag.tar", name: "Agent.xrag.tar" },
  digest: "a".repeat(64),
  entries: [
    {
      archiveId: "c".repeat(64),
      id: "model",
      name: "Whisper tiny",
      kind: "mlxWhisperModel" as const,
      description: "",
      needsWorkspace: false,
      revision: null,
      size: 1024,
    },
  ],
  externalModels: [],
};
