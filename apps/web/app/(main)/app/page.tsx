import { AudioLines, FolderOpen, ToolCase } from "lucide-react";
import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import Link from "next/link";
import { getT } from "next-i18next/server";

export default async function Page() {
  const { t: tCommon } = await getT("common", {
     keyPrefix: "main._components.Sidebar",
     });
  const { t: tDocumentRepository } = await getT("documentRepository", {
     keyPrefix: "apps",
     });
  const { t: tTranscriber } = await getT("transcriber", {
     keyPrefix: "apps",
     });

  return (
     <>
        <HeaderMain>
           <HeaderMainContent>
            <ToolCase />
            {tCommon("mainLabelApps")}
           </HeaderMainContent>
        </HeaderMain>

        <ContainerMain className="flex flex-wrap justify-around gap-3">
          <div className="w-96">
            <ContainerStyled
             className="flex aspect-video flex-col items-center"
             render={<Link href="/app/documents" />}
             variant="card"
            >
              <div className="bg-muted my-auto flex aspect-square w-36 items-center justify-center rounded-full">
                <FolderOpen className="size-10" />
                </div>
              <div className="mt-auto text-sm font-medium">
                {tDocumentRepository("labelTitle")}
              </div>
            </ContainerStyled>

            <div className="p-3 text-sm">
              {tDocumentRepository("description")}
            </div>
          </div>

          <div className="w-96">
            <ContainerStyled
             className="flex aspect-video flex-col items-center"
             render={<Link href="/app/transcribe" />}
             variant="card"
            >
              <div className="bg-muted my-auto flex aspect-square w-36 items-center justify-center rounded-full">
                <AudioLines className="size-10" />
            </div>
              <div className="mt-auto text-sm font-medium">
                {tTranscriber("labelTitle")}
              </div>
            </ContainerStyled>

            <div className="p-3 text-sm">
              {tTranscriber("description")}
              </div>
          </div>
        </ContainerMain>
      </>
    );
}
