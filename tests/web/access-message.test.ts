import { describe, it, expect } from "vitest";
import {
  accessMessageSchema,
  renderAccessMessage,
  getAccessMessageTemplate,
  defaultAccessMessages,
  accessMessageMailto,
} from "../../apps/web/lib/accessMessage";
const values = {
  firstName: "{{resetKey}} $&",
  lastName: "",
  fullName: "",
  email: "a+b@example.test",
  resetKey: "secret",
  resetUrl: "https://example.test/signin/reset",
  expires: "tomorrow",
};
describe("access messages", () => {
  it("replaces repeated placeholders once without interpreting user data", () => {
    expect(
      renderAccessMessage("{{ firstName }} {{resetKey}} {{resetKey}}", values),
    ).toBe("{{resetKey}} $& secret secret");
  });
  it("rejects unknown placeholders, template expressions and subject line breaks", () => {
    for (const body of [
      "{{unknown}}",
      "{{#if firstName}}yes{{/if}}",
      "{{email",
      "",
    ]) {
      expect(
        accessMessageSchema.safeParse({
          localized: { de: { subject: "Hello", body } },
        }).success,
      ).toBe(false);
    }
    expect(
      accessMessageSchema.safeParse({
        localized: { de: { subject: "hello\nbcc: other", body: "hello" } },
      }).success,
    ).toBe(false);
    expect(
      accessMessageSchema.safeParse({ localized: defaultAccessMessages })
        .success,
    ).toBe(true);
  });
  it("selects region, base language, custom fallback and built-in defaults", () => {
    expect(getAccessMessageTemplate({}, "de-AT")).toBe(
      defaultAccessMessages.de,
    );
    expect(getAccessMessageTemplate({}, "fr")).toBe(defaultAccessMessages.en);
    const custom = { subject: "Custom", body: "Hello" };
    expect(getAccessMessageTemplate({ en: custom }, "de")).toBe(custom);
  });
  it("encodes mailto fields independently including newlines and reserved characters", () => {
    const url = accessMessageMailto(
      values.email,
      "Hello & welcome",
      "Key: a&b\nNext",
    );
    expect(url).toBe(
      "mailto:a%2Bb%40example.test?subject=Hello%20%26%20welcome&body=Key%3A%20a%26b%0D%0ANext",
    );
  });
});
