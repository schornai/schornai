import { omitNullish } from "@schornio/aibox-package-utils/omitNullish";

export async function getOllamaModelIdentifiers(
  ollamaUrl: string,
  abortSignal?: AbortSignal,
) {
  const timeout = AbortSignal.timeout(3_000);
  const response = await fetch(`${ollamaUrl}/v1/models`, {
    signal: abortSignal ? AbortSignal.any([abortSignal, timeout]) : timeout,
  });
  if (!response.ok) {
    throw new Error(`Unable to list Ollama models: HTTP ${response.status}`);
  }

  const body = (await response.json()) as unknown;

  const modelIdentifiers =
    body &&
    typeof body === "object" &&
    "data" in body &&
    Array.isArray(body.data)
      ? body.data
          .map((model: unknown) =>
            model &&
            typeof model === "object" &&
            "id" in model &&
            typeof model.id === "string"
              ? model.id
              : undefined,
          )
          .filter(omitNullish)
      : [];

  // Ollama treats an omitted tag as :latest; queue capabilities must do so too.
  return [
    ...new Set(
      modelIdentifiers.flatMap((id) =>
        id.endsWith(":latest") ? [id, id.slice(0, -":latest".length)] : [id],
      ),
    ),
  ];
}
