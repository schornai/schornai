import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const defaultRoot = resolve(
  import.meta.dirname,
  "../apps/web/app/i18n/locales",
);

function entries(value, prefix = "", result = new Map()) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Translation namespaces must contain JSON objects.");
  }
  for (const [key, child] of Object.entries(value)) {
    const pointer = `${prefix}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`;
    if (typeof child === "string") result.set(pointer, "string");
    else {
      result.set(pointer, "object");
      entries(child, pointer, result);
    }
  }
  return result;
}

export function checkTranslations(root = defaultRoot) {
  const errors = [];
  const warnings = [];
  let languages;
  try {
    languages = readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return { errors: [`Cannot read translation directory: ${root}`], warnings };
  }

  function readLanguage(language, issues) {
    const resources = new Map();
    try {
      const files = readdirSync(resolve(root, language))
        .filter((file) => file.endsWith(".json"))
        .sort();
      if (files.length === 0)
        issues.push(`${language}: no translation JSON files.`);
      for (const file of files) {
        try {
          resources.set(
            file,
            entries(
              JSON.parse(readFileSync(resolve(root, language, file), "utf8")),
            ),
          );
        } catch {
          issues.push(
            `${language}/${file}: invalid translation JSON (expected nested objects and strings).`,
          );
        }
      }
    } catch {
      issues.push(
        `${language}: translation directory is missing or unreadable.`,
      );
    }
    return resources;
  }

  function compare(reference, actual, referenceName, language, issues) {
    for (const file of new Set([...reference.keys(), ...actual.keys()])) {
      if (!reference.has(file)) {
        issues.push(
          `${language}/${file}: extra JSON file compared with ${referenceName}.`,
        );
        continue;
      }
      if (!actual.has(file)) {
        issues.push(
          `${language}/${file}: missing JSON file from ${referenceName}.`,
        );
        continue;
      }
      const expected = reference.get(file);
      const found = actual.get(file);
      for (const key of new Set([...expected.keys(), ...found.keys()])) {
        if (!found.has(key))
          issues.push(
            `${language}/${file}${key}: missing entry from ${referenceName}.`,
          );
        else if (!expected.has(key))
          issues.push(
            `${language}/${file}${key}: extra entry compared with ${referenceName}.`,
          );
        else if (found.get(key) !== expected.get(key))
          issues.push(
            `${language}/${file}${key}: entry type differs from ${referenceName}.`,
          );
      }
    }
  }

  const german = readLanguage("de", errors);
  const english = readLanguage("en", errors);
  compare(german, english, "de", "en", errors);
  for (const language of languages.filter(
    (language) => language !== "de" && language !== "en",
  )) {
    const translated = readLanguage(language, warnings);
    compare(german, translated, "de/en", language, warnings);
  }
  return { errors, warnings };
}

export function runTranslationCheck(root = defaultRoot) {
  const { errors, warnings } = checkTranslations(root);
  for (const error of errors) console.error(`ERROR: ${error}`);
  // Keep routine feature commits readable even when many secondary entries lag.
  for (const warning of warnings.slice(0, 30))
    console.warn(`WARNING: ${warning}`);
  if (warnings.length > 30)
    console.warn(
      `WARNING: ${warnings.length - 30} further secondary-language differences.`,
    );
  console.log(
    `i18n: ${errors.length} primary errors, ${warnings.length} secondary warnings. Secondary languages are updated only on explicit request.`,
  );
  return errors.length ? 1 : 0;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  process.exitCode = runTranslationCheck();
}
