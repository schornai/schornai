export type RowChange = {
  action: "add" | "delete";
  change: string;
  row: number;
};

export type Version = {
  changes: RowChange[];
  date: Date;
  version: number;
};

export type MDC = {
  current: string;
  versions: Version[];
};
