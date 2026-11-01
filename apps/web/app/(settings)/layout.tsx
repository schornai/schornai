import { Footer } from "../_components/Footer";
import { RealtimeProvider } from "@/lib/RealtimeProvider";
import { Sidebar } from "./_components/Sidebar";
import { SidebarProviderPersistent } from "../_components/SidebarProviderPersistent";
import { Suspense } from "react";

export default function Layout(props: LayoutProps<"/">) {
  return (
    <Suspense fallback={null}>
      <RealtimeProvider url="/v2/realtime">
        <SidebarProviderPersistent>
          <Sidebar />
          <div className="flex w-full flex-col">
            <main className="flex-1 max-lg:min-h-screen">{props.children}</main>
            <Suspense>
              <Footer />
            </Suspense>
          </div>
        </SidebarProviderPersistent>
      </RealtimeProvider>
    </Suspense>
  );
}
