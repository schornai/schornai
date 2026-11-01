import { useContext, useMemo, type ReactNode } from "react";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
// The extensionless import intentionally bypasses the Storybook-only .js alias.
import { RedirectBoundary as NextRedirectBoundary } from "next/dist/client/components/redirect-boundary";

/**
 * Storybook 10.6 supplies the pre-16.4 layout context (parentCacheNode).
 * Next 16.4 useRouter reads parentRenderTree.data.bfcacheId, including inside
 * Storybook's outer RedirectBoundary, before preview decorators can run.
 * Supply the stable cache identity of this isolated story. Remove this adapter
 * once @storybook/nextjs-vite supplies parentRenderTree itself.
 */
export function RedirectBoundary({ children }: { children: ReactNode }) {
  const layout = useContext(LayoutRouterContext);
  const compatibleLayout = useMemo(
    () =>
      layout && {
        ...layout,
        parentRenderTree:
          layout.parentRenderTree ??
          ({ data: { bfcacheId: 0 } } as typeof layout.parentRenderTree),
      },
    [layout],
  );
  return (
    <LayoutRouterContext.Provider value={compatibleLayout}>
      <NextRedirectBoundary>{children}</NextRedirectBoundary>
    </LayoutRouterContext.Provider>
  );
}
