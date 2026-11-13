import type { ExternalModelProvider } from "@schornio/aibox-package-database/aiModel/_schema";

export type DiscoveredModel = {
  id: string;
  name: string;
  contextSize?: number;
};
export async function listExternalModels(input: {
  provider: ExternalModelProvider;
  baseUrl: string;
  apiKey: string;
  region?: string;
}) {
  // Azure's model catalog does not list the user's deployment names.
  if (input.provider === "openai-azure")
    return { models: [] as DiscoveredModel[], manual: true };
  const headers: Record<string, string> = {};
  if (input.provider === "antropic") {
    headers["x-api-key"] = input.apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else if (input.provider === "google")
    headers["x-goog-api-key"] = input.apiKey;
  else if (input.apiKey) headers.Authorization = `Bearer ${input.apiKey}`;
  const models = new Map<string, DiscoveredModel>();
  let cursor: string | undefined;
  try {
    if (input.provider === "antropic-aws") {
      if (!input.region || !/^[a-z]{2}(?:-[a-z]+)+-\d+$/.test(input.region))
        throw new Error();
      const base = `https://bedrock.${input.region}.amazonaws.com`;
      const request = async (path: string) => {
        const response = await fetch(`${base}${path}`, {
          headers,
          redirect: "error",
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) throw new Error();
        return response.json();
      };
      const body = await request(
        "/foundation-models?byProvider=Anthropic&byOutputModality=TEXT",
      );
      if (!Array.isArray(body.modelSummaries)) throw new Error();
      for (const row of body.modelSummaries) {
        if (
          typeof row.modelId === "string" &&
          row.inferenceTypesSupported?.includes("ON_DEMAND")
        )
          models.set(row.modelId, {
            id: row.modelId,
            name: row.modelName ?? row.modelId,
          });
      }
      for (let page = 0; page < 10; page++) {
        const profiles = await request(
          `/inference-profiles?maxResults=100${cursor ? `&nextToken=${encodeURIComponent(cursor)}` : ""}`,
        );
        if (!Array.isArray(profiles.inferenceProfileSummaries))
          throw new Error();
        for (const row of profiles.inferenceProfileSummaries) {
          if (
            row.status === "ACTIVE" &&
            typeof row.inferenceProfileId === "string" &&
            row.models?.some((model: { modelArn?: string }) =>
              model.modelArn?.includes("anthropic."),
            )
          )
            models.set(row.inferenceProfileId, {
              id: row.inferenceProfileId,
              name: row.inferenceProfileName ?? row.inferenceProfileId,
            });
        }
        if (!profiles.nextToken || profiles.nextToken === cursor) break;
        cursor = profiles.nextToken;
      }
      return {
        models: [...models.values()].sort((a, b) => a.id.localeCompare(b.id)),
        manual: false,
      };
    }
    for (let page = 0; page < 10; page++) {
      const url = new URL(`${input.baseUrl.replace(/\/+$/, "")}/models`);
      if (cursor)
        url.searchParams.set(
          input.provider === "google" ? "pageToken" : "after_id",
          cursor,
        );
      const response = await fetch(url, {
        headers,
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error();
      const body = await response.json();
      const rows = input.provider === "google" ? body.models : body.data;
      if (!Array.isArray(rows)) throw new Error();
      for (const row of rows) {
        if (
          input.provider === "google" &&
          !row.supportedGenerationMethods?.includes("generateContent")
        )
          continue;
        const id =
          input.provider === "google"
            ? row.name?.replace(/^models\//, "")
            : row.id;
        if (typeof id !== "string" || !id || id.length > 500) continue;
        const reportedContext =
          input.provider === "google"
            ? row.inputTokenLimit
            : input.provider === "antropic"
              ? row.max_input_tokens
              : input.provider === "mistral"
                ? row.max_context_length
                : undefined;
        const contextSize =
          Number.isSafeInteger(reportedContext) &&
          reportedContext > 0 &&
          reportedContext <= 2147483647
            ? (reportedContext as number)
            : undefined;
        const name = row.display_name ?? row.displayName ?? id;
        models.set(id, {
          id,
          name: typeof name === "string" ? name.slice(0, 500) : id,
          ...(contextSize ? { contextSize } : {}),
        });
        if (models.size >= 2000) break;
      }
      const next =
        input.provider === "google"
          ? body.nextPageToken
          : input.provider === "antropic" && body.has_more
            ? body.last_id
            : undefined;
      if (!next || next === cursor || models.size >= 2000) break;
      if (typeof next !== "string") throw new Error();
      cursor = next;
    }
    return {
      models: [...models.values()].sort((a, b) => a.id.localeCompare(b.id)),
      manual: false,
    };
  } catch {
    // Never return upstream bodies, URLs, or errors containing credentials.
    throw new Error("MODEL_DISCOVERY_FAILED");
  }
}
