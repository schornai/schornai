import { z } from "zod";
import {
  themeSettingsSchema,
  welcomeMessageSettingsSchema,
} from "./themeSettings";
import { accessMessageSchema } from "./accessMessage";

export const themeEditorSettingsSchema = z.object({
  theme: themeSettingsSchema,
  welcomeMessage: welcomeMessageSettingsSchema.shape.localized,
  accessMessage: accessMessageSchema.shape.localized,
});
export type ThemeEditorSettings = z.infer<typeof themeEditorSettingsSchema>;
