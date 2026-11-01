import { BotMessageSquare, Unplug } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FindBoxesScreen } from "@/components/FindBoxesScreen";
import { LogoMain } from "@/components/LogoMain";
import { createRoot } from "react-dom/client";

function App() {
  const [trustedBoxLoading, setTrustedBoxLoading] = useState(true);
  const [box, setBox] = useState<BoxEndpoint>();

  const clearBox = useCallback(() => {
    setBox(undefined);
  }, []);

  const onBoxSelected = useCallback(
    (box: BoxEndpoint, options?: { persist: boolean }) => {
      setTrustedBoxLoading(true);
      void window.aiboxDesktopAPI.trustBox(box).then(() => {
        setBox(box);
        setTrustedBoxLoading(false);
      });
    },
    [],
  );

  useEffect(() => {
    setTrustedBoxLoading(true);
    void window.aiboxDesktopAPI.getTrustedBox().then((box) => {
      setBox(box);
      setTrustedBoxLoading(false);
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="bg-primary flex h-7 items-center justify-center gap-2">
        <div className="flex w-full items-center justify-center gap-2 [app-region:drag]">
          <BotMessageSquare className="h-5 text-white" />
          <LogoMain className="w-20 text-white" />
        </div>
        <Button
          className="mr-1 h-5 w-5 cursor-pointer text-white"
          onClick={clearBox}
          variant="ghost"
        >
          <Unplug />
        </Button>
      </div>
      {trustedBoxLoading ? (
        <div className="bg-muted flex flex-1 items-center justify-center">
          <LogoMain className="text-muted-foreground animate-pulse" />
        </div>
      ) : (
        <>
          {box ? (
            <>
              <webview
                className="flex-1"
                partition="persist:schornai"
                src={`https://${box.hostname}`}
              ></webview>
            </>
          ) : (
            <FindBoxesScreen onBoxSelected={onBoxSelected} />
          )}
        </>
      )}
    </div>
  );
}

const root = createRoot(document.body);
root.render(<App />);
