# Agents Guide

This document provides instructions for AI agents assisting with this project.

## Readability and Traceability

- For changes spanning applications or packages, read the [repository map](docs/architecture.md) to locate behavior owners, entry points, and tests. Update its affected links and any `meta.source_files` references when moving documented code.
- When designing or restructuring code, read [codebase-design](.agents/skills/codebase-design/SKILL.md). Keep the facts a caller must know small and explicit, and keep related behavior together so a reader can follow a change locally.
- When resolving domain terminology or recording an architectural decision, read [domain-modeling](.agents/skills/domain-modeling/SKILL.md) and the [project glossary](GLOSSARY.md). Record decisions in `docs/adr/` when they are hard to reverse, surprising without context, and based on a real trade-off. Link to the relevant issue, source, or prior decision when it explains the reasoning; distinguish verified behavior from proposals.
- When editing agent instructions or documents they reference, read [writing-for-agents](.agents/skills/writing-for-agents/SKILL.md). Keep each rule in one authoritative place and make references state when to read their target.

## Follow Existing Application Patterns

- Before implementing a feature, inspect the nearest comparable feature and its actions, components, hooks, and Storybook fixtures. Reuse the established pattern instead of introducing a parallel transport, authorization helper, state-management approach, or mock system.
- Share business logic used by multiple entry points. For example, normal chat submission and OAuth resumption use `packages/realtime/src/documents/chat/queueChat.ts` for busy checks and queue submission; keep their entry-point-specific authorization and approval validation in their callers.
- Reuse domain types instead of independently declaring the same payload in the database package, UI, and realtime worker. Use package import paths supported by the consuming application's dependencies.
- Avoid provider-specific exceptions when the same invariant applies to every provider. Keep genuinely required provider behavior explicit and covered by tests.

## Web Server Actions and Data Loading

- Use Server Actions for application-internal mutations. Put one named action per file in the feature's `_actions/` directory, with `"use server"`, `serverActionClient`, and a Zod `inputSchema`. Follow existing examples such as `apps/web/app/(settings)/models/_actions/addExternalModel.ts` and `deleteModel.ts`.
- Do not add an internal REST endpoint plus a client-side fetch wrapper solely to save or delete data from the app's UI. Route handlers remain appropriate for HTTP protocol boundaries such as OAuth redirects/callbacks, webhooks, downloads, and externally consumed APIs.
- Prefer loading initial data in Server Components or server-only models and passing non-secret data to client components. Use `apps/web/app/_models/` for reusable page-level loaders; reusable database operations still belong in `packages/database`.
- For global-admin operations, reuse `saveCreateSupabaseServiceRoleClient` rather than duplicating claims checks. Other privileged flows must authenticate and authorize their specific user/resource before creating a service-role client. A page-level guard does not replace authorization inside an action or route handler.
- Invalidate affected routes with `revalidatePath` after a successful mutation. Return only what the caller needs, such as an identifier; do not return credentials or reload the entire collection as a mutation response when server rendering supplies it.
- Keep server errors behind the existing sanitized `serverActionClient` error handler. Validate inputs with schemas rather than hand-written request-body type checks or UUID regular expressions.

## Client Actions and UI State

- Consume Server Actions through `useAction` from `next-safe-action/hooks`. Use its pending, error, success, reset, and callback facilities instead of maintaining a parallel request lifecycle with manual `try/finally` state. Use `useDecayActionState` where the existing UI pattern calls for transient feedback.
- Use `ButtonAction` for asynchronous action buttons, including save and disconnect, and wire up pending/error feedback. Preserve form values on failure and navigate or close dialogs only after success. Disable duplicate submissions while pending.
- Avoid copying server-provided collections into local state merely to update them after a mutation. Let route revalidation supply the new data. Local editable drafts and intentional optimistic updates are separate, justified cases.
- Match comparable app tables and controls: reuse the existing grouping/sorting/preferences hooks, icon actions, and confirmation dialogs. Destructive remove actions use the `X` icon and `variant="destructive"`; MCP controls use `Plug`. Copy controls follow the existing `ButtonAction` plus tooltip and clipboard-feedback pattern.

## Platform MCP and Agent Tools

