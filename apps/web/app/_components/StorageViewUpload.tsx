import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@schornio/aibox-package-ui/components/progress";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import { useFileUpload } from "./FileUploadProvider";

export function StorageViewUpload() {
  const { progress, uploads } = useFileUpload();

  if (uploads.length === 0) {
    return;
  }

  const errors = uploads.filter(($) => $.state === "error");

  return (
    <ContainerMain className="max-w-lg">
      <ContainerStyled variant="card">
        <Progress max={1} value={progress}>
          <ProgressLabel>Dateien werden hochgeladen...</ProgressLabel>
          <ProgressValue />
        </Progress>
        {errors.length > 0 ? (
          <div className="text-destructive flex w-full flex-col items-center p-3 text-sm">
            <strong className="text-center">Fehler beim Hochladen</strong>
            <ul>
              {errors.map((error) => (
                <Collapsible key={error.id}>
                  <li>
                    <CollapsibleTrigger>{error.path}</CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-1 font-mono whitespace-pre-wrap">
                        {error.errorMessage}
                      </div>
                    </CollapsibleContent>
                  </li>
                </Collapsible>
              ))}
            </ul>
          </div>
        ) : undefined}
      </ContainerStyled>
    </ContainerMain>
  );
}
