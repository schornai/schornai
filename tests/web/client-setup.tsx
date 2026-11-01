import { vi } from "vitest";
const client = vi.hoisted(() => ({
  params: new URLSearchParams(),
  pathname: "/test",
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  execute: vi.fn(),
  validationErrors: undefined as any,
  actionOptions: undefined as any,
  actionOptionsByAction: new Map<unknown, any>(),
  pending: false,
  onDragEnd: undefined as any,
  supportedLanguages: ["en", "de"],
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => client.params,
  usePathname: () => client.pathname,
  useRouter: () => ({
    push: client.push,
    replace: client.replace,
    refresh: client.refresh,
  }),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("next-i18next/client", () => ({
  Trans: ({ i18nKey }: any) => i18nKey,
  useT: () => ({
    t: (key: string) => key,
    i18n: {
      language: "en",
      languages: ["en", "de"],
      options: { supportedLngs: client.supportedLanguages },
    },
  }),
}));
vi.mock("next-i18next/server", () => ({
  getT: vi.fn(async () => ({
    lng: "en",
    t: (key: string) => key,
    i18n: { language: "en", languages: ["en"] },
  })),
}));
vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: vi.fn() }),
  headers: async () => new Headers(),
}));
vi.mock("next-safe-action/hooks", () => ({
  useAction: (_action: any, options: any) => {
    client.actionOptions = options;
    client.actionOptionsByAction.set(_action, options);
    return {
      execute: client.execute,
      executeAsync: client.execute,
      isPending: client.pending,
      result: { validationErrors: client.validationErrors },
    };
  },
}));
vi.mock("lucide-react/dynamic", () => ({
  iconNames: ["bot", "file", "audio-lines"],
  DynamicIcon: ({ name }: any) => <svg data-icon={name} />,
}));
vi.mock("@schornio/aibox-package-ui/components/markdown-prose", () => ({
  MarkdownProse: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("@schornio/aibox-package-ui/components/markdown", () => ({
  Markdown: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("@schornio/aibox-package-ui/components/code", () => ({
  Code: ({ children }: any) => <pre>{children}</pre>,
  CodeProvider: ({ children }: any) => children,
}));
vi.mock("@schornio/aibox-package-ui/components/error-log", () => ({
  logError: vi.fn(),
}));

export { client };

vi.mock("@dnd-kit/react", () => ({
  DragDropProvider: ({ children, onDragEnd }: any) => {
    client.onDragEnd = onDragEnd;
    return children;
  },
}));
vi.mock("@dnd-kit/react/sortable", () => ({
  useSortable: () => ({
    ref: () => {},
    handleRef: () => {},
    isDragging: false,
  }),
}));