- When adding, changing, or removing an application capability, maintain its corresponding platform MCP tools in the same change. External MCP clients and schornai agents must use the same authorized business operations as the UI.
- Expose platform MCP at `/mcp` only. Keep the access levels cumulative: user, editor, workspace administrator, and global administrator. OAuth consent offers only levels within the caller’s current permissions, and the issued token records the selected ceiling. Consent and agent configuration limit tool availability; they never grant permissions. Authorize the caller and the specific resource on every invocation.
- At the end of each affected German user documentation page, document the corresponding tool names, purpose, minimum access level, required permissions, and limitations. Keep these references synchronized with tool changes. Explicitly document capabilities that cannot be exposed as tools and why.

## Database Package

- `packages/database` (`@schornio/aibox-package-database`) is the shared Supabase data-access package. Put reusable Supabase queries, mutations, Storage/Auth operations, and RPC wrappers here instead of embedding them in web actions or realtime workers.
- Organize operations by domain under `src/`, for example `aiModel`, `agent`, `chat`, `user`, and `workspace`. Use one named operation per file. Domain `_schema.ts`, `_types.ts`, and `_mappers.ts` define validation, application types, and database-to-application mapping where needed.
- `src/_shared` contains shared schemas, types, and the generated `_supabase.ts` database types. `src/_util` contains cross-domain helpers, including `createSupabaseClient.ts`. Import operations through the package's domain paths, for example `@schornio/aibox-package-database/aiModel/createExternalAIModel`.
- Pass a typed Supabase client into operations through an options object. Keep environment-specific client setup, cookies, authorization entry points, Next.js cache invalidation, and UI behavior in the application layer. Never create a service-role client in browser code. Privileged operations must document their required caller authorization; passing a service-role client does not itself authorize a user.
- Prefer the Supabase JS API for ordinary reads and writes. Use a small database function, wrapped by a package function, when an operation needs a transaction across multiple writes. Two separate JS API inserts are not atomic; compensating deletes are not a transaction and can also fail. Explain the invariant requiring an RPC rather than moving unrelated business logic into SQL.
- Keep credentials out of public model metadata, client props, logs, and forwarded database errors. Credential reads belong in explicitly documented server-only package operations.
- Database migrations, seed data, and SQL regression checks belong in the root `supabase/` directory. Regenerate `supabase/types.ts` and `packages/database/src/_shared/_supabase.ts` together with `npm run supabase:types` after schema changes; do not hand-edit generated types.

## Formatting

- After making changes, run the locally installed Prettier on every file you created or modified that Prettier supports, before finishing the task.
- From the repository root, use `node_modules/.bin/prettier --write --ignore-unknown <file...>` with explicit file paths. Quote paths containing spaces or shell special characters.
- Respect existing Prettier configurations and ignore rules. Format only files changed for the current task.

## Documentation Before Commits

- Before every commit, review the intended commit diff for documentation impact. Check whether new, changed, or removed user-facing features, workflows, routes, settings, permissions, or limitations need to be reflected in the German user documentation under `docs/de`.
- For documentation-relevant changes, update or add the affected pages in the same commit. Describe the behavior actually implemented, including required roles, prerequisites, and known limitations. Do not commit such changes while their documentation is missing or outdated.
- Use the pages' `meta.source_files` and `meta.app_urls` to find affected documentation, and check for new functionality that has no page yet. Update relevant metadata, navigation, route coverage, and screenshots when affected; change `meta.last_verified` only for pages actually reviewed.
- Changes without user-facing documentation impact, such as internal refactoring, tests, or tooling changes, do not require user documentation updates. Briefly record why no update is needed in the change summary or PR description.
- Complete this check and any documentation updates before the final formatting and test run required for the commit.

## Tests Before Commits

- Before every commit, run the complete test suite with `npm test` from the repository root, including both JavaScript and Python tests. Do not use test filters or substitute scoped tests for the full suite.
- Run the tests after the final changes and formatting so that they validate the state being committed.
- Commit only when the complete test suite passes. If tests fail or cannot run, report the issue and do not commit.

## CI and Storybook Validation

