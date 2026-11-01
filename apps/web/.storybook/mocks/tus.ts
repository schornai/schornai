import { scenarioState } from "../scenario";

type Options = {
  onProgress?: (uploaded: number, total: number) => void;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};
export class Upload {
  private timer?: ReturnType<typeof setTimeout>;
  private file: File;
  private options: Options;
  constructor(file: File, options: Options) {
    this.file = file;
    this.options = options;
  }
  start() {
    const total = this.file.size || 1;
    this.options.onProgress?.(total / 2, total);
    if (scenarioState.current === "pending") return;
    this.timer = setTimeout(() => {
      if (scenarioState.current === "error")
        this.options.onError?.(new Error("Storybook: Upload fehlgeschlagen"));
      else {
        this.options.onProgress?.(total, total);
        this.options.onSuccess?.();
      }
    }, 300);
  }
  async abort() {
    clearTimeout(this.timer);
  }
}
