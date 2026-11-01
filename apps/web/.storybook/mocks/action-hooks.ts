import { getServiceFixture } from "../service-fixtures";
import { useState } from "react";
import { fn } from "storybook/test";
import { scenarioState } from "../scenario";
import { actionValidationErrors } from "../validation-errors";

type Result = {
  data?: unknown;
  serverError?: string;
  validationErrors?: Record<string, unknown>;
};
type Callbacks = {
  onExecute?: (value: unknown) => void;
  onSuccess?: (value: unknown) => void;
  onError?: (value: unknown) => void;
  onSettled?: (value: unknown) => void;
};

export function useAction(_action: unknown, callbacks: Callbacks = {}) {
  const initial = scenarioState.current;
  const [status, setStatus] = useState(
    initial === "default" || initial === "empty" ? "idle" : initial,
  );
  const result: Result =
    status === "error"
      ? {
          serverError: "Storybook: Aktion fehlgeschlagen",
          validationErrors: actionValidationErrors,
        }
      : status === "success"
        ? { data: getServiceFixture("actionResult", {}) }
        : {};
  const executeAsync = fn(async (input?: unknown) => {
    callbacks.onExecute?.({ input });
    setStatus("pending");
    await new Promise((resolve) => setTimeout(resolve, 300));
    const failed = scenarioState.current === "error";
    const next: Result = failed
      ? { serverError: "Storybook: Aktion fehlgeschlagen" }
      : { data: getServiceFixture("actionResult", {}) };
    setStatus(failed ? "error" : "success");
    if (failed) callbacks.onError?.({ error: next, input });
    else callbacks.onSuccess?.({ data: next.data, input });
    callbacks.onSettled?.({ result: next, input });
    return next;
  });
  return {
    executeAsync,
    execute: fn((input?: unknown) => {
      void executeAsync(input);
    }),
    result,
    status,
    isIdle: status === "idle",
    isPending: status === "pending",
    isExecuting: status === "pending",
    hasErrored: status === "error",
    hasSucceeded: status === "success",
    reset: () => setStatus("idle"),
  };
}
export const useOptimisticAction = useAction;
