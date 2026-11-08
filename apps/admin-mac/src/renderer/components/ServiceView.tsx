import { useId, useMemo, useState } from "react";
import Fuse from "fuse.js";
import { useDebounce } from "@schornio/aibox-package-ui/hooks/use-debounce";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Play,
  Search,
  Square,
  Terminal,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@schornio/aibox-package-ui/components/alert";
import { Badge } from "@schornio/aibox-package-ui/components/badge";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@schornio/aibox-package-ui/components/card";
import { Checkbox } from "@schornio/aibox-package-ui/components/checkbox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@schornio/aibox-package-ui/components/empty";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@schornio/aibox-package-ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@schornio/aibox-package-ui/components/input-group";
import { LogoSchornAI } from "@schornio/aibox-package-ui/components/logo-schornai";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@schornio/aibox-package-ui/components/table";
import type { ChildProcessMessage, ServiceAction } from "../../types";

export function ServiceView({
  status,
  pending,
  error,
  messages,
  onControl,
}: {
  status: string;
  pending: ServiceAction | null;
  error: string;
  messages: ChildProcessMessage[];
  onControl: (action: ServiceAction) => Promise<void>;
}) {
  const { t, i18n } = useTranslation("admin", {
    keyPrefix: "_components.ServiceView",
  });
  const id = useId();
  const [showLogs, setShowLogs] = useState(false);
  const [search, setSearch] = useState("");
  const searchDebounced = useDebounce(search, 250);
  const [selectedSenders, setSelectedSenders] = useState<Set<string>>(
    new Set(),
  );
  const senders = Array.from(
    new Set(messages.map((message) => message.sender || "unknown")),
  ).sort();
  const senderLabel = (sender: string) =>
    sender === "unknown" ? t("labelUnknownSender") : sender;
  const unknownSender = t("labelUnknownSender");
  const searchIndex = useMemo(
    () =>
      new Fuse(messages, {
        keys: [
          "message",
          {
            name: "sender",
            getFn: (message) => message.sender || unknownSender,
          },
          "level",
          "timestampISO",
        ],
        threshold: 0.3,
        // Log messages can be long; search their entire contents while retaining
        // the stream's newest-first ordering instead of sorting by relevance.
        ignoreLocation: true,
        shouldSort: false,
      }),
    [messages, unknownSender],
  );
  const searchResults = useMemo(
    () =>
      searchDebounced.trim()
        ? searchIndex.search(searchDebounced.trim()).map(({ item }) => item)
        : messages,
    [searchIndex, searchDebounced, messages],
  );
  const filteredMessages = searchResults.filter((message) => {
    const sender = message.sender || "unknown";
    return !selectedSenders.size || selectedSenders.has(sender);
  });
  const labels: Record<string, string> = {
    starting: t("labelStarting"),
    running: t("labelRunning"),
    stopped: t("labelStopped"),
    stopping: t("labelStopping"),
    error: t("labelError"),
  };
  const displayedStatus =
    pending === "start" ? "starting" : pending === "stop" ? "stopping" : status;

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center gap-3">
        <LogoSchornAI className="w-32" />
        <Badge variant="outline">{t("labelAdmin")}</Badge>
        <p className="text-muted-foreground text-sm">
          {t("labelRelease", { name: t("labelReleaseName") })}
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>{t("labelTitle")}</h1>
          </CardTitle>
          <CardDescription>{t("descriptionService")}</CardDescription>
          <CardAction>
            <Badge
              role="status"
              aria-live="polite"
              variant={
                displayedStatus === "error"
                  ? "outline"
                  : displayedStatus === "running"
                    ? "default"
                    : "secondary"
              }
            >
              {displayedStatus === "error" ? <AlertCircle /> : null}
              {labels[displayedStatus] ?? displayedStatus}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <ButtonAction
              disabled={pending !== null || status === "running"}
              isPending={pending === "start"}
              onClick={() => void onControl("start")}
            >
              <Play data-icon="inline-start" />
              {t("labelStart")}
            </ButtonAction>
            <ButtonAction
              variant="outline"
              disabled={pending !== null || status === "stopped"}
              isPending={pending === "stop"}
              onClick={() => void onControl("stop")}
            >
              <Square data-icon="inline-start" />
              {t("labelStop")}
            </ButtonAction>
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>{t("errorCommand")}</AlertTitle>
              <AlertDescription>
                <pre className="max-h-40 overflow-auto wrap-anywhere whitespace-pre-wrap">
                  {error}
                </pre>
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground">{t("descriptionBackground")}</p>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{t("labelLogs")}</h2>
          </CardTitle>
          <CardDescription>{t("descriptionLogs")}</CardDescription>
          <CardAction>
            <Button
              variant="outline"
              size="icon"
              aria-label={showLogs ? t("labelHideLogs") : t("labelShowLogs")}
              aria-expanded={showLogs}
              aria-controls={`${id}-logs`}
              onClick={() => setShowLogs(!showLogs)}
            >
              {showLogs ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent
          id={`${id}-logs`}
          hidden={!showLogs}
          className="flex flex-col gap-4"
        >
          {showLogs ? (
            <>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor={`${id}-search`}>
                    {t("labelSearch")}
                  </FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    <InputGroup className="min-w-40 flex-1">
                      <InputGroupAddon>
                        <Search />
                      </InputGroupAddon>
                      <InputGroupInput
                        id={`${id}-search`}
                        value={search}
                        placeholder={t("labelSearch")}
                        onChange={(event) => setSearch(event.target.value)}
                      />
                    </InputGroup>
                    <Button
                      variant="outline"
                      disabled={!search && !selectedSenders.size}
                      onClick={() => {
                        setSearch("");
                        setSelectedSenders(new Set());
                      }}
                    >
                      {t("labelResetFilters")}
                    </Button>
                  </div>
                </Field>
                {senders.length ? (
                  <FieldSet>
                    <FieldLegend variant="label">
                      {t("labelSenders")}
                    </FieldLegend>
                    <FieldGroup className="flex-row flex-wrap gap-4">
                      {senders.map((sender, index) => (
                        <Field
                          key={sender}
                          orientation="horizontal"
                          className="w-auto"
                        >
                          <Checkbox
                            id={`${id}-sender-${index}`}
                            checked={selectedSenders.has(sender)}
                            onCheckedChange={(checked) =>
                              setSelectedSenders((previous) => {
                                const next = new Set(previous);
                                if (checked) next.add(sender);
                                else next.delete(sender);
                                return next;
                              })
                            }
                          />
                          <FieldLabel htmlFor={`${id}-sender-${index}`}>
                            {senderLabel(sender)}
                          </FieldLabel>
                        </Field>
                      ))}
                    </FieldGroup>
                  </FieldSet>
                ) : null}
              </FieldGroup>
              {filteredMessages.length ? (
                <div
                  role="region"
                  aria-label={t("labelLogs")}
                  tabIndex={0}
                  className="max-h-[55vh] overflow-auto [&>[data-slot=table-container]]:overflow-visible"
                >
                  <Table aria-label={t("labelLogs")}>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("labelSenders")}</TableHead>
                        <TableHead>{t("labelLevel")}</TableHead>
                        <TableHead>{t("labelTime")}</TableHead>
                        <TableHead>{t("labelMessage")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMessages.map((message, index) => (
                        <TableRow key={`${message.timestampISO}-${index}`}>
                          <TableCell className="align-top">
                            {senderLabel(message.sender || "unknown")}
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge
                              variant={
                                message.level === "stderr"
                                  ? "outline"
                                  : "secondary"
                              }
                            >
                              {message.level === "stderr" ? (
                                <AlertCircle />
                              ) : null}
                              {message.level}
                            </Badge>
                          </TableCell>
                          <TableCell className="align-top">
                            <time
                              dateTime={message.timestampISO}
                              title={message.timestampISO}
                            >
                              {new Date(message.timestampISO).toLocaleString(
                                i18n.resolvedLanguage,
                              )}
                            </time>
                          </TableCell>
                          <TableCell className="min-w-60 align-top wrap-anywhere whitespace-pre-wrap">
                            <span className="font-mono text-xs">
                              {message.message}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Terminal />
                    </EmptyMedia>
                    <EmptyTitle>
                      {t(messages.length ? "labelNoMatches" : "labelEmpty")}
                    </EmptyTitle>
                    <EmptyDescription>
                      {t(
                        messages.length
                          ? "descriptionNoMatches"
                          : "descriptionEmpty",
                      )}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
