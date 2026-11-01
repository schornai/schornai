import { RotateCw, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FoundBoxTableRow } from "./FoundBoxTableRow";

export function FindBoxesScreen({
  onBoxSelected,
}: {
  onBoxSelected?: (box: BoxEndpoint, options?: { persist: boolean }) => void;
}) {
  const [findingBoxes, setFindingBoxes] = useState(false);
  const [boxes, setBoxes] = useState<BoxEndpoint[]>([]);

  const findBoxes = useCallback(() => {
    setFindingBoxes(true);
    setBoxes([]);

    window.aiboxDesktopAPI.findLocalBoxes({
      onBoxFound(box) {
        setBoxes((prev) => [...prev, box]);
      },
      onFinished(boxes) {
        setBoxes(boxes);
        setFindingBoxes(false);
      },
    });
  }, []);

  useEffect(() => {
    findBoxes();
  }, [findBoxes]);

  const boxesSorted = boxes.toSorted((a, b) =>
    a.hostname.localeCompare(b.hostname),
  );

  return (
    <div className="flex flex-col gap-5 p-5">
      <h1 className="text-2xl font-bold">
        Box finden{" "}
        {findingBoxes ? (
          <RotateCw className="inline-block animate-spin" />
        ) : undefined}
      </h1>
      <div className="rounded-md border">
        <Table>
          <TableCaption>
            Im lokalen Netzwerk gefundene schorn.ai Boxen
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Adresse</TableHead>
              <TableHead>Zertifikat</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {boxesSorted.map((box) => (
              <FoundBoxTableRow
                box={box}
                key={box.hostname}
                onBoxSelected={onBoxSelected}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      <Button className="self-end" disabled={findingBoxes} onClick={findBoxes}>
        <Search />
        Nach Boxen suchen
      </Button>
    </div>
  );
}
