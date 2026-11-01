"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { RefreshCw } from "lucide-react";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { Button } from "@schornio/aibox-package-ui/components/button";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@schornio/aibox-package-ui/components/combobox";
import { Input } from "@schornio/aibox-package-ui/components/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@schornio/aibox-package-ui/components/field";
import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import type { ExternalModelProvider } from "@schornio/aibox-package-database/aiModel/_schema";
import type { DiscoveredModel } from "@schornio/aibox-realtime/models/listExternalModels";
import { addExternalModel } from "../_actions/addExternalModel";
import { updateExternalModel } from "../_actions/updateExternalModel";
import { discoverModels } from "../_actions/discoverModels";
import { providers } from "../providers";

export function ExternalModelForm({
  provider,
  initial,
}: {
  provider: ExternalModelProvider;
  initial?: {
    id: string;
    name: string;
    baseUrl?: string;
    modelId?: string;
    region?: string;
  };
}) {
  const { t } = useT("settings", { keyPrefix: "models" });
  const id = useId();
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? providers[provider].name);
  const [baseUrl, setBaseUrl] = useState(
    initial?.baseUrl ?? providers[provider].baseUrl,
  );
  const [region, setRegion] = useState(initial?.region ?? "eu-central-1");
  const [apiKey, setApiKey] = useState("");
  const [modelId, setModelId] = useState(initial?.modelId ?? "");
  const [models, setModels] = useState<DiscoveredModel[]>([]);
  const [discovery, setDiscovery] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [reload, setReload] = useState(0);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const generation = useRef(0);
  const create = useAction(addExternalModel);
  const update = useAction(updateExternalModel);
  const pending = create.isPending || update.isPending;
  const manual = provider === "openai-azure";
  const endpoint =
    provider === "antropic-aws"
      ? `https://bedrock-runtime.${region}.amazonaws.com`
      : baseUrl;
  const savedConnection = Boolean(
    initial &&
    !apiKey &&
    baseUrl === (initial.baseUrl ?? providers[provider].baseUrl) &&
    region === (initial.region ?? "eu-central-1"),
  );
  const initialId = initial?.id;
  useEffect(() => {
    const current = ++generation.current;
    setModels([]);
    setDiscovery("idle");
    if (
      manual ||
      !endpoint ||
      (!savedConnection && !apiKey && provider !== "openai-compatible")
    )
      return;
    const timer = setTimeout(async () => {
      setDiscovery("loading");
      try {
        const result = await discoverModels(
          savedConnection && initialId
            ? { id: initialId }
            : {
                provider,
                baseUrl: endpoint,
                apiKey,
                name: "discovery",
                modelId: "discovery",
                ...(provider === "antropic-aws" ? { region } : {}),
              },
        );
        if (generation.current !== current) return;
        if (!result?.data) throw new Error();
        setModels(result.data.models);
        setDiscovery("ready");
      } catch {
        if (generation.current === current) setDiscovery("error");
      }
    }, 700);
    return () => {
      clearTimeout(timer);
      generation.current++;
    };
  }, [
    provider,
    endpoint,
    apiKey,
    manual,
    reload,
    region,
    savedConnection,
    initialId,
  ]);
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-6",
        !initial && "max-w-xl",
      )}
    >
      <div>
        {initial ? (
          <h2 className="text-xl font-semibold">
            {t("labelConnection")} · {providers[provider].name}
          </h2>
        ) : (
          <h1 className="text-2xl font-semibold">{providers[provider].name}</h1>
        )}
        <p className="text-muted-foreground mt-2">
          {t(initial ? "descriptionEditConnection" : "descriptionConfigure")}
        </p>
      </div>
      <form
        onChange={() => {
          setSaved(false);
          setError(false);
        }}
        className="flex flex-col gap-6"
        onSubmit={async (event) => {
          event.preventDefault();
          if (pending) return;
          setError(false);
          setSaved(false);
          const input = {
            provider,
            name,
            baseUrl: endpoint,
            apiKey,
            modelId,
            ...(provider === "antropic-aws" ? { region } : {}),
          };
          try {
            const result = initial
              ? await update.executeAsync({ ...input, id: initial.id })
              : await create.executeAsync(input);
            if (!result?.data?.id) throw new Error();
            setApiKey("");
            setSaved(true);
            router.refresh();
            if (!initial) router.push(`/models/${result.data.id}`);
          } catch {
            setError(true);
          }
        }}
      >
        <FieldGroup>
          {!initial && (
            <Field>
              <FieldLabel htmlFor={`${id}-name`}>{t("fields.name")}</FieldLabel>
              <Input
                id={`${id}-name`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={500}
                disabled={pending}
              />
            </Field>
          )}
          {(provider === "openai-compatible" ||
            provider === "openai-azure") && (
            <Field>
              <FieldLabel htmlFor={`${id}-url`}>
                {t("fields.baseUrl")}
              </FieldLabel>
              <Input
                id={`${id}-url`}
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={
                  provider === "openai-azure"
                    ? "https://RESOURCE.openai.azure.com/openai/v1"
                    : "https://api.example.com/v1"
                }
                required
                disabled={pending}
              />
              <FieldDescription>{t("descriptions.baseUrl")}</FieldDescription>
            </Field>
          )}
          {provider === "antropic-aws" && (
            <Field>
              <FieldLabel htmlFor={`${id}-region`}>
                {t("fields.region")}
              </FieldLabel>
              <Input
                id={`${id}-region`}
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                required
                disabled={pending}
              />
              <FieldDescription>{t("descriptionBedrockKey")}</FieldDescription>
            </Field>
          )}
          <Field>
            <FieldLabel htmlFor={`${id}-key`}>{t("fields.apiKey")}</FieldLabel>
            <Input
              id={`${id}-key`}
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
              maxLength={4096}
              required={!initial && provider !== "openai-compatible"}
              disabled={pending}
            />
            <FieldDescription>
              {t(initial ? "descriptionKeepKey" : "descriptions.apiKey")}
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-model`}>
              {t(
                provider === "openai-azure"
                  ? "fields.deployment"
                  : "fields.modelId",
              )}
            </FieldLabel>
            {manual ? (
              <Input
                id={`${id}-model`}
                value={modelId}
                onChange={(event) => setModelId(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                required
                maxLength={500}
                disabled={pending}
              />
            ) : (
              <Combobox
                items={Array.from(
                  new Set([
                    ...models.map((model) => model.id),
                    ...(modelId.trim() ? [modelId.trim()] : []),
                  ]),
                )}
                value={modelId || null}
                inputValue={modelId}
                onInputValueChange={(value, details) => {
                  if (
                    details.reason === "input-change" ||
                    details.reason === "input-clear"
                  )
                    setModelId(value);
                }}
                onValueChange={(value) => setModelId(value ?? "")}
                disabled={pending}
                required
              >
                <ComboboxInput
                  id={`${id}-model`}
                  className="w-full"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={500}
                  disabled={pending}
                  required
                />
                <ComboboxContent>
                  <ComboboxEmpty>
                    {t("descriptionEnterModelIdentifier")}
                  </ComboboxEmpty>
                  <ComboboxList>
                    {(identifier: string) => {
                      const model = models.find(
                        (item) => item.id === identifier,
                      );
                      return (
                        <ComboboxItem key={identifier} value={identifier}>
                          <span className="flex min-w-0 flex-col">
                            <span className="break-all">
                              {model
                                ? identifier
                                : t("labelUseModelIdentifier", { identifier })}
                            </span>
                            {model?.name && model.name !== identifier ? (
                              <span className="text-muted-foreground text-xs">
                                {model.name}
                              </span>
                            ) : null}
                          </span>
                        </ComboboxItem>
                      );
                    }}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            )}
            <FieldDescription>
              {t(
                manual
                  ? provider === "openai-azure"
                    ? "descriptionAzureDeployment"
                    : "descriptionBedrockModel"
                  : provider === "antropic-aws"
                    ? "descriptionBedrockModel"
                    : "descriptionModelDiscovery",
              )}
            </FieldDescription>
          </Field>
        </FieldGroup>
        {!manual && (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                pending ||
                discovery === "loading" ||
                (!savedConnection &&
                  !apiKey &&
                  provider !== "openai-compatible")
              }
              onClick={() => setReload((value) => value + 1)}
            >
              <RefreshCw data-icon="inline-start" />
              {t("labelLoadModels")}
            </Button>
            <p className="text-muted-foreground text-sm" role="status">
              {discovery === "loading"
                ? t("labelLoadingModels")
                : discovery === "error"
                  ? t("errorDiscovery")
                  : discovery === "ready"
                    ? t("labelModelsFound", { count: models.length })
                    : ""}
            </p>
          </div>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{t("errorAdd")}</AlertDescription>
          </Alert>
        )}
        <ButtonAction
          className="self-start"
          type="submit"
          disabled={pending}
          isPending={pending}
          hasErrored={error}
          hasSucceeded={saved}
        >
          {t("labelSave")}
        </ButtonAction>
      </form>
    </div>
  );
}
