"use client";
import { XRAGExportJobs, type ExportJob } from "./XRAGExportJobs";
import { XRAGPackageCreateForm } from "./XRAGPackageCreateForm";
import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";
import { Package, X } from "lucide-react";
import type { listXRAGPackages } from "@schornio/aibox-package-database/xrag/listXRAGPackages";
import { packageObjectSchema } from "@schornio/aibox-package-database/xrag/packageSchema";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import {
  FieldGroup,
  FieldDescription,
} from "@schornio/aibox-package-ui/components/field";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@schornio/aibox-package-ui/components/alert-dialog";
import { deleteXRAGPackage } from "../_actions/deleteXRAGPackage";
import { removeXRAGPackageItem } from "../_actions/removeXRAGPackageItem";
import { exportXRAGPackage } from "../_actions/exportXRAGPackage";
type XRAGPackage = Awaited<ReturnType<typeof listXRAGPackages>>[number];
export function XRAGPackages({
  packages,
  jobs = [],
}: {
  packages: XRAGPackage[];
  jobs?: ExportJob[];
}) {
  const { t } = useT("common", { keyPrefix: "_components.XRAGPackages" });
  return (
    <FieldGroup>
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{t("labelTitle")}</h2>
        <FieldDescription>{t("description")}</FieldDescription>
      </header>
      <XRAGPackageCreateForm />
      {packages.map((xragPackage) => (
        <PackageRow
          key={xragPackage.id}
          xragPackage={xragPackage}
          active={jobs.some(
            (job) =>
              job.package_id === xragPackage.id &&
              ["queued", "processing"].includes(job.state),
          )}
        />
      ))}
      <XRAGExportJobs jobs={jobs} />
    </FieldGroup>
  );
}
function PackageRow({
  xragPackage,
  active,
}: {
  xragPackage: XRAGPackage;
  active: boolean;
}) {
  const { t } = useT("common", { keyPrefix: "_components.XRAGPackages" });
  const [removal, setRemoval] = useState<
    XRAGPackage["xrag_package_items"][number] | "package" | null
  >(null);
  const remove = useAction(removeXRAGPackageItem, {
    onSuccess: () => setRemoval(null),
  });
  const destroy = useAction(deleteXRAGPackage, {
    onSuccess: () => setRemoval(null),
  });
  const archive = useAction(exportXRAGPackage);
  const busy = remove.isPending || destroy.isPending;
  return (
    <section
      id={`xrag-package-${xragPackage.id}`}
      className="scroll-mt-36 rounded-lg border p-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="mr-auto min-w-0 font-medium wrap-anywhere">
          {xragPackage.name}
        </h3>
        <ButtonAction
          variant="outline"
          isPending={archive.isPending}
          hasErrored={archive.hasErrored}
          disabled={active || !xragPackage.xrag_package_items.length}
          onClick={() => archive.execute({ packageId: xragPackage.id })}
        >
          <Package />
          {t("labelExport")}
        </ButtonAction>
        <Button
          variant="destructive"
          size="icon"
          aria-label={t("labelDelete")}
          onClick={() => setRemoval("package")}
        >
          <X />
        </Button>
      </div>
      {!xragPackage.xrag_package_items.length && (
        <p className="text-muted-foreground mt-3 text-sm">
          {t("descriptionEmpty")}
        </p>
      )}
      <ul className="mt-3 flex flex-col gap-2">
        {xragPackage.xrag_package_items.map((item) => (
          <li
            key={`${item.kind}/${item.resource_id}`}
            className="flex items-center gap-3"
          >
            <span className="mr-auto flex min-w-0 flex-col wrap-anywhere">
              {item.name}
              <span className="text-muted-foreground text-xs">
                {t(`kind.${item.kind}`)}
              </span>
            </span>
            <Button
              variant="destructive"
              size="icon"
              aria-label={t("labelRemove")}
              onClick={() => setRemoval(item)}
            >
              <X />
            </Button>
          </li>
        ))}
      </ul>
      <AlertDialog
        open={removal !== null}
        onOpenChange={(v) => {
          if (!v && !busy) setRemoval(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(removal === "package" ? "labelDelete" : "labelRemove")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {removal === "package" ? xragPackage.name : removal?.name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>
              {t("labelCancel")}
            </AlertDialogCancel>
            <ButtonAction
              variant="destructive"
              isPending={busy}
              hasErrored={remove.hasErrored || destroy.hasErrored}
              onClick={() => {
                if (removal === "package")
                  destroy.execute({ packageId: xragPackage.id });
                else if (removal)
                  remove.execute({
                    packageId: xragPackage.id,
                    selection: packageObjectSchema.parse({
                      kind: removal.kind,
                      id: removal.resource_id,
                    }),
                  });
              }}
            >
              <X />
              {t("labelConfirm")}
            </ButtonAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
