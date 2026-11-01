export function getLocalized<T>(
  localized: Record<string, T> | undefined,
  currentLanguage: string,
  languages: readonly string[],
): T | undefined {
  if (!localized) {
    return undefined;
  }

  const current = localized[currentLanguage];

  if (current) {
    return current;
  }

  const fallbackLanguage = languages.find((lng) => localized[lng]);

  if (fallbackLanguage) {
    return localized[fallbackLanguage];
  }

  return undefined;
}
