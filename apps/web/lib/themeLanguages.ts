// The first saved variant is shared by every language without its own content.
// Ignore empty drafts so they never hide a saved variant or a built-in default.
export function getThemeLocalized<T extends string | { url: string }>(
  localized: Record<string, T> | undefined,
  language: string,
): T | undefined {
  const variants = Object.entries(localized ?? {}).filter(([, value]) =>
    (typeof value === "string" ? value : value.url).trim(),
  );
  return variants.find(([key]) => key === language)?.[1] ?? variants[0]?.[1];
}

export function getThemeLanguageName(
  language: string,
  displayLanguage: string,
) {
  try {
    return (
      new Intl.DisplayNames([displayLanguage], { type: "language" }).of(
        language,
      ) ?? language
    );
  } catch {
    return language;
  }
}
