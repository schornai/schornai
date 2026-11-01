type BoxEndpoint = {
  certificateFingerprint256: string;
  hostname: string;
};

type FindLocalBoxesOptions = {
  onBoxFound?: (box: BoxEndpoint) => void;
  onFinished?: (boxes: BoxEndpoint[]) => void;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface Window {
  aiboxDesktopAPI: {
    findLocalBoxes: (options: FindLocalBoxesOptions) => void;
    getTrustedBox: () => Promise<BoxEndpoint | undefined>;
    trustBox: (box: BoxEndpoint) => Promise<void>;
  };
}
