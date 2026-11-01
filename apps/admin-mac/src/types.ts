export type ChildProcessMessage = {
  level: "stdout" | "stderr";
  message: string;
  sender?: string;
  timestampISO: string;
};

export type ServiceAction = "start" | "stop";

export type AdminAPI = {
  command: (action: ServiceAction | "status") => Promise<string>;
  onRunBoxMessage: (
    callback: (message: ChildProcessMessage) => void,
  ) => () => void;
};
