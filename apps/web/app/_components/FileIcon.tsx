import {
  FileChartColumnIncreasing,
  FileChartPie,
  FileCode2,
  FileImage,
  FileQuestion,
  FileText,
  FileType2,
  FileVideoCamera,
  FileVolume,
} from "lucide-react";
import { getFileCategory } from "@schornio/aibox-package-utils/getFileTypeLabel";

export function FileIcon({
  className,
  path,
}: {
  className?: string;
  path?: string;
}) {
  const fileCategory = getFileCategory(path ?? "");

  switch (fileCategory) {
    case "audio":
      return <FileVolume className={className} />;
    case "video":
      return <FileVideoCamera className={className} />;
    case "code":
      return <FileCode2 className={className} />;
    case "image":
      return <FileImage className={className} />;
    case "plain-text":
      return <FileText className={className} />;
    case "presentation":
      return <FileChartPie className={className} />;
    case "rich-text":
      return <FileType2 className={className} />;
    case "spreadsheet":
      return <FileChartColumnIncreasing className={className} />;
    default:
      return <FileQuestion className={className} />;
  }
}
