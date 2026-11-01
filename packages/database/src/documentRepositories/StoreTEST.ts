import { Camelize, FileObjectV2 } from "@supabase/storage-js";
import type { SupabaseClient } from "../_shared/_types.ts";

export type FileInfo = {
  name: string;
  size: number;
  type: string;

  isFile: true;
  isFolder: false;
};

export type FolderInfo = {
  name: string;

  isFile: false;
  isFolder: true;
};

export type RepositoryItemInfo = FileInfo | FolderInfo;

type Repository = {
  copy: (sourcePath: string, destinationPath: string) => Promise<void>;
  exists: (filePath: string) => Promise<boolean>;
  getFile: (filePath: string) => Promise<Blob>;
  getInfo: (filePath: string) => Promise<RepositoryItemInfo>;
  list: (folderPath: string) => Promise<RepositoryItemInfo[]>;
  move: (sourcePath: string, destinationPath: string) => Promise<void>;
  remove: (path: string) => Promise<void>;
  save: (filePath: string, blob: Blob) => Promise<void>;
};

async function tryCall<T>(promise: Promise<T>): Promise<T | undefined> {
  try {
    await promise;
  } catch {
    return undefined;
  }
}

class DocumentRepository implements Repository {
  #supabaseBucketName = "file_repository";
  #supabaseStorage: SupabaseClient["storage"];

  static #mapSupabaseFileInfo(data: {
    metadata?: { mimetype: string; size: number } | null;
    name: string;
  }): RepositoryItemInfo {
    if (data.metadata) {
      return {
        isFile: true as const,
        isFolder: false as const,
        name: data.name,
        size: data.metadata.size,
        type: data.metadata.mimetype,
      };
    } else {
      return {
        isFile: false as const,
        isFolder: true as const,
        name: data.name,
      };
    }
  }

  constructor(supabaseStorage: SupabaseClient["storage"]) {
    this.#supabaseStorage = supabaseStorage;
  }

  #getSupabaseBucket() {
    return this.#supabaseStorage.from(this.#supabaseBucketName);
  }

  #getItemType(path: string) {}

  async #deleteFiles(filePaths: string[]) {
    const { error } = await this.#getSupabaseBucket().remove(filePaths);
    if (error) throw error;
  }

  async;

  async delete(filePath: string) {
    const info = await this.getInfo(filePath);

    if (info.isFile) {
      await this.#deleteFiles([filePath]);
    }

    if (info.isFolder) {
      const folderContent = await this.list(filePath);
    }
  }

  async getInfo(filePath: string) {
    const { data, error } = await this.#getSupabaseBucket().info(filePath);
    if (error) throw error;
    return DocumentRepository.#mapSupabaseFileInfo(data);
  }

  async list(folderPath: string) {
    const { data, error } = await this.#getSupabaseBucket().list(folderPath);
    if (error) throw error;
    return (
      data?.map((item) => DocumentRepository.#mapSupabaseFileInfo(item)) ?? []
    );
  }
}

class MDVDocumentRepository extends DocumentRepository {
  #getMDVFilePath(filePath: string) {
    return `${filePath}.__xrag_content.mdv`;
  }

  async delete(filePath: string) {
    await Promise.all([
      super.delete(filePath),
      tryCall(super.delete(this.#getMDVFilePath(filePath))),
    ]);
  }
}

// type DocumentMDVStore = DocumentStore & {
//   existsMDV: (path: string) => boolean;
//   getMDV: (path: string) => unknown;
//   saveMDV: (path: string, content: string) => void;
// };

class IDSwMDV implements DocumentStore {
  getFileAsBlob(path: string) {
    return path;
  }
}

type GetFileParams = [
  filePath: string,
  database: DocumentDatabaseIdentifier,
  storage: { supabaseStorage: SupabaseClient["storage"] },
];

export async function getFileAsBlob(...getFileParams: GetFileParams) {
  const [filePath, database, { supabaseStorage }] = getFileParams;

  const { data, error } = await supabaseStorage
    .from(STORE_NAME)
    .download(getDocumentPath(filePath, database));

  if (error) throw error;

  return data;
}

export async function existsMDV(...getFileParams: GetFileParams) {
  const [filePath, database, { supabaseStorage }] = getFileParams;

  const { data } = await supabaseStorage
    .from(STORE_NAME)
    .exists(`${getDocumentPath(filePath, database)}.__xrag_content.mdv`);

  return data;
}

export async function getFileInfo(
  ...getFileParams: GetFileParams
): Promise<FileInfo> {
  const [filePath, database, { supabaseStorage }] = getFileParams;
  console.log({ documentPaht: getDocumentPath(filePath, database) });
  const [{ data, error }, hasMDV] = await Promise.all([
    supabaseStorage.from(STORE_NAME).info(getDocumentPath(filePath, database)),
    existsMDV(...getFileParams),
  ]);
  console.log(error);
  if (error) throw error;

  return {
    filePath,
    hasMDV,
    name: data.name.split("/").pop() ?? "",
    size: data.size ?? -1,
    type: data.contentType ?? "application/octet-stream",
  };
}

export async function getFileAsMDVString(...getFileParams: GetFileParams) {
  const [filePath, database, { supabaseStorage }] = getFileParams;

  const filePathMDV = `${filePath}.__xrag_content.mdv`;
  const blob = await getFileAsBlob(filePathMDV, database, { supabaseStorage });

  return await blob.text();
}

export async function tryGetFileAsMDVString(...getFileParams: GetFileParams) {
  try {
    return await getFileAsMDVString(...getFileParams);
  } catch {
    return undefined;
  }
}

export async function getFileAsText(...getFileParams: GetFileParams) {
  const mdvString = await getFileAsMDVString(...getFileParams);
  // todo: strip mdv
  return mdvString;
}
