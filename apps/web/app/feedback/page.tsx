"use client";

import { Actions } from "./_components/Actions";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ErrorLogs } from "./_components/ErrorLogs";
import { FeedbackContext } from "./_components/FeedbackContext";
import { Footer } from "../_components/Footer";
import { StarRatingCard } from "./_components/StarRatingCard";
import { TextFeedback } from "./_components/TextFeedback";
import { useT } from "next-i18next/client";

export default function Page() {
  const { t } = useT("feedback", { keyPrefix: "page" });

  return (
    <>
      <div className="flex-1">
        <FeedbackContext>
          <ContainerMain className="p-3">
            <p className="text-center text-lg">
              {t("headingLine1")}
              <br />
              {t("headingLine2")}
            </p>
            <h1 className="my-10 text-center text-3xl font-bold">
              {t("headingMain")}
            </h1>

            <StarRatingCard />

            <TextFeedback />
          </ContainerMain>

          <Actions />

          <ErrorLogs />
        </FeedbackContext>
      </div>

      <Footer />
    </>
  );
}
