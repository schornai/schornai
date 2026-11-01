import { CircleCheck, CircleX, Heart, LoaderCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@schornio/aibox-package-ui/components/dialog";
import { feedbackToText, useFeedback } from "./FeedbackContext";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import Link from "next/link";
import { useDecayState } from "@schornio/aibox-package-ui/hooks/use-decay-state";
import { useErrorLogs } from "@schornio/aibox-package-ui/components/error-log-client";
import { useT } from "next-i18next/client";

export function Actions() {
  const { t } = useT("feedback", { keyPrefix: "_components.Actions" });

  const { feedback } = useFeedback();
  const errorLogs = useErrorLogs();

  const feedbackText = feedbackToText(feedback, errorLogs);

  return (
    <>
      <hr />
      <ContainerMain className="p-3">
        <div className="mx-auto my-10 flex w-fit flex-col gap-3">
          <ButtonFeedbackMailto feedbackText={feedbackText} />
          <ButtonFeedbackClipboard feedbackText={feedbackText} />

          <Dialog>
            <DialogTrigger
              render={
                <Button variant="outline">{t("showFeedbackText")}</Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("feedbackText")}</DialogTitle>
                <DialogDescription>
                  {t("feedbackTextRecommendation")}
                  <Link href="mailto:hello@schorn.ai">hello@schorn.ai</Link>
                </DialogDescription>
                <div className="bg-muted relative h-[50vh] rounded-md">
                  <div className="absolute inset-0 overflow-scroll p-3 whitespace-pre">
                    {feedbackText}
                  </div>
                </div>
                <DialogFooter>
                  <div className="flex flex-col gap-3">
                    <ButtonFeedbackMailto feedbackText={feedbackText} />
                    <ButtonFeedbackClipboard feedbackText={feedbackText} />
                  </div>
                </DialogFooter>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
        <div className="my-10 flex flex-col items-center gap-5">
          <Heart size={32} className="text-red-500" />
          <p>{t("thankYou")}</p>
        </div>
      </ContainerMain>
    </>
  );
}

function ButtonFeedbackMailto({ feedbackText }: { feedbackText: string }) {
  const { t } = useT("feedback", { keyPrefix: "_components.Actions" });

  const feedbackTextMailTo = `mailto:hello@schorn.ai?subject=${encodeURIComponent("Auto generated Feedback")}&body=${encodeURIComponent(feedbackText)}`;

  return (
    <Button
      nativeButton={false}
      render={<Link href={feedbackTextMailTo}></Link>}
    >
      {t("sendFeedback")}
    </Button>
  );
}

function ButtonFeedbackClipboard({ feedbackText }: { feedbackText: string }) {
  const { t } = useT("feedback", { keyPrefix: "_components.Actions" });

  const [clipboardState, setClipboardState] = useDecayState("idle");

  return (
    <Button
      onClick={() => {
        setClipboardState("pending");
        navigator.clipboard
          .writeText(feedbackText)
          .then(() => setClipboardState("success"))
          .catch(() => setClipboardState("error"));
      }}
      variant="outline"
    >
      {t("copyFeedbackToClipboard")}
      {clipboardState === "pending" ? (
        <LoaderCircle className="text-muted-foreground animate-spin" />
      ) : undefined}
      {clipboardState === "success" ? (
        <CircleCheck className="text-green-500" />
      ) : undefined}
      {clipboardState === "error" ? (
        <CircleX className="text-red-500" />
      ) : undefined}
    </Button>
  );
}
