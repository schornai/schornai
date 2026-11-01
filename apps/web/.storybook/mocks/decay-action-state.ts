import { useState } from "react";
import { scenarioState } from "../scenario";

export function useDecayActionState() {
  const [hasErrored, setHasErrored] = useState(
    scenarioState.current === "error",
  );
  const [hasSucceeded, setHasSucceeded] = useState(
    scenarioState.current === "success",
  );
  return {
    hasErrored,
    hasSucceeded,
    actionUtils: {
      onError: () => {
        setHasErrored(true);
        setHasSucceeded(false);
      },
      onSuccess: () => {
        setHasSucceeded(true);
        setHasErrored(false);
      },
    },
  };
}
