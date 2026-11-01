// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AvatarUser } from "../../packages/ui/src/components/avatar-user";
import { EditorAvatar } from "../../apps/web/app/(settings)/_components/EditorAvatar";
vi.mock("../../packages/ui/src/components/avatar", () => ({
  Avatar: ({ children }: any) => <div>{children}</div>,
  AvatarFallback: ({ children }: any) => <span>{children}</span>,
  AvatarImage: (props: any) => <img alt="avatar" {...props} />,
}));
vi.mock("next-i18next/server", () => ({
  getT: async () => ({ t: (key: string) => key }),
}));
vi.mock(
  "../../apps/web/app/(settings)/_components/EditorAvatarUploadProvider",
  () => ({
    EditorAvatarUploadProvider: ({ children }: any) => <div>{children}</div>,
  }),
);
vi.mock("../../apps/web/app/(settings)/_components/EditorAvatarUpload", () => ({
  EditorAvatarUpload: () => <button>Upload</button>,
}));
vi.mock("../../apps/web/app/(settings)/_components/EditorAvatarDelete", () => ({
  EditorAvatarDelete: () => <button>Delete</button>,
}));
afterEach(cleanup);
it.each([
  ["https://idp.test/avatar.png", "https://idp.test/avatar.png"],
  ["user_avatars/user/own.png", "/api/storage/user_avatars/user/own.png"],
])("renders avatar source %s", (avatarUrl, expected) => {
  render(<AvatarUser avatarUrl={avatarUrl} />);
  expect(screen.getByRole("img").getAttribute("src")).toBe(expected);
  expect(screen.getByRole("img").getAttribute("referrerpolicy")).toBe(
    "no-referrer",
  );
});
it.each([false, true])(
  "only offers deletion for an own avatar: %s",
  async (hasOwnAvatar) => {
    render(
      await EditorAvatar({
        userId: "user",
        avatarUrl: "https://idp.test/avatar.png",
        hasOwnAvatar,
      }),
    );
    expect(Boolean(screen.queryByRole("button", { name: "Delete" }))).toBe(
      hasOwnAvatar,
    );
    expect(screen.getByRole("button", { name: "Upload" })).toBeTruthy();
  },
);
