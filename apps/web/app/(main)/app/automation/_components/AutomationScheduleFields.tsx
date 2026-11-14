"use client";
import { useId } from "react";
import {
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  Timer,
} from "lucide-react";
import { useT } from "next-i18next/client";
import type { AutomationSchedule } from "@schornio/aibox-package-database/automation/_schemas";
import { AutomationNextRun } from "./AutomationNextRun";
import { ChoiceCards } from "@schornio/aibox-package-ui/components/choice-cards";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { Input } from "@schornio/aibox-package-ui/components/input";
import { Switch } from "@schornio/aibox-package-ui/components/switch";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@schornio/aibox-package-ui/components/collapsible";
import {
  Field,
  FieldSet,
  FieldLegend,
  FieldDescription,
  FieldLabel,
  FieldGroup,
  FieldError,
} from "@schornio/aibox-package-ui/components/field";
export function AutomationScheduleFields({
  schedule,
  onChange,
  enabled = true,
  nextRunAt,
  errors = {},
}: {
  schedule: AutomationSchedule;
  errors?: Partial<
    Record<"every" | "day" | "time" | "timezone" | "weekdays" | "at", string>
  >;
  enabled?: boolean;
  nextRunAt?: string | null;
  onChange: (value: AutomationSchedule) => void;
}) {
  const { t, i18n } = useT("automation");
  const id = useId();
  const interval = schedule.kind === "hours" || schedule.kind === "days";
  const weekday = (day: number) =>
    new Intl.DateTimeFormat(i18n.resolvedLanguage ?? "de", {
      weekday: "long",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(2026, 10, 15 + day)));
  const changeKind = (kind: string) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (kind === "interval") onChange({ kind: "hours", every: 1 });
    if (kind === "weekly")
      onChange({
        kind: "weekly",
        weekdays: [1, 2, 3, 4, 5, 6, 0],
        time: "09:00",
        timezone,
      });
    if (kind === "monthly")
      onChange({ kind: "monthly", day: 1, time: "09:00", timezone });
    if (kind === "once")
      onChange({
        kind: "once",
        at: new Date(Date.now() + 3600000).toISOString(),
      });
  };
  return (
    <>
      <FieldSet>
        <FieldLegend>{t("labelSchedule")}</FieldLegend>
        <ChoiceCards
          variant="segments"
          label={t("labelSchedule")}
          value={interval ? "interval" : schedule.kind}
          onValueChange={changeKind}
          options={[
            { value: "interval", label: t("options.interval"), icon: Timer },
            {
              value: "weekly",
              label: t("options.weekly"),
              icon: CalendarRange,
            },
            {
              value: "monthly",
              label: t("options.monthly"),
              icon: CalendarDays,
            },
            { value: "once", label: t("options.once"), icon: CalendarCheck },
          ]}
        />
        <FieldDescription>
          <AutomationNextRun
            automation={{
              enabled,
              trigger: { type: "time", schedule },
              nextRunAt,
            }}
            showLabel
          />
        </FieldDescription>
      </FieldSet>
      {interval && (
        <Field data-invalid={Boolean(errors.every)}>
          <FieldLabel htmlFor={`${id}-every`}>
            {t("labelIntervalHours")}
          </FieldLabel>
          <Input
            id={`${id}-every`}
            aria-invalid={Boolean(errors.every)}
            aria-describedby={errors.every ? `${id}-every-error` : undefined}
            type="number"
            required
            min={1}
            max={8760}
            value={
              schedule.kind === "days" ? schedule.every * 24 : schedule.every
            }
            onChange={(e) =>
              onChange({ kind: "hours", every: Number(e.target.value) })
            }
          />
          {errors.every && (
            <FieldError id={`${id}-every-error`}>{errors.every}</FieldError>
          )}
          <FieldDescription>{t("descriptionInterval")}</FieldDescription>
        </Field>
      )}
      {(schedule.kind === "weekly" || schedule.kind === "monthly") && (
        <>
          {schedule.kind === "monthly" && (
            <Field data-invalid={Boolean(errors.day)}>
              <FieldLabel htmlFor={`${id}-monthday`}>
                {t("labelMonthday")}
              </FieldLabel>
              <Input
                id={`${id}-monthday`}
                aria-invalid={Boolean(errors.day)}
                aria-describedby={errors.day ? `${id}-day-error` : undefined}
                type="number"
                required
                min={1}
                max={31}
                value={schedule.day}
                onChange={(e) =>
                  onChange({ ...schedule, day: Number(e.target.value) })
                }
              />
              {errors.day && (
                <FieldError id={`${id}-day-error`}>{errors.day}</FieldError>
              )}
              <FieldDescription>{t("descriptionMonthday")}</FieldDescription>
            </Field>
          )}
          <Field data-invalid={Boolean(errors.time)}>
            <FieldLabel htmlFor={`${id}-time`}>{t("labelTime")}</FieldLabel>
            <Input
              id={`${id}-time`}
              aria-invalid={Boolean(errors.time)}
              aria-describedby={errors.time ? `${id}-time-error` : undefined}
              type="time"
              required
              value={schedule.time}
              onChange={(e) => onChange({ ...schedule, time: e.target.value })}
            />
            {errors.time && (
              <FieldError id={`${id}-time-error`}>{errors.time}</FieldError>
            )}
          </Field>
          {schedule.kind === "weekly" && (
            <Collapsible>
              {errors.weekdays && (
                <FieldError id={`${id}-weekdays-error`}>
                  {errors.weekdays}
                </FieldError>
              )}
              <CollapsibleTrigger
                aria-invalid={Boolean(errors.weekdays)}
                aria-describedby={
                  errors.weekdays ? `${id}-weekdays-error` : undefined
                }
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                  />
                }
              >
                <CalendarRange />
                <span>
                  {schedule.weekdays.length === 7
                    ? t("labelEveryWeekday")
                    : t("labelSelectedWeekdays")}
                </span>
                <ChevronDown />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <FieldSet className="pt-4">
                  <FieldLegend>{t("labelWeekdays")}</FieldLegend>
                  <FieldGroup className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                      <Field key={day} orientation="horizontal">
                        <Switch
                          id={`${id}-day-${day}`}
                          aria-invalid={Boolean(errors.weekdays)}
                          aria-describedby={
                            errors.weekdays ? `${id}-weekdays-error` : undefined
                          }
                          checked={schedule.weekdays.includes(day)}
                          onCheckedChange={(checked) =>
                            onChange({
                              ...schedule,
                              weekdays: checked
                                ? [...schedule.weekdays, day]
                                : schedule.weekdays.filter((d) => d !== day),
                            })
                          }
                        />
                        <FieldLabel htmlFor={`${id}-day-${day}`}>
                          {weekday(day)}
                        </FieldLabel>
                      </Field>
                    ))}
                  </FieldGroup>
                </FieldSet>
              </CollapsibleContent>
            </Collapsible>
          )}
          <Collapsible>
            {errors.timezone && (
              <FieldError id={`${id}-timezone-error`}>
                {errors.timezone}
              </FieldError>
            )}
            <CollapsibleTrigger
              aria-invalid={Boolean(errors.timezone)}
              aria-describedby={
                errors.timezone ? `${id}-timezone-error` : undefined
              }
              render={
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-between"
                />
              }
            >
              <span>
                {t("labelTimezone")}: {schedule.timezone}
              </span>
              <ChevronDown />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <Field data-invalid={Boolean(errors.timezone)}>
                <FieldLabel htmlFor={`${id}-timezone`}>
                  {t("labelTimezone")}
                </FieldLabel>
                <Input
                  id={`${id}-timezone`}
                  aria-invalid={Boolean(errors.timezone)}
                  aria-describedby={
                    errors.timezone ? `${id}-timezone-error` : undefined
                  }
                  required
                  value={schedule.timezone}
                  onChange={(e) =>
                    onChange({ ...schedule, timezone: e.target.value })
                  }
                />
                <FieldDescription>{t("descriptionTimezone")}</FieldDescription>
              </Field>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}
      {schedule.kind === "once" && (
        <Field data-invalid={Boolean(errors.at)}>
          <FieldLabel htmlFor={`${id}-once`}>{t("labelOnce")}</FieldLabel>
          <Input
            id={`${id}-once`}
            aria-invalid={Boolean(errors.at)}
            aria-describedby={errors.at ? `${id}-at-error` : undefined}
            type="datetime-local"
            required
            value={
              schedule.at
                ? new Date(
                    new Date(schedule.at).getTime() -
                      new Date(schedule.at).getTimezoneOffset() * 60000,
                  )
                    .toISOString()
                    .slice(0, 16)
                : ""
            }
            onChange={(e) =>
              onChange({
                kind: "once",
                at: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : "",
              })
            }
          />
          {errors.at && (
            <FieldError id={`${id}-at-error`}>{errors.at}</FieldError>
          )}
          <FieldDescription>{t("descriptionOnce")}</FieldDescription>
        </Field>
      )}
    </>
  );
}
