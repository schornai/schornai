import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Unplug } from "lucide-react";
import { useCallback } from "react";

export function FoundBoxTableRow({
  box,
  onBoxSelected,
}: {
  box: BoxEndpoint;
  onBoxSelected?: (box: BoxEndpoint, options?: { persist: boolean }) => void;
}) {
  const selectBox = useCallback(() => {
    onBoxSelected?.(box);
  }, [onBoxSelected, box]);

  const selectBoxPersistent = useCallback(() => {
    onBoxSelected?.(box, { persist: true });
  }, [onBoxSelected, box]);

  return (
    <TableRow key={box.hostname}>
      <TableCell>{box.hostname}</TableCell>
      <TableCell>
        <span className="block max-w-48 overflow-hidden text-ellipsis whitespace-nowrap">
          {box.certificateFingerprint256}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-2">
          <Button onClick={selectBox} variant="outline">
            <Unplug /> Einmal verbinden
          </Button>
          <Button onClick={selectBoxPersistent}>
            <Unplug /> Immer verbinden
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
