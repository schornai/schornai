"use client";
import { DropdownMenuItemAction } from "@schornio/aibox-package-ui/components/dropdown-menu-item-action";
import { AgentRecommendedMessage } from "../../../agent/_components/AgentRecommendedMessage";
import { AutomationScheduleFields } from "./AutomationScheduleFields";
import { AutomationEditorAppearance } from "./AutomationEditorAppearance";
import { AutomationEditorDiscard } from "./AutomationEditorDiscard";
import type { SettingFavorites } from "../../../../_models/currentUserConfigFavorites";
import type { Theme } from "../../../../_models/systemConfigTheme";

import { useEffect, useId, useRef, useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";
import {
  FolderOpen,
  ChevronDown,
  ArrowDownToLine,
  CirclePlus,
  Clock,
  CalendarDays,
  CalendarRange,
  CalendarCheck,
  Timer,
  Files,
  Copy,
  Link as LinkIcon,
  Minus,
  MessageSquare,
  Power,
  Zap,
  Settings2,
  Ellipsis,
  X,
} from "lucide-react";
import { CircleChevronsRight } from "@/lib/icons/circle-chevrons-right";
import {
  HeaderMain,
  HeaderMainContent,
  HeaderMainAsideContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from "@schornio/aibox-package-ui/components/dropdown-menu";
import {
  TabsMainList,
  TabsMainTrigger,
  TabsMainContent,
} from "../../../../_components/TabsMain";
import { AutomationEditorOverview } from "./AutomationEditorOverview";
import { AutomationRun } from "./AutomationRun";
import { AutomationRemove } from "./AutomationRemove";
import { ChoiceCards } from "@schornio/aibox-package-ui/components/choice-cards";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import {
  ResourceSlot,
  type ResourceSlotProps,
} from "../../../../_components/ResourceSlot";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonDiscardChanges } from "@schornio/aibox-package-ui/components/button-discard-changes";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@schornio/aibox-package-ui/components/select";
import { Input } from "@schornio/aibox-package-ui/components/input";
import { Textarea } from "@schornio/aibox-package-ui/components/textarea";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@schornio/aibox-package-ui/components/collapsible";
import { Switch } from "@schornio/aibox-package-ui/components/switch";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldSet,
  FieldLegend,
} from "@schornio/aibox-package-ui/components/field";
import {
  automationInputSchema,
  type AutomationInput,
  type AutomationSchedule,
} from "@schornio/aibox-package-database/automation/_schemas";
import { StoragePickerDialog } from "../../../../_components/StoragePickerDialog";
import { saveAutomation } from "../_actions/saveAutomation";

