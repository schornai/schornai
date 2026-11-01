"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@schornio/aibox-package-ui/components/table";
import { ContainerTable } from "@schornio/aibox-package-ui/components/container-table";
import { getTaskQueue } from "@schornio/aibox-realtime/documents/taskQueue/getTaskQueue";
import { useHocuspocusProvider } from "@hocuspocus/provider-react";
import { useRealtimeArray } from "@/lib/useRealtimeArray";
import { useT } from "next-i18next/client";

export function TaskTable() {
  const provider = useHocuspocusProvider();
  const taskQueue = getTaskQueue(provider.document);
  const tasksRealtime = useRealtimeArray(taskQueue.tasks);
  const { t } = useT("settings", {
    keyPrefix: "_components.TaskTable",
  });

  return (
    <ContainerTable>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("tableColumnType")}</TableHead>
            <TableHead>{t("tableColumnStatus")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasksRealtime.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={2}
                className="text-muted-foreground py-4 text-center"
              >
                {t("emptyDescription")}
              </TableCell>
            </TableRow>
          ) : (
            tasksRealtime.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="capitalize">{task.type}</TableCell>
                <TableCell className="capitalize">{task.state}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </ContainerTable>
  );
}
