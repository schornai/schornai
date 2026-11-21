import { getServiceFixture } from "../../../../../../../service-fixtures";
export const submitVoiceMessage = async () =>
  getServiceFixture("submitVoiceMessage", { data: { queued: true } });
