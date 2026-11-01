"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@schornio/aibox-package-ui/components/alert-dialog";
import {
  Card,
  CardContent,
  CardFooter,
} from "@schornio/aibox-package-ui/components/card";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@schornio/aibox-package-ui/components/field";
import { FilePenLine, XCircle } from "lucide-react";
import { AlertDialogMediaDestructive } from "@schornio/aibox-package-ui/components/alert-dialog-media-destructive";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { Textarea } from "@schornio/aibox-package-ui/components/textarea";
import { useFeedback } from "./FeedbackContext";
import { useT } from "next-i18next/client";

export function TextFeedback() {
  const { t } = useT("feedback", { keyPrefix: "_components.TextFeedback" });

  const {
    feedback: { textFeedback },
    setFeedback,
  } = useFeedback();

  const setTextFeedback = (textFeedback: string | undefined) => {
    setFeedback((prev) => ({ ...prev, textFeedback }));
  };

  return (
    <>
      {textFeedback === undefined ? (
        <div className="mx-auto my-10 w-fit">
          <Button onClick={() => setTextFeedback("")} variant="outline">
            <FilePenLine /> {t("writeFeedback")}
          </Button>
        </div>
      ) : (
        <Card className="my-10">
          <CardContent>
            <Field>
              <FieldLabel>{t("writeFeedback")}</FieldLabel>
              <FieldDescription>{t("writeFeedbackSub")}</FieldDescription>
            </Field>
            <Textarea
              className="min-h-42"
              onChange={(event) => {
                setTextFeedback(event.currentTarget.value);
              }}
              value={textFeedback}
            />
          </CardContent>
          <CardFooter>
            <div className="flex w-full items-center justify-between gap-3">
              <p>{t("infoSecrecy")}</p>
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button variant="outline">
                      <XCircle /> {t("discardFeedback")}
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogMediaDestructive>
                      <XCircle />
                    </AlertDialogMediaDestructive>
                    <AlertDialogTitle>{t("discardFeedback")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("discardFeedbackSub")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>
                      {t("discardFeedbackCancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => setTextFeedback(undefined)}
                      variant="destructive"
                    >
                      {t("discardFeedback")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardFooter>
        </Card>
      )}
    </>
  );
}
