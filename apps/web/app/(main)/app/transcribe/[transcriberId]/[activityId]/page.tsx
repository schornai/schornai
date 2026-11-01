import { redirect } from "next/navigation";

export const instant = false;

export default async function Page({
  params,
}: PageProps<"/app/transcribe/[transcriberId]/[activityId]">) {
  const { activityId, transcriberId } = await params;
  return redirect(`/app/transcribe/${transcriberId}/${activityId}/files`);
}
