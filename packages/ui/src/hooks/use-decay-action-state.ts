import { useDecayState } from "./use-decay-state.ts";

export function useDecayActionState(timeoutMs?: number) {
  const [hasErrored, setHasErrored] = useDecayState(false, timeoutMs);
  const [hasSucceeded, setHasSucceeded] = useDecayState(false, timeoutMs);
  const actionUtils = {
    onError() {
      setHasErrored(true);
    },
    onSuccess() {
      setHasSucceeded(true);
    },
  };
  return { actionUtils, hasErrored, hasSucceeded };
}
