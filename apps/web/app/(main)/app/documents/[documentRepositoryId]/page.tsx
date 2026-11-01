import { redirect } from "next/navigation";

export const instant = false;

export default async function Page({
  params,
}: {
  params: Promise<{ documentRepositoryId: string }>;
}) {
  const { documentRepositoryId } = await params;
  return redirect(`/app/documents/${documentRepositoryId}/files`);
}
