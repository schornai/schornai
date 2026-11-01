// Legacy reindex documents retain their original serialized file shape.
type FileInfo = { name: string; filePath: string; type: string };

export type ReindexState = {
  file: FileInfo;
  id: string;
  status: "queued" | "indexing" | "success" | "error";
};
