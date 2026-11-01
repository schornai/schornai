export type BinInfo =
  | {
      path?: string;
      version?: string;
    }
  | null
  | undefined;

export type SpaceInfo =
  | {
      spaceInBytes?: number;
    }
  | null
  | undefined;

export type SystemInfo = {
  boxData: {
    colimaInfo: BinInfo;
    databaseSpace: SpaceInfo;
    dockerComposeInfo: BinInfo;
    dockerInfo: BinInfo;
    ffmpegInfo: BinInfo;
    macOSVersion?: string;
    macSerialNumber?: string;
    nodeInfo: BinInfo;
    ollamaInfo: BinInfo;
    ollamaSpace: SpaceInfo;
    python3Info: BinInfo;
    storage?: {
      availableSpaceInBytes: number;
      totalSpaceInBytes: number;
    } | null;
    transcribeSpace: SpaceInfo;
  };
  boxId: string;
};
