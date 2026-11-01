import { useCallback, useEffect, useRef, useState } from "react";
import type { ChildProcessMessage, ServiceAction } from "../types";
import { ServiceView } from "./components/ServiceView";

export function App() {
  const [status, setStatus] = useState("starting");
  const [pending, setPending] = useState<ServiceAction | null>(null);
  const commandPending = useRef(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<ChildProcessMessage[]>([]);
  const control = useCallback(async (action: ServiceAction) => {
    if (commandPending.current) return;
    commandPending.current = true;
    setPending(action);
    setError("");
    try {
      await window.aiboxAdminAPI.command(action);
      const result = JSON.parse(
        await window.aiboxAdminAPI.command("status"),
      ) as { state: string };
      setStatus(result.state);
    } catch (failure) {
      setError(String(failure));
    } finally {
      commandPending.current = false;
      setPending(null);
    }
  }, []);

  useEffect(
    () =>
      window.aiboxAdminAPI.onRunBoxMessage((message) => {
        setMessages((previous) => {
          const counts = new Map<string, number>();
          return [...previous, message]
            .sort((a, b) => b.timestampISO.localeCompare(a.timestampISO))
            .filter((entry) => {
              const sender = entry.sender || "unknown";
              const count = counts.get(sender) ?? 0;
              counts.set(sender, count + 1);
              return count < 1000;
            });
        });
      }),
    [],
  );

  useEffect(() => {
    void control("start");
    const timer = setInterval(() => {
      if (commandPending.current) return;
      void window.aiboxAdminAPI
        .command("status")
        .then((value) =>
          setStatus((JSON.parse(value) as { state: string }).state),
        )
        .catch((failure) => setError(String(failure)));
    }, 3000);
    return () => clearInterval(timer);
  }, [control]);

  return (
    <ServiceView
      status={status}
      pending={pending}
      error={error}
      messages={messages}
      onControl={control}
    />
  );
}
