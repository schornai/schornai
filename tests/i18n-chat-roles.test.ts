import { createInstance } from "i18next";
import { expect, it } from "vitest";
import deAgent from "../apps/web/app/i18n/locales/de/agent.json";
import enAgent from "../apps/web/app/i18n/locales/en/agent.json";
import deCommon from "../apps/web/app/i18n/locales/de/common.json";
import enCommon from "../apps/web/app/i18n/locales/en/common.json";

it.each(["de", "en"])(
  "resolves the chat placeholder and every role in %s",
  async (lng) => {
    const i18n = createInstance();
    await i18n.init({
      lng,
      fallbackLng: false,
      resources: {
        de: { agent: deAgent, common: deCommon },
        en: { agent: enAgent, common: enCommon },
      },
    });
    const placeholder =
      "_components.ChatComposeMessageSelected.placeholderMessage";
    expect(i18n.exists(placeholder, { ns: "agent" })).toBe(true);
    expect(i18n.t(placeholder, { ns: "agent" })).toBe(
      lng === "de" ? "Nachricht..." : "Message...",
    );
    for (const role of ["admin", "workspace-admin", "editor", "user", "none"]) {
      const key = `_components.UserRoleText.${role}`;
      expect(i18n.exists(key, { ns: "common" })).toBe(true);
      expect(i18n.t(key, { ns: "common" })).not.toBe(key);
    }
  },
);
