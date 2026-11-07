import { z } from "zod";

export const accessMessagePlaceholders = [
  "firstName",
  "lastName",
  "fullName",
  "email",
  "resetUrl",
  "resetKey",
  "expires",
] as const;
export type AccessMessageValues = Record<
  (typeof accessMessagePlaceholders)[number],
  string
>;

// One pass: values are literal text, never interpreted as another placeholder.
export function renderAccessMessage(
  template: string,
  values: AccessMessageValues,
) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (match, key: string) =>
    Object.hasOwn(values, key)
      ? values[key as keyof AccessMessageValues]
      : match,
  );
}
function validPlaceholders(value: string) {
  return !value
    .replace(/{{\s*(\w+)\s*}}/g, (match, key: string) =>
      accessMessagePlaceholders.includes(key as keyof AccessMessageValues)
        ? ""
        : match,
    )
    .match(/{{|}}/);
}
export const accessMessageSchema = z.object({
  localized: z.record(
    z.string(),
    z.object({
      subject: z
        .string()
        .trim()
        .min(1)
        .max(300)
        .refine((text) => !/[\r\n]/.test(text))
        .refine(validPlaceholders),
      body: z.string().trim().min(1).max(10000).refine(validPlaceholders),
    }),
  ),
});
export type AccessMessageTemplates = z.infer<
  typeof accessMessageSchema
>["localized"];
export const defaultAccessMessages: AccessMessageTemplates = {
  de: {
    subject: "Ihr Zugang zu schorn.ai",
    body: "Guten Tag,\n\nIhr Zugang zu schorn.ai ist bereit.\n\nSo legen Sie Ihr persönliches Passwort fest:\n1. Öffnen Sie {{resetUrl}}\n2. Geben Sie Ihre E-Mail-Adresse und den folgenden Schlüssel ein.\n3. Wählen Sie ein sicheres Passwort und melden Sie sich anschließend an.\n\nE-Mail-Adresse: {{email}}\nSchlüssel: {{resetKey}}\nGültig bis: {{expires}}\n\nDer Schlüssel ist einmalig verwendbar. Bitte behandeln Sie diese Nachricht vertraulich. Falls der Schlüssel abgelaufen ist oder Sie Hilfe benötigen, wenden Sie sich bitte an die Person, die Ihnen diesen Zugang eingerichtet hat.\n\nViel Freude mit schorn.ai!",
  },
  en: {
    subject: "Your access to schorn.ai",
    body: "Hello,\n\nYour schorn.ai account is ready.\n\nTo set your personal password:\n1. Open {{resetUrl}}\n2. Enter your email address and the key below.\n3. Choose a secure password, then sign in.\n\nEmail address: {{email}}\nKey: {{resetKey}}\nValid until: {{expires}}\n\nThis key can only be used once. Please keep this message confidential. If the key has expired or you need help, please contact the person who created your account.\n\nEnjoy using schorn.ai!",
  },
};
export function getAccessMessageTemplate(
  templates: AccessMessageTemplates,
  language: string,
) {
  const base = language.split("-")[0] ?? "en";
  return (
    templates[language] ??
    templates[base] ??
    Object.values(templates)[0] ??
    defaultAccessMessages[base] ??
    defaultAccessMessages.en!
  );
}
export function accessMessageMailto(
  email: string,
  subject: string,
  body: string,
) {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject.replace(/[\r\n]/g, " "))}&body=${encodeURIComponent(body.replace(/\r?\n/g, "\r\n"))}`;
}

/** Shared by the invitation dialog and platform tools. Values are substituted once. */
export function composeAccessMessage({
  templates = {},
  language,
  timeZone,
  applicationUrl,
  email,
  firstName = "",
  lastName = "",
  resetKey,
  expires,
}: {
  templates?: AccessMessageTemplates;
  language: string;
  timeZone?: string;
  applicationUrl: string;
  email: string;
  firstName?: string;
  lastName?: string;
  resetKey: string;
  expires: string;
}) {
  const origin = new URL(applicationUrl);
  if (
    !["http:", "https:"].includes(origin.protocol) ||
    origin.username ||
    origin.password
  )
    throw new Error("INVALID_APPLICATION_URL");
  const resetUrl = `${origin.origin}/signin/reset`;
  const template = getAccessMessageTemplate(templates, language);
  const values = {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
    email,
    resetKey,
    resetUrl,
    expires: new Date(expires).toLocaleString(language, { timeZone }),
  };
  return {
    email,
    resetUrl,
    subject: renderAccessMessage(template.subject, values),
    body: renderAccessMessage(template.body, values),
  };
}

export function parseAccessMessageTemplates(
  value: string | undefined,
): AccessMessageTemplates {
  try {
    return accessMessageSchema.parse(JSON.parse(value ?? "")).localized;
  } catch {
    return {};
  }
}
