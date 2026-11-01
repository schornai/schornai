// @vitest-environment jsdom
import "./client-setup";
import {
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { client } from "./client-setup";
import {
  StorageViewProvider,
  useStorageView,
} from "../../apps/web/app/_components/StorageViewProvider";
import { StorageView } from "../../apps/web/app/_components/StorageView";
import { StorageObjectTile } from "../../apps/web/app/_components/StorageObjectTile";
import { FileUploadDropZone } from "../../apps/web/app/_components/FileUploadDropZone";
import { StorageViewUpload } from "../../apps/web/app/_components/StorageViewUpload";
const uploads = vi.hoisted(() => ({
  progress: 0,
  uploads: [] as any[],
  queueFileUploadsByDataTransfer: vi.fn(),
  queueFileUploadsByFileList: vi.fn(),
}));
vi.mock("../../apps/web/app/_components/FileUploadProvider", () => ({
  useFileUpload: () => uploads,
}));
vi.mock("@/lib/groupSortView/action", () => ({ savePreferences: vi.fn() }));
afterEach(cleanup);
beforeEach(() => {
  client.params = new URLSearchParams();
  uploads.uploads = [];
  uploads.progress = 0;
  uploads.queueFileUploadsByDataTransfer.mockClear();
});
const storage: any = {
  type: "documentRepository",
  workspaceId: "workspace",
  documentRepositoryId: "repository",
};
const now = Date.now();
const objects: any[] = [
  { folder: true, name: "Folder", path: "folder" },
  ...[0, 3, 15, 45].map((days, index) => ({
    file: true,
    name: `File ${index}.txt`,
    path: `file${index}.txt`,
    type: "text/plain",
    size: 100 + index,
    createdAtISO: new Date(now - days * 86400000).toISOString(),
    updatedAtISO: new Date(now - days * 86400000).toISOString(),
    currentAction:
      index === 1
        ? { state: "error" }
        : index === 2
          ? { state: "uploading", progress: 0.5 }
          : index === 3
            ? { state: "processing" }
            : undefined,
  })),
];
const mount = (
  view: string,
  group: string,
  data = objects,
  sort = "name:asc",
) =>
  render(
    <StorageViewProvider
      basePathApp="/files"
      basePathStorage="/"
      id="files"
      storage={storage}
      storageObjects={data}
      userPreferences={{ view, group, sort }}
    >
      <StorageView />
    </StorageViewProvider>,
  );
describe("storage browser", () => {
  it.each([
    { query: "sort=name%3Adesc", expectedQuery: "?sort=name%3Adesc" },
    { query: "", expectedQuery: "" },
    { query: "view=table&sort=name%3Adesc", expectedQuery: "" },
  ])(
    "uses the effective view for breadcrumb links with saved columns and '$query'",
    ({ query, expectedQuery }) => {
      client.params = new URLSearchParams(query);
      render(
        <StorageViewProvider
          basePathApp="/files"
          basePathStorage="Reports/Annual"
          id="files"
          storage={storage}
          storageObjects={objects}
          userPreferences={{ view: "columns" }}
        >
          <StorageView />
        </StorageViewProvider>,
      );
      expect(
        screen.getByRole("link", { name: "labelRoot" }).getAttribute("href"),
      ).toBe(`/files${expectedQuery}`);
      expect(
        screen.getByRole("link", { name: "Reports" }).getAttribute("href"),
      ).toBe(`/files/Reports${expectedQuery}`);
      expect(
        screen.getByRole("link", { name: "Annual" }).getAttribute("href"),
      ).toBe(`/files/Reports/Annual${expectedQuery}`);
    },
  );

  it("shows the folder chain, preserves column navigation and opens selected file details", async () => {
    client.params = new URLSearchParams("view=columns&sort=name%3Adesc");
    const nested = {
      ...objects[1],
      name: "Budget #1.txt",
      path: "Reports/Budget #1.txt",
    };
    const props = {
      basePathApp: "/files",
      basePathStorage: "Reports",
      id: "files",
      storage,
      storageObjects: [nested],
      userPreferences: { view: "table" },
      columnFolders: [
        {
          path: "",
          objects: [
            { folder: true, name: "Reports", path: "Reports" },
            { folder: true, name: "Archive", path: "Archive" },
          ],
        },
        { path: "Reports", objects: [nested] },
      ],
    };
    const result = render(
      <StorageViewProvider {...props}>
        <StorageView />
      </StorageViewProvider>,
    );
    const columns = within(
      screen.getByRole("region", { name: "labelColumns" }),
    );
    expect(
      columns
        .getByRole("link", { name: "Reports" })
        .getAttribute("aria-current"),
    ).toBe("page");
    const href = screen
      .getByRole("link", { name: "Archive" })
      .getAttribute("href")!;
    expect(href).toContain("/files/Archive?");
    expect(new URL(href, "https://test").searchParams.get("view")).toBe(
      "columns",
    );
    expect(new URL(href, "https://test").searchParams.get("sort")).toBe(
      "name:desc",
    );
    expect(
      screen.getAllByRole("link", { name: "Reports" })[0].getAttribute("href"),
    ).toContain("view=columns");
    fireEvent.click(screen.getByRole("button", { name: nested.name }));
    expect(screen.getByRole("region", { name: "labelColumns" })).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: nested.name })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen.getByRole("link", { name: "labelOpen" }).getAttribute("href"),
    ).toContain("/files/Reports/Budget%20%231.txt?");
    result.rerender(
      <StorageViewProvider {...props} storageObjects={[]}>
        <StorageView />
      </StorageViewProvider>,
    );
    expect(screen.queryByRole("link", { name: "labelOpen" })).toBeNull();
    expect(screen.getByText("labelTitle")).toBeTruthy();
  });
  for (const view of ["table", "tiles-small", "tiles-medium", "tiles-large"]) {
    it.each(["first-letter", "type", "created", "updated", "no-group"])(
      `displays ${view} grouped by %s with navigable files and folders`,
      (group) => {
        mount(view, group);
        expect(
          screen.getByRole("link", { name: /File 0.txt/ }).getAttribute("href"),
        ).toBe("/files/file0.txt");
        expect(
          screen.getByRole("link", { name: /Folder/ }).getAttribute("href"),
        ).toBe("/files/folder");
        expect(screen.getByPlaceholderText("placeholderSearch")).toBeTruthy();
      },
    );
    it(`renders an empty ${view} and filters from the search field`, async () => {
      mount(view, "no-group");
      fireEvent.change(screen.getByPlaceholderText("placeholderSearch"), {
        target: { value: "zzzz unknown" },
      });
      await waitFor(() =>
        expect(screen.queryByRole("link", { name: /File 0.txt/ })).toBeNull(),
      );
      expect(screen.getByText("labelTitle")).toBeTruthy();
    });
  }
  it.each(["created:asc", "updated:desc", "size:desc"])(
    "orders files and folders using %s",
    (sort) => {
      const { result } = renderHook(useStorageView, {
        wrapper: ({ children }) => (
          <StorageViewProvider
            basePathApp="/files"
            basePathStorage="/"
            id="files"
            storage={storage}
            storageObjects={objects}
            userPreferences={{ sort }}
          >
            {children}
          </StorageViewProvider>
        ),
      });
      const paths = result.current.itemGroups[0][1].map((x) => x.path);
      expect(paths).toEqual(
        sort === "created:asc"
          ? ["folder", "file3.txt", "file2.txt", "file1.txt", "file0.txt"]
          : sort === "updated:desc"
            ? ["file0.txt", "file1.txt", "file2.txt", "file3.txt", "folder"]
            : ["file3.txt", "file2.txt", "file1.txt", "file0.txt", "folder"],
      );
    },
  );
  it("requires its provider", () => {
    expect(() => renderHook(useStorageView)).toThrow(/outside provider/);
  });
});
describe("storage tiles and drop zones", () => {
  it.each([undefined, "created", "error", "uploading", "processing"])(
    "renders image previews with state %s",
    (state) => {
      render(
        <StorageObjectTile
          basePathApp="/files"
          storage={storage}
          storageObject={
            {
              ...objects[1],
              name: "Photo",
              path: "photo.png",
              currentAction: state ? { state, progress: 0.5 } : undefined,
            } as any
          }
          variant="tiles-medium"
        />,
      );
      expect(screen.getByText("Photo")).toBeTruthy();
      const img = document.querySelector("img");
      if (!state || state === "processing")
        expect(img?.getAttribute("src")).toContain("/api/storage/");
      else if (state === "uploading" || state === "error")
        expect(img).toBeNull();
    },
  );
  it("shows unprocessed content, plain files without navigation, and upload error details", () => {
    render(
      <StorageObjectTile
        storageObject={
          {
            ...objects[1],
            path: "paper.pdf",
            currentAction: { state: "created" },
          } as any
        }
        variant="tiles-large"
      />,
    );
    expect(screen.getByText("Noch nicht verarbeitet")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    cleanup();
    uploads.progress = 0.5;
    uploads.uploads = [
      {
        id: "failure",
        state: "error",
        path: "bad.txt",
        errorMessage: "Network failed",
      },
    ];
    render(<StorageViewUpload />);
    expect(screen.getByText("Fehler beim Hochladen")).toBeTruthy();
    fireEvent.click(screen.getByText("bad.txt"));
    expect(screen.getByText("Network failed")).toBeTruthy();
  });
  it("indicates drag-over and forwards dropped entries then clears the overlay", () => {
    const { container } = render(
      <FileUploadDropZone>
        <p>Target</p>
      </FileUploadDropZone>,
    );
    const target = container.firstElementChild!;
    fireEvent.dragOver(target);
    expect(screen.getByText("drop")).toBeTruthy();
    fireEvent.dragLeave(target);
    expect(screen.queryByText("drop")).toBeNull();
    fireEvent.dragOver(target);
    const dataTransfer = { items: [] };
    fireEvent.drop(target, { dataTransfer });
    expect(uploads.queueFileUploadsByDataTransfer).toHaveBeenCalledWith(
      dataTransfer,
    );
    expect(screen.queryByText("drop")).toBeNull();
  });
});

it.each(["no-group", "unexpected", "type"])(
  "keeps folders and distinct file types in fallback group %s",
  (group) => {
    const data = [
      { folder: true, name: "Z Folder", path: "z" },
      { folder: true, name: "A Folder", path: "a" },
      { ...objects[1], name: "PDF", path: "document.pdf" },
      { ...objects[2], name: "Text", path: "text.txt" },
    ];
    const { result } = renderHook(useStorageView, {
      wrapper: ({ children }) => (
        <StorageViewProvider
          basePathApp="/files"
          basePathStorage="/"
          id="files"
          storage={storage}
          storageObjects={data}
          userPreferences={{ group, sort: "size:asc" }}
        >
          {children}
        </StorageViewProvider>
      ),
    });
    expect(
      result.current.itemGroups.flatMap(([, values]) => values),
    ).toHaveLength(4);
    if (group === "type")
      expect(result.current.itemGroups.map(([key]) => key)).toEqual([
        "pdf",
        "txt",
        "directory",
      ]);
  },
);

it.each(["documentRepository", "activity"])(
  "groups upload and additional actions for %s",
  async (type) => {
    render(
      <StorageViewProvider
        basePathApp="/files"
        basePathStorage="/folder"
        id="files"
        storage={{ ...storage, type } as any}
        storageObjects={[]}
        userPreferences={{}}
        audioRecording={{}}
      >
        <StorageView />
      </StorageViewProvider>,
    );
    expect(
      screen.getByRole("button", { name: "labelUploadFile" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "labelTitle" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "labelOptions" }));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "labelNewRecording" }),
    );
    expect(
      await screen.findByRole("button", { name: "labelStart" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "labelClose" }));
    fireEvent.click(screen.getByRole("button", { name: "labelOptions" }));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "labelNewFolder" }),
    );
    expect(
      await screen.findByPlaceholderText("placeholderFolderName"),
    ).toBeTruthy();
  },
);

it("keeps new folder available without a transcriber and hides recording", async () => {
  mount("tiles-medium", "no-group", []);
  fireEvent.click(screen.getByRole("button", { name: "labelOptions" }));
  expect(
    await screen.findByRole("menuitem", { name: "labelNewFolder" }),
  ).toBeTruthy();
  expect(
    screen.queryByRole("menuitem", { name: "labelNewRecording" }),
  ).toBeNull();
});

it("keeps upload and recording as separate buttons for transcription folders", () => {
  render(
    <StorageViewProvider
      basePathApp="/files"
      basePathStorage="/"
      id="files"
      storage={{
        type: "activity-transcription",
        activityId: "activity",
        transcriberId: "transcriber",
      }}
      storageObjects={[]}
      userPreferences={{}}
      audioRecording={{}}
    >
      <StorageView />
    </StorageViewProvider>,
  );
  expect(screen.getByRole("button", { name: "labelUploadFile" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "labelTitle" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "labelOptions" })).toBeNull();
});
