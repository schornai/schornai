"use client";

import {
  AudioRecorderProvider,
  type AudioRecordingConfig,
} from "./AudioRecorderModal";
import { NO_GROUP_KEY, useGroupSortView } from "@/lib/groupSortView/hook";
import { createContext, useContext } from "react";
import type { GroupSortFunctions } from "@/lib/groupSortView/hook";
import type { Preferences } from "@/lib/groupSortView/types";
import type { ReactNode } from "react";
import type { Storage } from "@schornio/aibox-package-database/storage/_types";
import type { StorageObjectTileVariant } from "./StorageObjectTile";
import type { StorageRealtimeObject } from "@schornio/aibox-realtime/documents/storage/_types";
import { getTimeGroups } from "@schornio/aibox-package-utils/groupByDays";
import { logError } from "@schornio/aibox-package-ui/components/error-log";
import { useFilter } from "@/lib/useFilter";

type Groups = "first-letter" | "type" | "updated" | "created";

type Sorts = "updated" | "created" | "name" | "size";

type Views = StorageObjectTileVariant | "table" | "columns";

export type StorageColumnFolder = {
  path: string;
  objects: StorageRealtimeObject[];
};

const defaultPreferences: Preferences = {
  group: "no-group",
  sort: "name:asc",
  view: "tiles-medium",
};

const { sevenDaysAgoTime, startOfTodayTime, thirtyDaysAgoTime } = getTimeGroups(
  new Date(),
);

const timeOrder = ["today", "last7Days", "last30Days"];

function getTimeGroup(timestamp: number) {
  if (timestamp >= startOfTodayTime) {
    return "today";
  } else if (timestamp >= sevenDaysAgoTime) {
    return "last7Days";
  } else if (timestamp >= thirtyDaysAgoTime) {
    return "last30Days";
  }

  return NO_GROUP_KEY;
}

const functions: GroupSortFunctions<StorageRealtimeObject, Groups, Sorts> = {
  group(group, storageObject) {
    switch (group) {
      case "first-letter":
        return storageObject.name.trim().toUpperCase().charAt(0);
      case "type":
        return storageObject.file
          ? (storageObject.path.split(".").pop() ?? NO_GROUP_KEY)
          : "directory";
      case "updated":
        return storageObject.file
          ? getTimeGroup(new Date(storageObject.updatedAtISO).getTime())
          : NO_GROUP_KEY;
      case "created":
        return storageObject.file
          ? getTimeGroup(new Date(storageObject.createdAtISO).getTime())
          : NO_GROUP_KEY;
    }
    return NO_GROUP_KEY;
  },
  groupSort(type, groupKeyA, groupKeyB) {
    switch (type) {
      case "first-letter":
        return groupKeyA.localeCompare(groupKeyB);
      case "type": {
        if (groupKeyA === "directory") {
          if (groupKeyB === "directory") {
            return 0;
          } else {
            return 1;
          }
        }
        if (groupKeyB === "directory") {
          return -1;
        }
        return groupKeyA.localeCompare(groupKeyB);
      }
      case "updated":
      case "created":
        return timeOrder.indexOf(groupKeyA) - timeOrder.indexOf(groupKeyB);
    }
    return groupKeyA.localeCompare(groupKeyB);
  },
  sort(type, storageObjectA, storageObjectB) {
    switch (type) {
      case "created":
        return (
          (storageObjectA.file
            ? new Date(storageObjectA.createdAtISO).getTime()
            : 0) -
          (storageObjectB.file
            ? new Date(storageObjectB.createdAtISO).getTime()
            : 0)
        );
      default:
      case "updated":
        return (
          (storageObjectA.file
            ? new Date(storageObjectA.updatedAtISO).getTime()
            : 0) -
          (storageObjectB.file
            ? new Date(storageObjectB.updatedAtISO).getTime()
            : 0)
        );
      case "name":
        return storageObjectA.name.localeCompare(storageObjectB.name);
      case "size":
        return (
          (storageObjectA.file ? storageObjectA.size : 0) -
          (storageObjectB.file ? storageObjectB.size : 0)
        );
    }
  },
};

const storageViewContext = createContext<
  | ((ReturnType<typeof useFilter> &
      ReturnType<
        typeof useGroupSortView<StorageRealtimeObject, Groups, Sorts, Views>
      >) & {
      basePathApp: string;
      basePathStorage: string;
      storage: Storage;
      pendingFilePaths: string[];
      canWrite: boolean;
      columnFolders?: StorageColumnFolder[];
    })
  | undefined
>(undefined);

export function StorageViewProvider({
  basePathApp,
  basePathStorage,
  children,
  columnFolders,
  id,
  storage,
  storageObjects,
  userPreferences,
  audioRecording,
  pendingFilePaths = [],
  canWrite = true,
}: {
  basePathApp: string;
  basePathStorage: string;
  children?: ReactNode;
  columnFolders?: StorageColumnFolder[];
  id: string;
  storage: Storage;
  storageObjects: StorageRealtimeObject[];
  userPreferences: Preferences;
  audioRecording?: AudioRecordingConfig;
  pendingFilePaths?: string[];
  canWrite?: boolean;
}) {
  const valueFilter = useFilter(storageObjects, {
    keys: ["name"],
  });

  const valueGroupSortView = useGroupSortView<
    StorageRealtimeObject,
    Groups,
    Sorts,
    Views
  >(
    id,
    valueFilter.filteredData,
    functions,
    userPreferences,
    defaultPreferences,
  );

  return (
    <storageViewContext.Provider
      value={{
        basePathApp,
        basePathStorage,
        storage,
        pendingFilePaths,
        canWrite,
        columnFolders,
        ...valueFilter,
        ...valueGroupSortView,
      }}
    >
      <AudioRecorderProvider config={audioRecording}>
        {children}
      </AudioRecorderProvider>
    </storageViewContext.Provider>
  );
}

export function useStorageView() {
  const context = useContext(storageViewContext);

  if (!context) {
    const error = new Error("useStorageView() called outside provider");
    logError("StorageViewProvider", error);
    throw error;
  }

  return context;
}
