"use client";
import { Copy } from "lucide-react";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@schornio/aibox-package-ui/components/tooltip";
import { useDecayState } from "@schornio/aibox-package-ui/hooks/use-decay-state";
import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";
import type { ConnectionMetadata } from "@schornio/aibox-package-database/connections/_types";
import { useAction } from "next-safe-action/hooks";
import { saveConnection } from "../_actions/saveConnection";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { Input } from "@schornio/aibox-package-ui/components/input";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@schornio/aibox-package-ui/components/field";
export function ConnectionForm({
  connection,
  kind,
}: {
  connection?: ConnectionMetadata;
  kind: "oauth" | "brave" | "staan";
}) {
  const { t } = useT("settings", { keyPrefix: "connections" });
  const id = useId();
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const callbackUrl = `${origin}/api/mcp/oauth/callback`;
  const [copyIsPending, setCopyIsPending] = useState(false);
  const [copyFinishState, setCopyFinishState] = useDecayState<
    "success" | "error" | undefined
  >(undefined);
  const copyLabel = t(
    copyFinishState === "success"
      ? "labelCallbackCopied"
      : copyFinishState === "error"
        ? "errorCopyCallback"
        : "labelCopyCallback",
  );
  const router = useRouter();
  const [name, setName] = useState(connection?.name ?? "");
  const [clientId, setClientId] = useState(connection?.client_id ?? "");
  const [issuer, setIssuer] = useState(connection?.issuer ?? "");
  const [secret, setSecret] = useState("");
  const [market, setMarket] = useState(connection?.market ?? "");
  const {
    execute,
    isPending: pending,
    hasErrored: error,
  } = useAction(saveConnection, {
    onSuccess() {
      setSecret("");
      router.push("/settings/connections");
    },
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    execute({
      id: connection?.id,
      kind,
      name,
      ...(kind === "oauth" && connection ? {} : { clientId, secret }),
      issuer: kind === "oauth" ? issuer : undefined,
      market: kind === "staan" ? market : undefined,
    });
  }
  return (
    <form className="mx-auto max-w-xl" onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${id}-name`}>{t("labelName")}</FieldLabel>
          <Input
            id={`${id}-name`}
            value={name}
            required
            disabled={pending}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        {kind === "oauth" && (
          <Field>
            <FieldLabel htmlFor={`${id}-client`}>
              {t("labelClientId")}
            </FieldLabel>
            <Input
              id={`${id}-client`}
              value={clientId}
              required
              disabled={pending || !!connection}
              onChange={(e) => setClientId(e.target.value)}
            />
          </Field>
        )}
        {kind === "oauth" && (
          <Field>
            <FieldLabel htmlFor={`${id}-issuer`}>{t("labelIssuer")}</FieldLabel>
            <Input
              id={`${id}-issuer`}
              type="url"
              required
              value={issuer}
              disabled={pending || !!connection?.issuer}
              onChange={(e) => setIssuer(e.target.value)}
            />
            <FieldDescription>{t("descriptionIssuer")}</FieldDescription>
          </Field>
        )}
        {!(kind === "oauth" && connection) && (
          <Field>
            <FieldLabel htmlFor={`${id}-secret`}>
              {t(kind === "oauth" ? "labelClientSecret" : "labelApiKey")}
            </FieldLabel>
            <Input
              id={`${id}-secret`}
              type="password"
              autoComplete="new-password"
              required={!connection}
              value={secret}
              disabled={pending}
              onChange={(e) => setSecret(e.target.value)}
            />
            <FieldDescription>
              {t(
                kind === "oauth"
                  ? "descriptionOAuthSecret"
                  : "descriptionSecret",
              )}
            </FieldDescription>
          </Field>
        )}
        {kind === "staan" && (
          <Field>
            <FieldLabel htmlFor={`${id}-market`}>{t("labelMarket")}</FieldLabel>
            <Input
              id={`${id}-market`}
              placeholder="en-us"
              value={market}
              disabled={pending}
              onChange={(e) => setMarket(e.target.value)}
            />
          </Field>
        )}
        {kind === "oauth" && (
          <FieldDescription>
            {t("descriptionCallback", { url: callbackUrl })}{" "}
            <Tooltip>
              <TooltipTrigger
                render={
                  <ButtonAction
                    type="button"
                    aria-label={copyLabel}
                    disabled={!origin}
                    hasErrored={copyFinishState === "error"}
                    hasSucceeded={copyFinishState === "success"}
                    isPending={copyIsPending}
                    indicator="replace"
                    size="icon-xs"
                    variant="ghost"
                    onClick={async () => {
                      setCopyIsPending(true);
                      setCopyFinishState(undefined);
                      try {
                        await navigator.clipboard.writeText(callbackUrl);
                        setCopyFinishState("success");
                      } catch {
                        setCopyFinishState("error");
                      } finally {
                        setCopyIsPending(false);
                      }
                    }}
                  >
                    <Copy />
                  </ButtonAction>
                }
              />
              <TooltipContent>{copyLabel}</TooltipContent>
            </Tooltip>
          </FieldDescription>
        )}
        {error && <FieldError>{t("errorSave")}</FieldError>}
        <div className="flex gap-3">
          <ButtonAction type="submit" isPending={pending} hasErrored={error}>
            {t("labelSave")}
          </ButtonAction>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => router.push("/settings/connections")}
          >
            {t("labelCancel")}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
