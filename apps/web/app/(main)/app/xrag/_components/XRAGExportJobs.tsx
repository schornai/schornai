"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";
import { formatFileSize } from "@schornio/aibox-package-utils/formatFileSize";
import { StatusBadge } from "../../../../_components/StatusBadge";
import { Download, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogTrigger,
} from "@schornio/aibox-package-ui/components/alert-dialog";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { deleteXRAGExport } from "../_actions/deleteXRAGExport";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { Progress } from "@schornio/aibox-package-ui/components/progress";
import type { listXRAGExportJobs } from "@schornio/aibox-package-database/xrag/listXRAGExportJobs";
import { cancelXRAGExport } from "../_actions/cancelXRAGExport";
import { getXRAGExportDownload } from "../_actions/getXRAGExportDownload";
export type ExportJob = Awaited<ReturnType<typeof listXRAGExportJobs>>[number];
const badgeStates = {
  queued: "idle",
  processing: "running",
  finished: "success",
  error: "error",
  cancelled: "cancelled",
} as const;
export function XRAGExportJobs({ jobs }: { jobs: ExportJob[] }) {
  const { t } = useT("common", { keyPrefix: "_components.XRAGExportJobs" });
  const router = useRouter();
  const active = jobs.some((job) =>
    ["queued", "processing"].includes(job.state),
  );
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(timer);
  }, [active, router]);
  if (!jobs.length) return null;
  return (
    <section className="flex flex-col gap-3" aria-label={t("labelTitle")}>
      <h2 className="text-lg font-semibold">{t("labelTitle")}</h2>
      <p className="text-muted-foreground text-sm">{t("description")}</p>
      {jobs.map((job) => (
        <ExportJobRow key={job.id} job={job} />
      ))}
    </section>
  );
}
function ExportJobRow({ job }: { job: ExportJob }) {
  const { t } = useT("common", { keyPrefix: "_components.XRAGExportJobs" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const remove = useAction(deleteXRAGExport, {
    onSuccess: () => setConfirmDelete(false),
  });
  const cancel = useAction(cancelXRAGExport);
  const download = useAction(getXRAGExportDownload, {
    onSuccess: ({ data }) => {
      if (data) window.location.assign(data.url);
    },
  });
  const active = ["queued", "processing"].includes(job.state);
  const percent = job.total_bytes
    ? Math.min(100, Math.floor((job.bytes_uploaded / job.total_bytes) * 100))
    : 0;
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="mr-auto flex min-w-0 flex-col wrap-anywhere">
          {job.name}
          {job.total_bytes !== null && (
            <span className="text-muted-foreground text-xs">
              {formatFileSize(job.total_bytes)}
            </span>
          )}
        </span>
        <StatusBadge
          role="status"
          state={badgeStates[job.state as keyof typeof badgeStates]}
        >
          {t(
            job.state === "queued" && job.attempts > 0
              ? "state_retrying"
              : job.state === "processing" && job.total_bytes !== null
                ? "state_uploading"
                : `state_${job.state}`,
          )}
          {job.state === "processing" && job.total_bytes
            ? ` · ${percent}%`
            : ""}
        </StatusBadge>
        {active && (
          <ButtonAction
            variant="destructive"
            size="icon"
            aria-label={t("labelCancel")}
            isPending={cancel.isPending}
            hasErrored={cancel.hasErrored}
            onClick={() => cancel.execute({ jobId: job.id })}
          >
            <X />
          </ButtonAction>
        )}
        {job.state === "finished" && (
          <ButtonAction
            variant="outline"
            isPending={download.isPending}
            hasErrored={download.hasErrored}
            onClick={() => download.execute({ jobId: job.id })}
          >
            <Download />
            {t("labelDownload")}
          </ButtonAction>
        )}
        {!active && (
          <AlertDialog
            open={confirmDelete}
            onOpenChange={(open) => {
              if (!remove.isPending) setConfirmDelete(open);
            }}
          >
            <AlertDialogTrigger
              render={
                <Button
                  variant="destructive"
                  size="icon"
                  aria-label={t("labelDelete")}
                >
                  <X />
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("labelDelete")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("descriptionDelete", { name: job.name })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={remove.isPending}>
                  {t("labelDismiss")}
                </AlertDialogCancel>
                <ButtonAction
                  variant="destructive"
                  isPending={remove.isPending}
                  hasErrored={remove.hasErrored}
                  onClick={() => remove.execute({ jobId: job.id })}
                >
                  <X />
                  {t("labelDelete")}
                </ButtonAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      {job.state === "processing" && job.total_bytes !== null && (
        <Progress value={percent} aria-label={t("labelProgress")} />
      )}
    </div>
  );
}
