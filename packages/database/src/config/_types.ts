type SystemConfigLegacyKey = "defaultOllamaModelId";
export type SystemConfigKey =
  | "signIn"
  | "welcomeMessage"
  | "accessMessage"
  | "theme"
  | "defaultModel"
  | SystemConfigLegacyKey;
export type UserConfigKey = "favorites" | `groupSortView-${string}`;
