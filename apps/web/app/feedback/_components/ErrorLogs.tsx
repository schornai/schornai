import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@schornio/aibox-package-ui/components/alert";
import {
  AlertCircle,
  CircleX,
  SquareMinus,
  SquarePlus,
  XCircle,
} from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@schornio/aibox-package-ui/components/table";
import {
  deleteErrors,
  setSendError,
  setSendErrors,
} from "@schornio/aibox-package-ui/components/error-log";
import { Actions } from "./Actions";
import { AlertDialogMediaDestructive } from "@schornio/aibox-package-ui/components/alert-dialog-media-destructive";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { Checkbox } from "@schornio/aibox-package-ui/components/checkbox";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ContainerTable } from "@schornio/aibox-package-ui/components/container-table";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { useErrorLogs } from "@schornio/aibox-package-ui/components/error-log-client";
import { useState } from "react";
import { useT } from "next-i18next/client";

export function ErrorLogs() {
  const { t, i18n } = useT("feedback", { keyPrefix: "_components.ErrorLogs" });
  const dateFormatter = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "medium",
    timeStyle: "medium",
  });

  const errorLogs = useErrorLogs();

  if (errorLogs.length === 0) {
    return undefined;
  }

  return (
    <>
      <hr />
      <ContainerMain className="p-3">
        <h2 className="my-10 text-center text-xl font-bold">{t("heading")}</h2>

        <p className="my-10">{t("explainer")}</p>

        <Alert className="my-10" variant="destructive">
          <AlertCircle />
          <AlertTitle>{t("explainerSecrecyHeading")}</AlertTitle>
          <AlertDescription>{t("explainerSecrecy")}</AlertDescription>
        </Alert>

        <ErrorLogActions />
        <ContainerTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("tableColumnPartOfFeedback")}</TableHead>
                <TableHead>{t("tableColumnDate")}</TableHead>
                <TableHead>{t("tableColumnErrorMessage")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {errorLogs.map((errorLog) => (
                <TableRow key={errorLog.id}>
                  <TableCell>
                    <Checkbox
                      checked={errorLog.send}
                      onCheckedChange={(send) =>
                        setSendError(errorLog.id, send)
                      }
                    />
                  </TableCell>
                  <TableCell>{dateFormatter.format(errorLog.date)}</TableCell>
                  <ErrorLogMessageTableCell message={errorLog.message} />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ContainerTable>
        <ErrorLogActions />
      </ContainerMain>

      <Actions />
    </>
  );
}

function ErrorLogMessageTableCell({ message }: { message: string }) {
  const [open, setOpen] = useState(false);

  return (
    <TableCell
      className="cursor-ns-resize"
      onClick={() => setOpen((prev) => !prev)}
    >
      <pre className={cn({ "max-h-20 overflow-y-hidden": !open })}>
        {message}
      </pre>
    </TableCell>
  );
}

function ErrorLogActions() {
  const { t } = useT("feedback", { keyPrefix: "_components.ErrorLogs" });

  const errorLogs = useErrorLogs();
  const allSelected = errorLogs.every((errorLog) => errorLog.send);

  return (
    <div className="my-1 flex justify-end gap-1">
      {allSelected ? (
        <Button
          onClick={() => setSendErrors(false)}
          size="xs"
          variant="outline"
        >
          <SquareMinus />
          {t("actionDeselectAll")}
        </Button>
      ) : (
        <Button onClick={() => setSendErrors(true)} size="xs" variant="outline">
          <SquarePlus />
          {t("actionSelectAll")}
        </Button>
      )}
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button size="xs" variant="outline">
              <CircleX /> {t("actionDeleteAll")}
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMediaDestructive>
              <XCircle />
            </AlertDialogMediaDestructive>
            <AlertDialogTitle>{t("actionDeleteAll")}</AlertDialogTitle>{" "}
            <AlertDialogDescription>
              {t("actionDeleteAllExplainer")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("actionDeleteAllCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteErrors()}
              variant="destructive"
            >
              {t("actionDeleteAllShort")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
