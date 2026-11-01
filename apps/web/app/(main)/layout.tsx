import { ActivityContext } from "./_components/ActivityContext";
import { Footer } from "../_components/Footer";
import { RealtimeProvider } from "@/lib/RealtimeProvider";
import { Sidebar } from "./_components/Sidebar";
import { SidebarProviderPersistent } from "../_components/SidebarProviderPersistent";
import { Suspense } from "react";

export default function Layout(props: LayoutProps<"/">) {
  return (
    <Suspense fallback={null}>
      <RealtimeProvider url="/v2/realtime">
        <ActivityContext>
          <SidebarProviderPersistent>
            <Sidebar />
            <div className="flex w-full min-w-0 flex-col">
              <main className="flex w-full min-w-0 flex-1 flex-col max-lg:min-h-screen">
                {props.children}
              </main>
              <Footer />
            </div>
          </SidebarProviderPersistent>
        </ActivityContext>
      </RealtimeProvider>
    </Suspense>
  );
}
