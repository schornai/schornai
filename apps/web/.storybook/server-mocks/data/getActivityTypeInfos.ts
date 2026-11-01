import { getServiceFixture } from "../../service-fixtures";
import { adaptFixture, scenarioState } from "../../scenario";
export const getActivityTypeInfos = async () =>
  getServiceFixture(
    "getActivityTypeInfos",
    adaptFixture(new Map(), scenarioState.current),
  );
