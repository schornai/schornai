import type { ReindexState } from "./_types.ts";
import type { Doc as YDoc } from "yjs";

export function setReindexStates(document: YDoc, states: ReindexState[]) {
  const statesArray = document.getArray<ReindexState>("state");

  document?.transact(() => {
    const currentStates = statesArray.toArray();
    const currentStatesById = new Map(
      currentStates.map((state, index) => [state.id, { index, state }]),
    );

    const newStates: ReindexState[] = [];
    for (const state of states) {
      const currentState = currentStatesById.get(state.id);

      if (currentState) {
        statesArray.delete(currentState.index, 1);
        statesArray.insert(currentState.index, [state]);
      } else {
        newStates.push(state);
      }
    }

    if (newStates.length > 0) {
      statesArray.push(newStates);
    }
  });
}
