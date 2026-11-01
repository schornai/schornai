"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AppColor } from "@schornio/aibox-package-database/_shared/_types";
import { Button } from "@schornio/aibox-package-ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
  DialogTrigger,
} from "@schornio/aibox-package-ui/components/dialog";
import { Mic } from "lucide-react";
import { useT } from "next-i18next/client";
import { AudioRecorder } from "./AudioRecorder";

export type AudioRecordingConfig = { appColor?: AppColor };
const RecordingContext = createContext<{ enabled: boolean; open: () => void }>({
  enabled: false,
  open: () => {},
});

export function AudioRecorderProvider({
  config,
  children,
}: {
  config?: AudioRecordingConfig;
  children: ReactNode;
}) {
  const { t } = useT("transcriber", { keyPrefix: "_components.AudioRecorder" });
  const [open, setOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [showCloseHint, setShowCloseHint] = useState(false);
  const enabled = !!config;
  const close = () => {
    setOpen(false);
    setBlocked(false);
    setShowCloseHint(false);
    if (window.location.hash === "#record") {
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search,
      );
    }
  };
  useEffect(() => {
    if (!enabled) return;
    const fromHash = () => {
      if (window.location.hash === "#record") setOpen(true);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [enabled]);
  return (
    <RecordingContext.Provider value={{ enabled, open: () => setOpen(true) }}>
      <Dialog
        open={enabled && open}
        onOpenChange={(next, event) => {
          if (!next && blocked) {
            event.cancel();
            setShowCloseHint(true);
            return;
          }
          if (next) {
            setShowCloseHint(false);
            setOpen(true);
          } else close();
        }}
      >
        {children}
        {enabled && open ? (
          <DialogContent
            className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-xl"
            showCloseButton={false}
          >
            <DialogTitle className="sr-only">{t("labelTitle")}</DialogTitle>
            <AudioRecorder
              appColor={config.appColor}
              onCloseBlockedChange={setBlocked}
              onFinished={close}
              closeControl={
                <DialogClose
                  render={<Button variant="ghost" className="w-full" />}
                >
                  {t("labelClose")}
                </DialogClose>
              }
            />
            {showCloseHint && blocked ? (
              <p
                role="status"
                className="text-muted-foreground px-6 pb-5 text-sm"
              >
                {t("descriptionCloseBlocked")}
              </p>
            ) : null}
          </DialogContent>
        ) : null}
      </Dialog>
    </RecordingContext.Provider>
  );
}

export function AudioRecorderButton({
  iconOnly = false,
  disabled = false,
}: {
  iconOnly?: boolean;
  disabled?: boolean;
}) {
  const { enabled } = useContext(RecordingContext);
  const { t } = useT("transcriber", { keyPrefix: "_components.AudioRecorder" });
  if (!enabled) return null;
  return (
    <DialogTrigger
      render={
        <Button
          type="button"
          variant={iconOnly ? "ghost" : "outline"}
          size={iconOnly ? "icon-sm" : "default"}
          disabled={disabled}
          aria-label={t("labelTitle")}
          title={t("labelTitle")}
        />
      }
    >
      <Mic data-icon="inline-start" />
      {iconOnly ? null : t("labelTitle")}
    </DialogTrigger>
  );
}

export function useAudioRecorder() {
  return useContext(RecordingContext);
}
