"use client";
import { Clock3, DraftingCompass, ShieldCheck } from "lucide-react";
import { useId, useState } from "react";
import type { PlatformAccessLevel } from "@schornio/aibox-package-database/mcp/platformAccess";
import {
  Field,
  FieldLabel,
  FieldDescription,
} from "@schornio/aibox-package-ui/components/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@schornio/aibox-package-ui/components/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@schornio/aibox-package-ui/components/card";
import { LogoSchornAI } from "@schornio/aibox-package-ui/components/logo-schornai";
import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { FieldError } from "@schornio/aibox-package-ui/components/field";
import { authorizePlatformMcp } from "../_actions/authorizePlatformMcp";
import type { z } from "zod";
import type { authorizationSchema } from "@/lib/platformMcp/oauth";

export function PlatformMcpConsent({
  request,
  clientName,
  levels,
}: {
  request: z.infer<typeof authorizationSchema>;
  clientName: string;
  levels: PlatformAccessLevel[];
}) {
  const { t } = useT("me", { keyPrefix: "platformMcp" });
  const id = useId();
  const [level, setLevel] = useState<PlatformAccessLevel>("user");
  const action = useAction(authorizePlatformMcp, {
    onSuccess: ({ data }) => {
      if (data) window.location.assign(data.redirectUrl);
    },
  });
  return (
    <main className="grid flex-1 grid-cols-1 lg:grid-cols-2">
      <section className="bg-primary text-primary-foreground flex items-center justify-center px-6 py-10 lg:p-12">
        <div className="flex w-full max-w-md flex-col gap-8">
          <LogoSchornAI className="w-36" aria-label="schorn.ai" />
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl font-semibold tracking-tight lg:text-4xl">
              {t("labelConnectTitle")}
            </h2>
            <p className="text-base leading-relaxed">
              {t("descriptionConnect")}
            </p>
          </div>
          <ul className="flex flex-col gap-5 text-sm leading-relaxed">
            <li className="flex items-start gap-3">
              <ShieldCheck
                className="mt-0.5 size-5 shrink-0"
                aria-hidden="true"
              />
              <span>{t("descriptionPermissions")}</span>
            </li>
            <li className="flex items-start gap-3">
              <Clock3 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <span>{t("descriptionExpiry")}</span>
            </li>
          </ul>
        </div>
      </section>
      <section className="flex min-w-0 items-center justify-center px-5 py-10 lg:p-12">
        <Card className="w-full max-w-lg">
          <CardHeader className="gap-3">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <DraftingCompass className="size-5" aria-hidden="true" />
              <span>{t("labelPlatformAccess")}</span>
            </div>
            <CardTitle>
              <h1>{t("labelTitle", { client: clientName })}</h1>
            </CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <Field>
              <FieldLabel htmlFor={id}>{t("labelLevel")}</FieldLabel>
              <Select
                value={level}
                disabled={action.isPending || !levels.length}
                onValueChange={(value) => {
                  if (levels.includes(value as PlatformAccessLevel))
                    setLevel(value as PlatformAccessLevel);
                }}
              >
                <SelectTrigger id={id}>
                  <SelectValue>{t(`level.${level}`)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {levels.map((choice) => (
                      <SelectItem key={choice} value={choice}>
                        {t(`level.${choice}`)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                {t(levels.length ? "descriptionLevel" : "descriptionNoAccess")}
              </FieldDescription>
            </Field>
            <dl className="flex min-w-0 flex-col gap-5">
              <div className="flex min-w-0 flex-col gap-2">
                <dt className="text-muted-foreground text-sm">
                  {t("labelResource")}
                </dt>
                <dd className="bg-muted rounded-md p-3">
                  <code className="text-xs leading-relaxed break-all">
                    {request.resource}
                  </code>
                </dd>
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                <dt className="text-muted-foreground text-sm">
                  {t("labelRedirect")}
                </dt>
                <dd className="bg-muted rounded-md p-3">
                  <code className="text-xs leading-relaxed break-all">
                    {request.redirect_uri}
                  </code>
                </dd>
              </div>
            </dl>
            {action.hasErrored && (
              <FieldError>{t("errorAuthorization")}</FieldError>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <ButtonAction
              className="w-full sm:w-auto"
              variant="outline"
              isPending={action.isPending}
              disabled={action.isPending}
              onClick={() => action.execute({ request, approve: false, level })}
            >
              {t("labelDeny")}
            </ButtonAction>
            <ButtonAction
              className="w-full sm:w-auto"
              isPending={action.isPending}
              hasErrored={action.hasErrored}
              disabled={action.isPending || !levels.includes(level)}
              onClick={() => action.execute({ request, approve: true, level })}
            >
              {t("labelApprove")}
            </ButtonAction>
          </CardFooter>
        </Card>
      </section>
    </main>
  );
}
