"use client";

import { useId, useRef, useState } from "react";
import { ImageUp, X } from "lucide-react";
import { useT } from "next-i18next/client";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from "@schornio/aibox-package-ui/components/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@schornio/aibox-package-ui/components/field";
import { Input } from "@schornio/aibox-package-ui/components/input";
import {
  FileUploadProvider,
  useFileUpload,
} from "../../../../_components/FileUploadProvider";
import { FileUploadDropZone } from "../../../../_components/FileUploadDropZone";
import { isThemeLogoUrl } from "@/lib/themeSettings";
import { getThemeLanguageName } from "@/lib/themeLanguages";
import type { Theme } from "@/lib/theme";

const logoTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];
const logoMaxBytes = 5 * 1024 * 1024;
type ThemeLogo = NonNullable<Theme["logo"]>[string];

function LogoUploadButton({
  disabled,
  isPending,
}: {
  disabled: boolean;
  isPending: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { queueFileUploadsByFileList } = useFileUpload();
  const { t } = useT("settings", { keyPrefix: "_components.ThemeLogoEditor" });
  return (
    <Field>
      <ButtonAction
        type="button"
        variant="outline"
        isPending={isPending}
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        <ImageUp data-icon="inline-start" /> {t("labelUpload")}
      </ButtonAction>
      <input
        ref={input}
        type="file"
        accept={logoTypes.join(",")}
        className="hidden"
        aria-label={t("labelUpload")}
        disabled={disabled || isPending}
        onChange={(event) => {
          queueFileUploadsByFileList(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
      />
      <FieldDescription>{t("descriptionUpload")}</FieldDescription>
    </Field>
  );
}

export function ThemeLogoEditor({
  language,
  logo,
  isDefault = false,
  disabled = false,
  onChange,
  onRemove,
  onUploadStateChange,
}: {
  language: string;
  logo?: ThemeLogo;
  isDefault?: boolean;
  disabled?: boolean;
  onChange: (logo: ThemeLogo) => void;
  onRemove: () => void;
  onUploadStateChange?: (isUploading: boolean) => void;
}) {
  const id = useId();
  const { t, i18n } = useT("settings", {
    keyPrefix: "_components.ThemeLogoEditor",
  });
  const [uploadPath, setUploadPath] = useState(() => crypto.randomUUID());
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>();
  const [failedUrl, setFailedUrl] = useState<string>();
  const trimmedUrl = logo?.url.trim() ?? "";
  const languageLabel = getThemeLanguageName(language, i18n.language);
  const finishUpload = () => {
    setIsUploading(false);
    onUploadStateChange?.(false);
    setUploadPath(crypto.randomUUID());
  };

  return (
    <FileUploadProvider
      basePath="/"
      bucketName="theme_logos"
      bucketPath={uploadPath}
      restrictUpload={(files) => {
        if (disabled || isUploading) return false;
        const valid =
          files.length === 1 &&
          files.every(
            (file) =>
              logoTypes.includes(file.type) &&
              file.size > 0 &&
              file.size <= logoMaxBytes,
          );
        setError(valid ? undefined : t("errorFile"));
        return valid;
      }}
      beforeUpload={() => {
        setIsUploading(true);
        onUploadStateChange?.(true);
      }}
      onFileUploadError={() => {
        setError(t("errorUpload"));
        finishUpload();
      }}
      onFileUploadSuccess={(upload) => {
        setFailedUrl(undefined);
        const path = `${uploadPath}/${upload.path.replace(/^\/+/, "")}`
          .split("/")
          .map(encodeURIComponent)
          .join("/");
        onChange({ ...logo, url: `/api/storage/theme_logos/${path}` });
        finishUpload();
      }}
      afterUpload={(_uploads, { clearErrors, clearFinished }) => {
        clearErrors();
        clearFinished();
      }}
    >
      <FileUploadDropZone disabled={disabled || isUploading}>
        <Card>
          <CardHeader>
            <CardTitle>{languageLabel}</CardTitle>
            {isDefault && (
              <CardDescription>{t("descriptionDefault")}</CardDescription>
            )}
            <CardAction>
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                aria-label={t("labelRemove", { language: languageLabel })}
                disabled={disabled || isUploading}
                onClick={onRemove}
              >
                <X />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel>{t("labelPreview")}</FieldLabel>
                {trimmedUrl && isThemeLogoUrl(trimmedUrl) ? (
                  failedUrl === trimmedUrl ? (
                    <FieldError>{t("errorImage")}</FieldError>
                  ) : (
                    <img
                      key={trimmedUrl}
                      src={trimmedUrl}
                      alt={logo?.alt ?? ""}
                      className="h-16 max-w-full object-contain object-left"
                      onError={() => setFailedUrl(trimmedUrl)}
                    />
                  )
                ) : (
                  <FieldDescription>
                    {t("descriptionChooseFile")}
                  </FieldDescription>
                )}
              </Field>
              <LogoUploadButton disabled={disabled} isPending={isUploading} />
              {error && <FieldError role="alert">{error}</FieldError>}
              <Field>
                <FieldLabel htmlFor={`${id}-alt`}>{t("labelAlt")}</FieldLabel>
                <Input
                  id={`${id}-alt`}
                  value={logo?.alt ?? ""}
                  maxLength={300}
                  disabled={disabled || isUploading}
                  onChange={(event) =>
                    onChange({ url: logo?.url ?? "", alt: event.target.value })
                  }
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      </FileUploadDropZone>
    </FileUploadProvider>
  );
}