- Mock new server entry points through `apps/web/.storybook/server-boundaries.json` and the corresponding `server-mocks/` files. Reuse the existing action-hook mocks; do not add a bespoke Vite alias or fetch mock for each feature. Keep pure sample data in fixture modules rather than coupling it to transport mocks.
- Inspect the applicable workflows in `.github/workflows/` before declaring a change ready. `npm test` runs JavaScript and Python tests; it does **not** run Storybook type checks, story coverage, or visual regression tests. The web application's TypeScript check also excludes Storybook.
- For UI changes or changes to context/provider contracts, run `npm run storybook:typecheck` and `npm run storybook:check`. Update Storybook context fixtures when hook return values change and add stories for new custom components.
- Run affected visual stories using `STORYBOOK_FILTER='<story-id regex>' npm run storybook:visual`. Include transitive consumers of changed shared components, not only direct imports (for example, `StorageViewEmpty` → `StorageViewTable` → `StorageView`). Check the matched story IDs with `--list` before running a filter; a passing filtered run only validates that selection. Use the default Linux ARM64 Docker runner so screenshot baselines match CI; do not create macOS baselines for Linux CI.
- For intended appearance changes, inspect the actual screenshots before updating only the affected baselines, then rerun without snapshot updates. Do not accept runtime errors or failed story interactions as expected visual changes.
- Report each validation layer separately, including any layer that could not run. A passing `npm test` alone does not mean the CI workflow will pass.

## shadcn Components

- Keep original shadcn components unchanged.
- Implement custom behavior and extensions in separate components that wrap or compose the original components.
- Use these extension components at the relevant call sites instead of modifying the underlying shadcn components.

## Development Seed

- Keep `supabase/seed.sql` and `npm run seed:reset` up to date when adding or changing features that need example data. Include valid related records, permissions, and configuration so the feature can be tried in the local app.
- Update seed validation tests and the README's example-data documentation together with the seed.
- Preserve the local-only target restriction, configuration preview, and explicit interactive confirmation before deleting data. Never run a destructive reset on the user's database without their confirmation.

## i18n (Internationalization)

The project uses `next-i18next` for translations.

### Translation Maintenance Before Every Commit

- German (`de`) and English (`en`) are the primary translations. Before every commit, review every added, changed, or removed user-facing text and maintain both languages in the same commit. Keep their translation keys, interpolation placeholders, and meaning in sync; this applies to changed and removed keys as well as new keys.
- Run `npm run i18n:check` to compare translation JSON files and entries. It fails for German/English differences and reports only warnings for every other language. This check also runs as part of `npm test`.
- All other languages are secondary translations. Create, translate, refresh, or remove their entries only when the user explicitly requests work on those languages. Ordinary feature changes and commits must not automatically rewrite or bulk-synchronize secondary translation files.
- Missing secondary translations fall back to German at runtime. Keep that fallback working on both server and client. Validation must enforce German/English parity and validate existing secondary entries without requiring secondary languages to acquire every new key.
- When secondary translations are explicitly requested, preserve interpolation placeholders, markup, technical identifiers, and locale-specific plural forms. Use the shared language list in `apps/web/lib/languages.ts` for configuration and language controls.

### Translation Files

Translations are stored in JSON files located at:
`apps/web/app/i18n/locales/{lang}/{namespace}.json`

Examples:

- German: `apps/web/app/i18n/locales/de/agent.json`
- English: `apps/web/app/i18n/locales/en/agent.json`

### Usage in Components

To use translations in a client component:

1. Import `useT` from `next-i18next/client`.
2. Initialize the translation hook with the namespace and optional `keyPrefix`.

```tsx
import { useT } from "next-i18next/client";

export function MyComponent() {
  const { t } = useT("agent", {
    keyPrefix: "_components.MyComponent",
  });

  return <div>{t("labelTitle")}</div>;
}
```

To use translations in a server component:

1. Import `getT` from `next-i18next/server`.
2. Initialize the translation hook with the namespace and optional `keyPrefix`.

```tsx
import { getT } from "next-i18next/server";

export async function MyComponentToo() {
  const { t } = await getT("agent", {
    keyPrefix: "_components.MyComponentToo",
  });

  return <div>{t("labelTitle")}</div>;
}
```

### Translation Convention

- Naming convention for keys within components: `labelX`, `descriptionX`, `errorX`.
- Always update the corresponding namespace JSON in both `en/` and `de/` when adding, changing, or removing keys. Other languages are updated only on explicit user request, as described above.
- Localize user-facing route-handler responses too, using `getT`. Do not hard-code bilingual German/English error strings. Internal error codes and model-facing tool protocol messages are distinct from user-facing UI translations.
