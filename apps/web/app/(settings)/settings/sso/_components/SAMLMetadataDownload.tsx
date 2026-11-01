"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { downloadSAMLMetadata } from "../_actions/downloadSAMLMetadata";

export function SAMLMetadataDownload() {
  const { t } = useT("settings", {
    keyPrefix: "_components.SAMLMetadataDownload",
  });
  const { executeAsync, isPending } = useAction(downloadSAMLMetadata);
  const [message, setMessage] = useState<
    "errorDownload" | "descriptionNotConfigured" | "descriptionSuccess"
  >();
  return (
    <div className="flex flex-col items-center gap-2">
      <ButtonAction
        variant="outline"
        isPending={isPending}
        onClick={async () => {
          if (isPending) return;
          setMessage(undefined);
          try {
            const result = await executeAsync();
            if (!result?.data) throw new Error();
            if (!result.data.configured) {
              setMessage("descriptionNotConfigured");
              return;
            }
            const xml = result.data.xml;
            // Validate XML before offering it as a file, and never inject it as HTML.
            if (/<!DOCTYPE/i.test(xml)) throw new Error();
            const doc = new DOMParser().parseFromString(xml, "application/xml");
            const ns = "urn:oasis:names:tc:SAML:2.0:metadata";
            if (
              doc.querySelector("parsererror") ||
              doc.documentElement.localName !== "EntityDescriptor" ||
              doc.documentElement.namespaceURI !== ns ||
              !doc.documentElement.getAttribute("entityID") ||
              !doc.getElementsByTagNameNS(ns, "SPSSODescriptor").length ||
              !doc.getElementsByTagNameNS(ns, "AssertionConsumerService").length
            )
              throw new Error();
            const url = URL.createObjectURL(
              new Blob([xml], {
                type: "application/samlmetadata+xml;charset=utf-8",
              }),
            );
            const link = document.createElement("a");
            link.href = url;
            link.download = "saml-sp-metadata.xml";
            document.body.append(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setMessage("descriptionSuccess");
          } catch {
            setMessage("errorDownload");
          }
        }}
      >
        {t("labelDownload")}
      </ButtonAction>
      {message && (
        <p
          className="text-muted-foreground max-w-md text-sm"
          role={message === "errorDownload" ? "alert" : "status"}
        >
          {t(message)}
        </p>
      )}
    </div>
  );
}
