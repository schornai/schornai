"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@schornio/aibox-package-ui/components/breadcrumb";
import { Fragment } from "react/jsx-runtime";
import Link from "next/link";
import { resolvePath } from "@schornio/aibox-package-utils/resolvePath";
import { useT } from "next-i18next/client";
import { useSearchParams } from "next/navigation";

function toBreadcrumbs(path: string) {
  const resolvedPath = resolvePath(path);

  if (resolvedPath === "") {
    return [];
  }

  const breadcrumbs: { path: string; segment: string }[] = [];
  const currentPathSegments: string[] = [];
  for (const segment of resolvedPath.split("/")) {
    currentPathSegments.push(segment);
    breadcrumbs.push({ path: currentPathSegments.join("/"), segment });
  }

  return breadcrumbs;
}

export function StorageBreadcrumbs({
  basePathApp,
  path,
  view,
}: {
  basePathApp: string;
  path: string;
  view?: string;
}) {
  const { t } = useT("common", {
    keyPrefix: "_components.StorageBreadcrumbs",
  });

  const breadcrumbs = toBreadcrumbs(path);
  const searchParams = useSearchParams();
  const effectiveView = view ?? searchParams.get("view");
  const query =
    effectiveView === "columns" && searchParams.size > 0
      ? `?${searchParams}`
      : "";

  return (
    <Breadcrumb className="mx-auto">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link href={`${basePathApp}${query}`} />}>
            {t("labelRoot")}
          </BreadcrumbLink>
        </BreadcrumbItem>
        {breadcrumbs.map(({ path, segment }) => (
          <Fragment key={path}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                render={
                  <Link
                    href={`${basePathApp}/${path.split("/").map(encodeURIComponent).join("/")}${query}`}
                  />
                }
              >
                {segment}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
