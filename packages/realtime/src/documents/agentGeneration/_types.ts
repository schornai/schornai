import type { LanguageModel } from "ai";

export type LanguageModelV4 = Extract<
  LanguageModel,
  { specificationVersion: "v4" }
>;

export type LanguageModelV4DoGenerateParameters = Parameters<
  LanguageModelV4["doGenerate"]
>[0];

export type LanguageModelV4DoGenerateResult = Awaited<
  ReturnType<LanguageModelV4["doGenerate"]>
>;

export type LanguageModelV4DoStreamParameters = Parameters<
  LanguageModelV4["doStream"]
>[0];

export type LanguageModelV4StreamPart =
  Awaited<
    ReturnType<LanguageModelV4["doStream"]>
  >["stream"] extends ReadableStream<infer T>
    ? T
    : never;