export function AutomationEditor({
  initial,
  agents,
  repositories = [],
  favorites,
  theme,
  models,
  workspaces,
}: {
  initial?: AutomationInput & { nextRunAt?: string | null };
  favorites?: SettingFavorites;
  theme?: Theme;
  agents: Agent[];
  repositories?: DocumentRepository[];
  models?: ResourceSlotProps["models"];
  workspaces?: ResourceSlotProps["workspaces"];
}) {
  const { t } = useT("automation");
  const router = useRouter();
  const id = useId();
  const messageInput = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState<AutomationInput>(
    initial ?? {
      name: "",
      description: "",
      agentId: "",
      message: "",
      enabled: true,
      trigger: {
        type: "time",
        schedule: {
          kind: "weekly",
          weekdays: [1, 2, 3, 4, 5, 6, 0],
          time: "09:00",
          timezone: "UTC",
        },
      },
    },
  );
  const original = useRef(value);
  useEffect(() => {
    if (initial) return;
    setValue((current) => {
      if (
        current !== original.current ||
        current.trigger.type !== "time" ||
        current.trigger.schedule.kind !== "weekly"
      )
        return current;
      const next = {
        ...current,
        trigger: {
          ...current.trigger,
          schedule: {
            ...current.trigger.schedule,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        },
      };
      original.current = next;
      return next;
    });
  }, [initial]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [picker, setPicker] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const validation = automationInputSchema.safeParse(value);
  const invalidPaths =
    invalid && !validation.success
      ? validation.error.issues.map((issue) => issue.path.join("."))
      : [];
  if (
    invalid &&
    value.trigger.type === "storage" &&
    value.trigger.storage.type === "documentRepository" &&
    !value.trigger.storage.documentRepositoryId
  )
    invalidPaths.push("trigger.storage");
  const hasError = (path: string) =>
    invalidPaths.some(
      (issue) => issue === path || issue.startsWith(path + "."),
    );
  const invalidSections = {
    settings: ["name", "description", "color", "icon"].some(hasError),
    trigger: hasError("trigger"),
    chat: hasError("agentId") || hasError("message"),
  };
  const save = useAction(saveAutomation, {
    onSuccess: ({ data }) => {
      if (data?.id) router.push(`/app/automation/${data.id}/info`);
    },
  });
  const saveCopy = useAction(saveAutomation, {
    onSuccess: ({ data }) => {
      if (data?.id) router.push(`/app/automation/${data.id}/info`);
    },
  });
  const pending = save.isPending || saveCopy.isPending;
  const selectedAgent = agents.find((agent) => agent.id === value.agentId);
  const trigger = value.trigger;
  const repositoryId =
    trigger.type === "storage" && trigger.storage.type === "documentRepository"
      ? trigger.storage.documentRepositoryId
      : undefined;
  const selectedRepository = repositories.find(
    (repo) => repo.id === repositoryId,
  );
  const schedule = trigger.type === "time" ? trigger.schedule : undefined;
  const setSchedule = (schedule: AutomationSchedule) =>
    setValue({ ...value, trigger: { type: "time", schedule } });
  const icons = {
    time: Clock,
    storage: Files,
    hours: Timer,
    days: CalendarDays,
    weekly: CalendarRange,
    monthly: CalendarDays,
    once: CalendarCheck,
    none: Minus,
    copy: Copy,
    reference: LinkIcon,
  };
  const options = (keys: (keyof typeof icons)[]) =>
    keys.map((key) => ({
      value: key,
      label: t(`options.${key}`),
      icon: icons[key],
    }));
  const changed = JSON.stringify(original.current) !== JSON.stringify(value);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (changed) event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [changed]);
  const submit = (asCopy = false) => {
    if (pending) return;
    if (
      value.trigger.type === "storage" &&
      value.trigger.storage.type === "documentRepository" &&
      !value.trigger.storage.documentRepositoryId
    ) {
      setInvalid(true);
      router.push("?view=trigger");
      return;
    }
    const parsed = automationInputSchema.safeParse(value);
    setInvalid(!parsed.success);
    if (parsed.success) {
      if (asCopy)
        saveCopy.execute({ ...parsed.data, id: undefined, enabled: false });
      else save.execute(parsed.data);
    } else {
      const field = parsed.error.issues[0]?.path[0];
      const section = ["name", "description", "color", "icon"].includes(
        String(field),
      )
        ? "settings"
        : field === "trigger"
          ? "trigger"
          : "chat";
      router.push(`?view=${section}`);
    }
  };
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <HeaderMain appColor={value.color}>
        <HeaderMainContent>
          <CircleChevronsRight />
          <div className="flex flex-col text-center">
            <span className="text-nowrap">
              {initial ? t("labelAutomation") : t("labelNew")}
            </span>
            <span className="text-xs text-nowrap">{value.name}</span>
          </div>
          {initial && (
            <AutomationEditorDiscard
              initial={initial}
              value={value}
              disabled={pending}
              onDiscard={() => {
                setValue(initial);
                setInvalid(false);
              }}
            />
          )}
        </HeaderMainContent>
        <HeaderMainAsideContent>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" />}>
              <Ellipsis />
              <span className="sr-only sm:not-sr-only">
                {t("labelOptions")}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-max max-w-[calc(100vw-2rem)]"
              align="end"
            >
              <DropdownMenuGroup>
                <DropdownMenuItemAction
                  disabled={pending || (Boolean(initial) && !changed)}
                  isPending={save.isPending}
                  hasErrored={save.hasErrored}
                  onClick={() => submit()}
                >
                  {initial ? <ArrowDownToLine /> : <CirclePlus />}
                  {t(initial ? "labelSave" : "labelCreate")}
                </DropdownMenuItemAction>
                {initial?.id && (
                  <>
                    <AutomationRun
                      automation={{ ...initial, id: initial.id }}
                      menu
                    />
                    <DropdownMenuItemAction
                      disabled={pending}
                      isPending={saveCopy.isPending}
                      hasErrored={saveCopy.hasErrored}
                      onClick={() => submit(true)}
                    >
                      <CirclePlus />
                      {t("labelSaveCopy")}
                    </DropdownMenuItemAction>
                    <DropdownMenuSeparator />
                    <DropdownMenuItemAction
                      variant="destructive"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <X />
                      {t("labelDelete")}
                    </DropdownMenuItemAction>
                  </>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </HeaderMainAsideContent>
      </HeaderMain>
      {initial?.id && (
        <AutomationRemove
          id={initial.id}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          hideTrigger
        />
      )}
      <TabsMainList stickyTop>
        <TabsMainTrigger view="default">
          <CircleChevronsRight />
          {t("labelOverview")}
        </TabsMainTrigger>
        <TabsMainTrigger
          view="trigger"
          className={invalidSections.trigger ? "text-destructive" : undefined}
        >
          <Zap />
          {t("labelTrigger")}
        </TabsMainTrigger>
        <TabsMainTrigger
          view="chat"
          className={invalidSections.chat ? "text-destructive" : undefined}
        >
          <MessageSquare />
          {t("labelStartChat")}
        </TabsMainTrigger>
        <TabsMainTrigger
          view="settings"
          className={invalidSections.settings ? "text-destructive" : undefined}
        >
          <Settings2 />
          {t("labelSettings")}
        </TabsMainTrigger>
        <ButtonAction
          size="sm"
          type="submit"
          isPending={save.isPending}
          hasErrored={save.hasErrored}
          disabled={!agents.length || (Boolean(initial) && !changed)}
        >
          {initial ? <ArrowDownToLine /> : <CirclePlus />}
          {t(initial ? "labelSave" : "labelCreate")}
        </ButtonAction>
      </TabsMainList>
      {(invalidPaths.length > 0 || save.hasErrored || saveCopy.hasErrored) && (
        <ContainerMain>
          <FieldError>
            {t(invalidPaths.length > 0 ? "errorInvalid" : "errorSave")}
          </FieldError>
        </ContainerMain>
      )}
      <TabsMainContent view="default">
        <ContainerMain className="mb-6">
          <FieldSet disabled={pending}>
            <ContainerStyled
              variant="card"
              className={
                value.enabled ? "border-primary/40 bg-primary/5 p-5" : "p-5"
              }
            >
              <Field
                orientation="horizontal"
                className="items-center justify-between gap-6"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span
                    className={
                      value.enabled
                        ? "bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-full"
                        : "bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-full"
                    }
                  >
                    <Power className="size-6" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <FieldLabel
                      htmlFor={`${id}-enabled`}
                      className="text-lg font-semibold"
                    >
                      {t(value.enabled ? "labelEnabled" : "labelPaused")}
                    </FieldLabel>
                    <FieldDescription id={`${id}-status`}>
                      {t(
                        value.enabled
                          ? "descriptionEnabled"
                          : "descriptionPaused",
                      )}
                    </FieldDescription>
                  </div>
                </div>
                <Switch
                  id={`${id}-enabled`}
                  aria-label={t("labelEnabled")}
                  aria-describedby={`${id}-status`}
                  checked={value.enabled}
                  onCheckedChange={(enabled) => setValue({ ...value, enabled })}
                  className="mr-2 scale-150"
                />
              </Field>
            </ContainerStyled>
          </FieldSet>
        </ContainerMain>
        <AutomationEditorOverview
          creating={!initial}
          editDefaultAutomation={original.current}
          automation={{
            ...value,
            nextRunAt: changed ? undefined : initial?.nextRunAt,
          }}
          agents={agents}
          repositories={repositories}
          favorites={favorites}
        />
      </TabsMainContent>
      <TabsMainContent view="trigger">
        <ContainerMain>
          <FieldSet disabled={pending}>
            <FieldLegend>{t("labelTrigger")}</FieldLegend>
            <FieldGroup>
              <ChoiceCards
                label={t("labelTrigger")}
                value={trigger.type}
                options={options(["time", "storage"]).map((option) => ({
                  ...option,
                  description: t(`descriptions.${option.value}`),
                }))}
                onValueChange={(type) =>
                  setValue({
                    ...value,
                    trigger:
                      type === "time"
                        ? {
                            type: "time",
                            schedule: {
                              kind: "weekly",
                              weekdays: [1, 2, 3, 4, 5, 6, 0],
                              time: "09:00",
                              timezone:
                                Intl.DateTimeFormat().resolvedOptions()
                                  .timeZone,
                            },
                          }
                        : {
                            type: "storage",
                            storage: {
                              type: "documentRepository",
                              documentRepositoryId: "",
                            },
                            events: ["processed"],
                            folder: "",
                            includeSubfolders: true,
                            attachment: "copy",
                          },
                  })
                }
              />
              {schedule && (
                <AutomationScheduleFields
                  errors={{
                    every: hasError("trigger.schedule.every")
                      ? t("errorInterval")
                      : undefined,
                    day: hasError("trigger.schedule.day")
                      ? t("errorMonthday")
                      : undefined,
                    time: hasError("trigger.schedule.time")
                      ? t("errorTime")
                      : undefined,
                    timezone: hasError("trigger.schedule.timezone")
                      ? t("errorTimezone")
                      : undefined,
                    weekdays: hasError("trigger.schedule.weekdays")
                      ? t("errorWeekdays")
                      : undefined,
                    at: hasError("trigger.schedule.at")
                      ? t("errorOnce")
                      : undefined,
                  }}
                  schedule={schedule}
                  enabled={value.enabled}
                  nextRunAt={changed ? undefined : initial?.nextRunAt}
                  onChange={setSchedule}
                />
              )}
              {trigger.type === "storage" && (
                <>
                  <Field
                    data-invalid={
                      hasError("trigger.storage") || hasError("trigger.folder")
                    }
                  >
                    <FieldLabel>{t("labelFolder")}</FieldLabel>
                    <Button
                      type="button"
                      variant="outline"
                      className="justify-start"
                      aria-invalid={
                        hasError("trigger.storage") ||
                        hasError("trigger.folder")
                      }
                      aria-describedby={
                        hasError("trigger.storage") ||
                        hasError("trigger.folder")
                          ? `${id}-folder-error`
                          : undefined
                      }
                      onClick={() => setPicker(true)}
                    >
                      <FolderOpen />
                      {trigger.storage.type === "documentRepository" &&
                      !trigger.storage.documentRepositoryId
                        ? t("labelChooseFolder")
                        : `${trigger.storage.type === "documentRepository" ? (selectedRepository?.name ?? t("labelFolder")) : t("labelFolder")} / ${trigger.folder}`}
                    </Button>
                    {(hasError("trigger.storage") ||
                      hasError("trigger.folder")) && (
                      <FieldError id={`${id}-folder-error`}>
                        {t(
                          hasError("trigger.storage")
                            ? "errorFolder"
                            : "errorFolderPath",
                        )}
                      </FieldError>
                    )}
                  </Field>
                  <StoragePickerDialog
                    open={picker}
                    onOpenChange={setPicker}
                    mode="folder"
                    title={t("labelChooseFolder")}
                    description={t("descriptionFolderScope")}
                    currentStorageLabel={selectedRepository?.name}
                    initialPath={trigger.folder}
                    currentStorage={
                      trigger.storage.type === "documentRepository" &&
                      !trigger.storage.documentRepositoryId
                        ? undefined
                        : trigger.storage
                    }
                    onSelect={async ({ storage, path }) => {
                      setValue({
                        ...value,
                        trigger: { ...trigger, storage, folder: path },
                      });
                      setPicker(false);
                    }}
                  />
                  <Collapsible>
                    {hasError("trigger.events") && (
                      <FieldError id={`${id}-events-error`}>
                        {t("errorEvents")}
                      </FieldError>
                    )}
                    <CollapsibleTrigger
                      aria-invalid={hasError("trigger.events")}
                      aria-describedby={
                        hasError("trigger.events")
                          ? `${id}-events-error`
                          : undefined
                      }
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-auto w-full justify-between text-left whitespace-normal"
                        />
                      }
                    >
                      <span className="flex flex-col gap-1">
                        <span>{t("labelEvents")}</span>
                        <span className="text-muted-foreground text-xs font-normal">
                          {trigger.events.length
                            ? trigger.events
                                .map((event) => t(`options.${event}`))
                                .join(", ")
                            : t("labelNoEvents")}
                        </span>
                      </span>
                      <ChevronDown />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-4">
                      <FieldSet>
                        <FieldGroup className="grid grid-cols-2 gap-3">
                          {(
                            [
                              "uploaded",
                              "processed",
                              "deleted",
                              "updated",
                              "moved",
                            ] as const
                          ).map((event) => (
                            <Field orientation="horizontal" key={event}>
                              <Switch
                                id={`${id}-${event}`}
                                aria-invalid={hasError("trigger.events")}
                                aria-describedby={
                                  hasError("trigger.events")
                                    ? `${id}-events-error`
                                    : undefined
                                }
                                checked={trigger.events.includes(event)}
                                onCheckedChange={(checked) =>
                                  setValue({
                                    ...value,
                                    trigger: {
                                      ...trigger,
                                      events: checked
                                        ? [...trigger.events, event]
                                        : trigger.events.filter(
                                            (item) => item !== event,
                                          ),
                                    },
                                  })
                                }
                              />
                              <FieldLabel htmlFor={`${id}-${event}`}>
                                {t(`options.${event}`)}
                              </FieldLabel>
                            </Field>
                          ))}
                        </FieldGroup>
                      </FieldSet>
                    </CollapsibleContent>
                  </Collapsible>
                  <Collapsible>
                    <CollapsibleTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-auto w-full justify-between text-left whitespace-normal"
                        />
                      }
                    >
                      <span className="flex flex-col gap-1">
                        <span>{t("labelAttachment")}</span>
                        <span className="text-muted-foreground text-xs font-normal">
                          {t(`options.${trigger.attachment}`)}
                        </span>
                      </span>
                      <ChevronDown />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-4">
                      <Select
                        value={trigger.attachment}
                        items={options(["none", "copy", "reference"])}
                        onValueChange={(attachment) => {
                          if (
                            attachment !== "none" &&
                            attachment !== "copy" &&
                            attachment !== "reference"
                          )
                            return;
                          setValue({
                            ...value,
                            trigger: { ...trigger, attachment },
                          });
                        }}
                      >
                        <SelectTrigger
                          className="w-full"
                          aria-label={t("labelAttachment")}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {options(["none", "copy", "reference"]).map(
                              (option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ),
                            )}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        {t("descriptionAttachment")}
                      </FieldDescription>
                    </CollapsibleContent>
                  </Collapsible>
                  <Collapsible>
                    <CollapsibleTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-auto w-full justify-between text-left whitespace-normal"
                        />
                      }
                    >
                      <span className="flex flex-col gap-1">
                        <span>{t("labelStorageOptions")}</span>
                        <span className="text-muted-foreground text-xs font-normal">
                          {t(
                            trigger.includeSubfolders
                              ? "labelScopeRecursive"
                              : "labelScopeFolder",
                          )}
                        </span>
                      </span>
                      <ChevronDown />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <FieldGroup className="pt-4">
                        <Field orientation="horizontal">
                          <Switch
                            id={`${id}-recursive`}
                            checked={trigger.includeSubfolders}
                            onCheckedChange={(checked) =>
                              setValue({
                                ...value,
                                trigger: {
                                  ...trigger,
                                  includeSubfolders: Boolean(checked),
                                },
                              })
                            }
                          />
                          <FieldLabel htmlFor={`${id}-recursive`}>
                            {t("labelSubfolders")}
                          </FieldLabel>
                        </Field>
                      </FieldGroup>
                    </CollapsibleContent>
                  </Collapsible>
                </>
              )}
            </FieldGroup>
          </FieldSet>
        </ContainerMain>
      </TabsMainContent>
      <TabsMainContent view="chat">
        <ContainerMain>
          <FieldSet disabled={pending}>
            <FieldLegend>{t("labelStartChat")}</FieldLegend>
            <FieldDescription>{t("descriptionStartChat")}</FieldDescription>
            <FieldGroup>
              <Field
                data-invalid={hasError("agentId")}
                role="group"
                aria-describedby={
                  hasError("agentId") ? `${id}-agent-error` : undefined
                }
              >
                <ResourceSlot
                  type="agent"
                  resources={agents}
                  value={value.agentId}
                  onChange={(agentId) =>
                    setValue({ ...value, agentId: agentId ?? "" })
                  }
                  label={t("labelAgent")}
                  invalid={hasError("agentId")}
                  disabled={pending}
                  repositories={repositories}
                  models={models}
                  workspaces={workspaces}
                />
                {hasError("agentId") && (
                  <FieldError id={`${id}-agent-error`}>
                    {t("errorAgent")}
                  </FieldError>
                )}
              </Field>
              <Field data-invalid={hasError("message")}>
                <FieldLabel htmlFor={`${id}-message`}>
                  {t("labelMessage")}
                </FieldLabel>
                {Boolean(selectedAgent?.recommendedMessages.length) && (
                  <div
                    className="flex flex-col gap-2"
                    role="group"
                    aria-label={t("labelRecommendedMessages")}
                  >
                    <FieldDescription>
                      {t("descriptionRecommendedMessages")}
                    </FieldDescription>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {selectedAgent!.recommendedMessages.map(
                        (recommendation) => (
                          <AgentRecommendedMessage
                            key={recommendation.id}
                            agent={selectedAgent}
                            recommendedMessage={recommendation}
                            disabled={pending}
                            onSelect={(message) => {
                              setValue({ ...value, message });
                              messageInput.current?.focus();
                            }}
                          />
                        ),
                      )}
                    </div>
                  </div>
                )}
                <Textarea
                  ref={messageInput}
                  id={`${id}-message`}
                  aria-invalid={hasError("message")}
                  aria-describedby={
                    hasError("message") ? `${id}-message-error` : undefined
                  }
                  required
                  maxLength={100000}
                  value={value.message}
                  onChange={(e) =>
                    setValue({ ...value, message: e.target.value })
                  }
                />
                {hasError("message") && (
                  <FieldError id={`${id}-message-error`}>
                    {t("errorMessage")}
                  </FieldError>
                )}
              </Field>
            </FieldGroup>
          </FieldSet>
        </ContainerMain>
      </TabsMainContent>
      <TabsMainContent view="settings">
        <ContainerMain>
          <FieldSet disabled={pending}>
            <FieldLegend>{t("labelSettings")}</FieldLegend>
            <FieldDescription>{t("descriptionPersonal")}</FieldDescription>
            <FieldGroup>
              <Field data-invalid={hasError("name")}>
                <FieldLabel htmlFor={`${id}-name`}>
                  {t("labelName")}{" "}
                  <ButtonDiscardChanges
                    variant="inline"
                    objA={initial?.name ?? ""}
                    objB={value.name}
                    onClick={() =>
                      setValue({ ...value, name: initial?.name ?? "" })
                    }
                  />
                </FieldLabel>
                <Input
                  id={`${id}-name`}
                  aria-invalid={hasError("name")}
                  aria-describedby={
                    hasError("name") ? `${id}-name-error` : undefined
                  }
                  required
                  maxLength={200}
                  value={value.name}
                  onChange={(e) => setValue({ ...value, name: e.target.value })}
                />
                {hasError("name") && (
                  <FieldError id={`${id}-name-error`}>
                    {t("errorName")}
                  </FieldError>
                )}
              </Field>
              <Field data-invalid={hasError("description")}>
                <FieldLabel htmlFor={`${id}-description`}>
                  {t("labelDescription")}{" "}
                  <ButtonDiscardChanges
                    variant="inline"
                    objA={initial?.description ?? ""}
                    objB={value.description ?? ""}
                    onClick={() =>
                      setValue({
                        ...value,
                        description: initial?.description ?? "",
                      })
                    }
                  />
                </FieldLabel>
                <Textarea
                  id={`${id}-description`}
                  aria-invalid={hasError("description")}
                  aria-describedby={
                    hasError("description")
                      ? `${id}-description-error`
                      : undefined
                  }
                  maxLength={10000}
                  value={value.description ?? ""}
                  onChange={(e) =>
                    setValue({ ...value, description: e.target.value })
                  }
                />
                {hasError("description") && (
                  <FieldError id={`${id}-description-error`}>
                    {t("errorDescription")}
                  </FieldError>
                )}
                <FieldDescription>
                  {t("descriptionDescription")}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldSet>
        </ContainerMain>
        <hr className="my-10" />
        <AutomationEditorAppearance
          value={value}
          initial={initial}
          onChange={setValue}
          theme={theme}
          disabled={pending}
        />
      </TabsMainContent>
    </form>
  );
}
