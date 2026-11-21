import { redirect } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ automationId: string }>;
}) {
  const { automationId } = await params;
  redirect(`/app/automation/${encodeURIComponent(automationId)}/info`);
}
