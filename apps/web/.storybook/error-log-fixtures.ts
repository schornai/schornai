import { deleteErrors } from "@schornio/aibox-package-ui/components/error-log";

export function seedErrorLogs(selection?: "selected" | "deselected" | "mixed") {
  deleteErrors();
  if (!selection) return;
  localStorage.setItem(
    "ai.schorn.aibox.package.ui.v1.error-logs",
    JSON.stringify({
      errorLogs: [0, 1].map((index) => ({
        id: `33333333-3333-4333-8333-${String(index).padStart(12, "0")}`,
        date: "2026-01-15T12:00:00.000Z",
        hint: "Storybook",
        message:
          "Beispielfehler\n" +
          "Eine ausführliche Fehlerbeschreibung.\n".repeat(12),
        send:
          selection === "selected" || (selection === "mixed" && index === 0),
      })),
    }),
  );
}
