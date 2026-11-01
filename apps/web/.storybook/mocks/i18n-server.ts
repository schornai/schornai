import i18next from "i18next";
export async function getT(
  namespace?: string,
  options?: { keyPrefix?: string },
) {
  return {
    t: i18next.getFixedT(
      i18next.language || "de",
      namespace,
      options?.keyPrefix,
    ),
    i18n: i18next,
    lng: i18next.language || "de",
  };
}
export function getResources() {
  return i18next.options.resources;
}
