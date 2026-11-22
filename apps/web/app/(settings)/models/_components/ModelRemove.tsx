"use client";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";
import { deleteModel } from "../_actions/deleteModel";
import { ResourceRemovalDialog } from "../../../_components/ResourceRemovalDialog";

export function ModelRemove({
  model,
  disabled,
}: {
  model: { id: string; name: string; type: string };
  disabled?: boolean;
}) {
  const { t } = useT("settings", { keyPrefix: "models" });
  const router = useRouter();
  const remove = useAction(deleteModel, {
    onSuccess: () => {
      router.push("/models");
      router.refresh();
    },
  });
  return (
    <ResourceRemovalDialog
      label={t("labelDelete")}
      title={t("labelDeleteConfirm", { name: model.name })}
      description={t(
        model.type === "external_llm_v1"
          ? "descriptionDeleteExternal"
          : "descriptionDeleteLocal",
      )}
      cancel={t("labelCancel")}
      errorMessage={t("errorDelete")}
      onOpen={remove.reset}
      disabled={disabled}
      hasErrored={remove.hasErrored}
      isPending={remove.isPending}
      onConfirm={() => remove.execute({ id: model.id })}
    />
  );
}
