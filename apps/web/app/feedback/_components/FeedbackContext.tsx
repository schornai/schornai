"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { createContext, useContext, useState } from "react";
import type { ErrorLog } from "@schornio/aibox-package-ui/components/error-log";

type Feedback = {
  textFeedback?: string;
  starsClicked: number;
  starsHovered?: number;
};

const feedbackContext = createContext<
  | {
      feedback: Feedback;
      setFeedback: Dispatch<SetStateAction<Feedback>>;
    }
  | undefined
>(undefined);

export function FeedbackContext(props: { children?: ReactNode }) {
  const [feedback, setFeedback] = useState<Feedback>({
    starsClicked: 0,
  });

  return (
    <feedbackContext.Provider value={{ feedback, setFeedback }}>
      {props.children}
    </feedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(feedbackContext);
  if (!context) {
    throw new Error("useFeedback() -> not inside an FeedbackContext");
  }
  return context;
}

export function feedbackToText(feedback: Feedback, errorLogs: ErrorLog[]) {
  const readyErrorLogs = errorLogs.filter((errorLog) => errorLog.send);

  let text = "Auto generated feedback:\n\n";

  if (feedback.starsClicked > 0) {
    text += `Stars: ${feedback.starsClicked} / 5\n\n`;
  }

  if (feedback.textFeedback) {
    text += "=== TEXT_FEEDBACK_START===\n";
    text += feedback.textFeedback;
    text += "\n=== TEXT_FEEDBACK_END ===\n\n";
  }

  if (readyErrorLogs.length > 0) {
    text += "=== ERROR_LOG_START ===\n";
    for (const errorLog of readyErrorLogs) {
      text += `DATE: ${errorLog.date.toISOString()}\n`;
      text += errorLog.message;
      text += "\n---\n";
    }
    text += "\n=== ERROR_LOG_END ===\n\n";
  }

  return text;
}
