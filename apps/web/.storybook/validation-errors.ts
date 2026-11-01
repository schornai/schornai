const error = { _errors: ["Storybook: Bitte Eingabe prüfen."] };
export const fieldValidationErrors = Object.fromEntries(
  [
    "email",
    "password",
    "name",
    "identifier",
    "workspaceId",
    "modelIdentifier",
    "prompt",
    "roles",
  ].map((field) => [field, error]),
);
export const actionValidationErrors = {
  _errors: error._errors,
  ...fieldValidationErrors,
  agent: fieldValidationErrors,
  transcriber: fieldValidationErrors,
  documentRepository: fieldValidationErrors,
};
