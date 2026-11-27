# Repository map

Use this map to find the owner of a behavior and follow it to its tests. Names
follow [GLOSSARY.md](../GLOSSARY.md); setup and operating commands remain in the
[development guide](development.md) and [operator documentation](de/box-admin/index.md).
This describes the current implementation, not a proposed architecture.

## Where responsibilities live

| Area                                                                          | Responsibility and starting point                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Web app](../apps/web/app)                                                    | Pages, feature-local `_actions/` and `_components/`, and HTTP protocol entry points in `api/`. Shared page loaders live in [`app/_models`](../apps/web/app/_models); application orchestration in [`lib`](../apps/web/lib).               |
| [Realtime app](../apps/realtime/README.md)                                    | [`server.ts`](../apps/realtime/server.ts) wires authentication, document persistence, and worker startup. Feature workers live in `src/`.                                                                                                 |
| [Realtime package](../packages/realtime/src)                                  | Shared document types and mutations under `documents/`, task claiming and completion, and browser/server providers. The running server belongs to the realtime app.                                                                       |
| [Database package](../packages/database/src)                                  | Domain schemas, row mappers, database operations, and storage access. Application callers supply clients and authorize privileged operations.                                                                                             |
| [Machine service](../packages/service/README.md)                              | Configuration, process supervision, installation, and artifact synchronization. The [CLI](../apps/cli/README.md) and [Mac admin app](../apps/admin-mac/README.md) control it.                                                             |
| [Transcriber worker](../apps/transcriber-mac/src/service/transcribeWorker.ts) | Claims transcription work and invokes the [Python transcription implementation](../apps/transcriber-mac/src/core/transcribe.py). A saved transcriber configuration is a separate [database domain](../packages/database/src/transcriber). |
| [Document extractor](../apps/document-extractor)                              | Containerized document-extraction dependency used by the file-processing worker.                                                                                                                                                          |
| [Proxy](../apps/proxy)                                                        | HTTP routing and TLS entry point for the web app, realtime server, and supporting endpoints.                                                                                                                                              |
| [UI package](../packages/ui/src)                                              | Shared UI primitives and compositions; feature behavior stays with its consuming application.                                                                                                                                             |
| [XRAG](../packages/xrag)                                                      | Package handling and setup-bundle construction; [bundleUpdate.mts](../packages/xrag/update/bundleUpdate.mts) assembles the distributable runtime.                                                                                         |
| [Supabase project](../supabase)                                               | Versioned migrations, local configuration, seed data, and SQL regression checks. Generated database types are maintained together by [`supabase-types.mjs`](../scripts/supabase-types.mjs).                                               |

The [German user documentation](de/index.md) follows UI routes. Its
[`meta.source_files`](de/README.md#metadaten) records link behavior back to code;
update those paths when moving their source files. Dated security reviews and
release notes under `docs/` describe the state reviewed on their dates.

## Follow a chat from submission to response

1. [`submitCurrentMessage`](../apps/web/app/%28main%29/agent/%5BagentId%5D/%5BactivityId%5D/_actions/submitCurrentMessage.ts)
   checks the current user's workspace permission and synchronizes the chat and
   queue providers. [`pendingMCPApproval`](../apps/web/lib/mcp/pendingApproval.ts)
   is the OAuth resumption entry point and additionally validates the exact
   pending approval and document access.
2. Both authorize the user before calling [`queueChat`](../packages/realtime/src/documents/chat/queueChat.ts).
   The coordinator runs [`admitChatTask`](../packages/realtime/src/documents/chat/admitChatTask.ts)
   on its live documents to check for duplicate recordings and busy chats, reserve
   the generation, and publish its task before processing the next request.
3. [`TaskQueue`](../packages/realtime/src/documents/taskQueue/TaskQueue.ts)
   requests ownership by type and capabilities from the server's
   [coordinator](../packages/realtime/src/server/createTaskCoordinatorExtension.ts).
   [Database claims](../packages/database/src/task) grant one owner and require a
   live lease for renewal/completion. Expired work fails without replay;
   [recovery](../packages/realtime/src/server/recoverTaskDocuments.ts) releases its
   matching chat and pauses remaining inputs. Read the
   [decision](adr/0003-durable-task-ownership.md) when changing retry semantics. The [`Task` union](../packages/realtime/src/documents/taskQueue/_types.ts)
   defines its states and payloads.
   [Retention](../packages/realtime/src/documents/taskQueue/pruneTaskHistory.ts)
   removes terminal history after the result grace period; database cleanup
   discards old snapshots while retaining task IDs against replay.
4. The [`chat worker`](../apps/realtime/src/chat/worker.ts) consumes submitted
   [chat inputs](../packages/realtime/src/documents/chatCurrentMessage/_types.ts),
   selects an agent role, runs its tools and model, and writes messages and
   activity state. [`AgentToolSession`](../apps/realtime/src/chat/AgentToolSession.ts)
   owns the tools available to that role.
   [`finalizeInterruptedToolInputs`](../packages/realtime/src/documents/chat/finalizeInterruptedToolInputs.ts)
   closes truncated tool inputs without execution and removes reasoning from
   their interrupted step before history is replayed. Completed steps and
   genuine approval requests remain unchanged.
5. [`abortChatGeneration`](../packages/realtime/src/documents/chat/abortChatGeneration.ts)
   and the queue/worker cooperate on cancellation. Follow the whole path when
   changing busy checks or cleanup; an idle-looking chat alone does not prove
   that the previous task has finished.

Behavior checks: [submission and cancellation](../tests/web/chat-submission.test.tsx),
[worker processing](../tests/chat-worker.test.ts),
[queue lifecycle](../tests/task-queue.test.ts),
[ownership and restart](../tests/task-coordinator-transport.test.ts),
[chat recovery](../tests/task-document-recovery.test.ts),
[database claim invariants](../supabase/tests/task_claims.sql),
[result retention](../tests/task-retention.test.ts), and
[OAuth routes and resumption](../tests/mcp-oauth-routes.test.ts).

## Model context budgets

[`getChatModel`](../packages/realtime/src/models/getChatModel.ts) wraps local and external
models with [`withContextCompression`](../packages/realtime/src/models/withContextCompression.ts).
The wrapper budgets each provider call, including routing and tool continuations. Unknown
context sizes disable it. Summaries replace only the outgoing prompt, never Yjs messages;
open tool exchanges and the latest user input remain intact. Summary requests use the
unwrapped model and chunks measured against the actual request budget, preventing recursive
compression. The summary length target is separate from the generation output reserve
(including reasoning); empty or output-truncated summaries fail. Recognized context error
codes survive SDK stream conversion while provider errors stay sanitized. The cache lives only
for the model object's lifetime. The chat worker writes compression lifecycle events as
`data-contextCompression` parts into its existing SDK UI-message stream; normal Yjs
message persistence and `platform_chat_read` retain these markers. The
[`ChatMessagePartContextCompression`](../apps/web/app/%28main%29/agent/%5BagentId%5D/%5BactivityId%5D/_components/ChatMessagePartContextCompression.tsx)
renderer keeps them visible outside collapsed tool groups. Worker recovery finalizes
unfinished status parts as interrupted. See [budget regressions](../tests/context-compression.test.ts)
and [status/persistence regressions](../tests/context-compression-status.test.ts).

## Chat support and calculator

[`AgentToolSession`](../apps/realtime/src/chat/AgentToolSession.ts) exposes the selected
role's enabled [support tools](../apps/realtime/src/chat/tools/support/tools.ts).
The bounded [calculator](../packages/realtime/src/tools/calculate.ts) and
[clock](../packages/realtime/src/tools/currentDateTime.ts) are shared with platform MCP.
[`setActivityLabel`](../packages/realtime/src/documents/activity/setActivityLabel.ts)
keeps automatic titles from replacing manual ones. Reply suggestions remain tool
results in chat history; [`getResponseSuggestions`](../packages/realtime/src/documents/chat/getResponseSuggestions.ts)
selects the latest assistant turn for the existing composer. Clicking a suggestion
adds to the draft; normal submission retains its authorization and queue checks.
See [behavior tests](../tests/chat-support-calculator.test.ts) and
[tool-session tests](../tests/agent-tools.test.ts).

## Agent credentials

Agent creation and updates authorize the saved source and requested target
workspaces before using the service client. The `save_agent_with_mcp_credentials`
transaction stores header values in a protected table and leaves only names and
null placeholders in `chatbots.config`. It retains unchanged values, validates
copy scope and endpoint identity, and deletes credentials for removed connections.
The [`MCP session`](../apps/realtime/src/chat/MCPToolSession.ts) loads headers via
[`getAgentMCPHeaders`](../packages/database/src/agent/getAgentMCPHeaders.ts) only
for the authorized saved agent role and endpoint. See
[authorization and DTO tests](../tests/web/agent-credentials.test.ts) and
[SQL transaction/access tests](../supabase/tests/agent_mcp_credentials.sql).

## Follow file processing

[`StorageSession`](../packages/database/src/storage/_utils/StorageSession.ts)
owns shared file operations; [`StorageRealtimeSession`](../packages/realtime/src/documents/storage/StorageRealtimeSession.ts)
adds synchronized file-operation logs.
[`createStorageProcessingTask`](../packages/realtime/src/documents/storage/createStorageProcessingTask.ts)
is the shared routing decision for uploads and downloaded files: it chooses file
processing or transcription, or returns no task when neither applies.

The [`file-processing worker`](../apps/realtime/src/processFile/worker.ts) and
[`transcription worker`](../apps/transcriber-mac/src/service/transcribeWorker.ts)
perform the work. Storage types and access rules live in the database package,
including [`requireStorageAccess`](../packages/database/src/storage/requireStorageAccess.ts)
and [`withStorageFileLock`](../packages/database/src/storage/withStorageFileLock.ts).
The [`storage-processing` tests](../tests/storage-processing.test.ts) cover this
routing and processing behavior.

Text edits from the editor and agent tool share
[`writeStorageFileText`](../packages/realtime/src/documents/storage/writeStorageFileText.ts)
for authorization, a file lease, saved-content indexing and partial-result reporting.
Transcript segment corrections use the web app's
[`withStorageFileOperation`](../apps/web/lib/storageFileOperations.ts) with the same
lease. [`updateFileText`](../packages/database/src/storage/updateFileText.ts) and
[`updateTranscriptionSegment`](../packages/database/src/storage/updateTranscriptionSegment.ts)
read, check conflicts, and write inside that lock, shared with processing workers.
See [transcript correction tests](../tests/web/transcription-save.test.ts).
Text edits retain a durable backup until both the original and Markdown history
are saved. [`getFileTextBackup`](../packages/database/src/storage/getFileTextBackup.ts)
keeps application reads on the previous version while
[`recoverFileText`](../packages/database/src/storage/recoverFileText.ts) restores
an interrupted write before the next edit or processing task. See
[the recovery decision](adr/0002-recoverable-text-file-writes.md) and
[failure/retry tests](../tests/storage-edit-text.test.ts).
See [shared write tests](../tests/storage-write-service.test.ts) for permission,
queue, creation and worker-identity checks.

Both file and folder deletion actions use
[`remove`](../packages/database/src/storage/remove.ts). It acquires each file's
worker lease, checks active work through the caller, and removes that file's index
before its original and sidecars. Recursive deletion stops at the first error;
retrying cleans up the remaining files. See
[removal tests](../tests/storage-remove.test.ts).

[`createIndex`](../packages/database/src/storage/createIndex.ts) prepares all model
results before publishing a file's source, chunks, keywords and vectors through
the `replace_file_index` transaction. The previous index survives preparation or
publication failures. See [index tests](../tests/search-index.test.ts) and
[SQL rollback and permission checks](../supabase/tests/replace_file_index.sql).

## Follow machine startup

```text
CLI / Mac launcher / development entry
                  ↓
           config → daemon
                      ├─ serviceCommands → Services → process execution
                      └─ artifact synchronization → installer
```

[`loadConfig`](../packages/service/src/config.ts) resolves configuration and
environment values. [`runDaemon`](../packages/service/src/daemon.ts) owns the
instance lock, control socket, shutdown, and update coordination.
[`serviceCommands`](../packages/service/src/serviceCommands.ts) translates the
selected roles into native, Compose, or local Supabase CLI commands without
starting them. [`Services`](../packages/service/src/services.ts) supervises those
commands, tracks ownership of local dependencies, and stops owned processes.
[`process.ts`](../packages/service/src/process.ts) handles child-process groups
and their output. Command environments contain credentials and must remain private.

Installed PostgreSQL starts through
[`prepare-data.sh`](../packages/xrag/update/container/volumes/db/prepare-data.sh),
which imports the stopped legacy cluster into a Docker volume before delegating
to the pinned image's entrypoint. See the [storage decision](adr/0001-postgres-data-volume.md)
for ownership, retry and rollback constraints, and the
[migration tests](../tests/postgres-data.test.ts) for failure handling.

Development and installed machines use the same supervisor. Their launch plans
differ: see [development behavior tests](../tests/service-development.test.ts),
[environment resolution tests](../tests/service-environment.test.ts), and
[Docker lifecycle tests](../tests/service-docker.test.ts). See the
[service README](../packages/service/README.md) for artifact synchronization and
deployment details.

## Follow scheduled work

The realtime server starts the [scheduler](../apps/realtime/src/scheduler/startScheduler.ts)
and handles jobs including `artifacts.cleanup`, `xrag.transfer.cleanup` and `chat.expire`. The [worker](../apps/realtime/src/scheduler/worker.ts)
claims durable jobs through [database operations](../packages/database/src/scheduler);
Postgres owns due times, lease tokens, retries and interval rescheduling.
Read the [delivery decision](adr/0005-scheduled-job-delivery.md) when adding a
handler with external side effects, and the [runtime guide](../apps/realtime/README.md#durable-scheduler)
for registration, cancellation and failure recovery. Tests cover
[worker behavior](../tests/scheduler.test.ts) and
[SQL ownership and privileges](../supabase/tests/scheduled_jobs.sql).

Chat expiry uses [atomic deadline updates](../packages/database/src/chat/setChatExpiration.ts),
[cleanup](../apps/realtime/src/scheduler/expireChat.ts), and a
[realtime guard](../packages/realtime/src/server/createChatExpirationExtension.ts).
The web action and platform tools share the same membership-checked database
operation. Read the [tombstone decision](adr/0006-disappearing-chat-tombstones.md)
when changing deletion, replay protection or task snapshot retention. Tests cover [cleanup and fencing](../tests/chat-expiration.test.ts)
and [SQL deadlines and tombstones](../supabase/tests/chat_expiration.sql).

## Automations

The list shares filter and display preferences through [AutomationListProvider](../apps/web/app/%28main%29/app/automation/_components/AutomationListProvider.tsx). Header options, cards and table consume that state. Creation and editing use dedicated routes with the shared `TabsMain` editor pattern; [AutomationInfo](../apps/web/app/%28main%29/app/automation/_components/AutomationInfo.tsx) also renders the live draft preview. [AutomationScheduleFields](../apps/web/app/%28main%29/app/automation/_components/AutomationScheduleFields.tsx) maps the daily calendar UI to weekly rules with all days selected; hourly rules start at the next full UTC hour and retain their interval from the previous due time, avoiding dispatcher drift; legacy day intervals retain elapsed-time semantics. Card appearance uses the shared app color/icon schemas. Favorites share the global favorites configuration, dashboard, sidebar and RLS-scoped [favorite loader](../packages/database/src/automation/getAutomationsByIds.ts). Saving a copy uses the same create operation without an ID and starts paused. Storage selection uses one [StoragePickerDialog](../apps/web/app/_components/StoragePickerDialog.tsx) for repository and folder together.

The [automation app](../apps/web/app/%28main%29/app/automation/page.tsx) and
[platform tools](../packages/realtime/src/platform/automationTools.ts) share the
owner-scoped [database operations](../packages/database/src/automation).
The scheduler dispatches time occurrences and runs storage events captured by
[the migration](../supabase/migrations/20261114154753_personal_automations.sql).
[runAutomation](../apps/realtime/src/scheduler/runAutomation.ts) resolves current
roles and invokes [sendChatMessage](../packages/realtime/src/platform/sendChatMessage.ts),
also used by platform chat submission. Read the [submission decision](adr/0007-automation-chat-submission.md)
when changing retries or durability. Behavior checks cover
[calendar rules](../tests/automation.test.ts) and
[ownership/outbox/fencing](../supabase/tests/automations.sql).

The [scheduler hardening migration](../supabase/migrations/20261115091351_automation_scheduler_hardening.sql)
ignores storage bookkeeping updates and lets recurring maintenance recover after
retry exhaustion. Automation submissions use a separate sequential worker from
maintenance and deletion. Their cancellation signal reaches attachment transfers
and the queue publication; see [submission cancellation tests](../tests/automation-chat-submission.test.ts).
[getAutomationOwner](../packages/database/src/automation/getAutomationOwner.ts)
applies the execution ceiling before constructing a user client, including file
readiness checks. Manual and captured events share
[folder validation](../packages/database/src/automation/validateAutomationFilePath.ts).
The platform registry always requires human approval when a native agent saves
or runs an automation, because the target agent has its own tool policy; see
[approval tests](../tests/platform-agent-policy.test.ts).

Run history uses [AutomationRunsLive](../apps/web/app/%28main%29/app/automation/_components/AutomationRunsLive.tsx)
to observe a read-only Yjs document on the existing Hocuspocus connection.
The automation worker updates that document when an execution changes state.
The browser reloads its authorized server snapshot on changes and reconnects,
preserving search and grouping. No additional realtime service is required.

## Follow XRAG publication

[`collection.ts`](../packages/xrag/src/collection.ts) owns the version-2 collection
container: a flat tar containing `xrag.json` and unchanged individual `.xrag.tar`
files named by their SHA-256 digest. It flattens existing collections and validates
all children, checksums and aggregate extraction limits before returning import
candidates. Collections are not machine artifacts and cannot be published through
the artifact worker. See [collection tests](../tests/xrag-collection.test.ts).

Workspace object archive construction lives in
[`resourceArchive.ts`](../packages/xrag/src/resourceArchive.ts).
The [database resource adapter](../packages/database/src/xrag/resource.ts) reuses
the agent, transcriber, document repository and automation schemas, removes credentials from
exports and validates the complete reference map. The
[export operation](../packages/database/src/xrag/exportResource.ts) authorizes the
saved workspace before reading files. The
[import preparation](../packages/database/src/xrag/prepareResourceImport.ts) and
[confirmation preparation](../packages/database/src/xrag/prepareConfirmedResourceImport.ts) separate
preview from confirmed writes. Read the
[identity decision](adr/0008-xrag-resource-identities.md) when changing delayed
references, repeated imports or target workspace identity.

The [XRAG app](<../apps/web/app/(main)/app/xrag>) and
[platform tools](../packages/realtime/src/platform/xragTools.ts) share
[transfer validation](../packages/database/src/xrag/withTransferArchives.ts),
[the import coordinator](../packages/database/src/xrag/importXRAGTransfer.ts), and
[export packaging](../packages/database/src/xrag/exportXRAG.ts).
[Import recovery](../packages/database/src/xrag/recoverXRAGImport.ts) restores staged
file changes from durable undo records; the scheduler runs recovery independently
of web requests. [Imported-file processing](../packages/realtime/src/platform/processXRAGImportFiles.ts)
is delivered through a SQL outbox to the ordinary storage task queue. Read
[ADR 0010](adr/0010-recoverable-xrag-imports.md) before changing file reservations,
Storage attempt credentials, atomic metadata publication or recovery. The transfer bucket stores immutable caller-owned
uploads and downloads. The web app [queues upload inspection](../packages/database/src/xrag/queueXRAGPreparation.ts) on the scheduler. Publication retains the selected Storage original through the [artifact reference](../packages/database/src/xrag/artifactObject.ts). The scheduler’s `xrag.transfer.cleanup` handler expires prepared imports after one hour and background export downloads after 72 hours.

[`publishArtifact`](../packages/database/src/xrag/publishArtifact.ts) queues a
publication after the global-admin entry point authorizes the caller. The
[artifact worker](../apps/realtime/src/artifacts/worker.ts) streams and validates
the original immutable upload through
[`processArtifactPublication`](../packages/database/src/xrag/processArtifactPublication.ts).
The SQL transaction publishes catalog metadata and completes the leased job;
[`announceArtifactPublications`](../packages/database/src/xrag/announceArtifactPublications.ts)
delivers its durable outbox to Yjs. Read
[the publication decision](adr/0004-durable-artifact-publication.md) when changing
object ownership, retries, or withdrawal semantics.

[`artifactDownload`](../packages/service/src/artifactDownload.ts) owns resumable
machine downloads, checksum verification, cache budgets and orphan cleanup.
[`activateArtifactDirectory`](../packages/service/src/activateArtifactDirectory.ts)
consumes prepared model/file directories by rename and recovers interrupted swaps
before consumers start. See [publication SQL tests](../supabase/tests/artifact_publications.sql),
[worker tests](../tests/artifact-publication-worker.test.ts),
[download tests](../tests/artifact-download.test.ts),
[process-crash test](../tests/artifact-crash.test.ts), and
[activation recovery tests](../tests/artifact-activation.test.ts).

Setup stays a single archive. The service persists its selected publication before
installation so a truncated or changed catalog cannot cause a downgrade. See
[service artifact tests](../tests/service-artifacts.test.ts) for selection and
[installer tests](../tests/service-installer.test.ts) for consuming extracted runtimes.

## Names that change across layers

These mappings explain existing compatibility names; they are not independent
domain concepts or instructions to rename stored data.

| Domain term            | Existing representation                                                   | Source of the mapping                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent                  | `chatbots`, `ChatbotDatabaseRow`; activity payloads still use `chatbotId` | [Agent mapper](../packages/database/src/agent/_mappers.ts), [activity type](../packages/realtime/src/documents/activity/_types.ts)                                                           |
| Workspace              | `organizations`, `organization_id`                                        | [Workspace mapper](../packages/database/src/workspace/_mappers.ts), [agent mapper](../packages/database/src/agent/_mappers.ts)                                                               |
| Agent role             | Behavior configuration in `Agent.roles`                                   | [Agent schemas](../packages/database/src/agent/_schemas.ts)                                                                                                                                  |
| Workspace role         | Access claims and membership permissions                                  | [Claims schema](../packages/database/src/auth/_schemas.ts), [workspace types](../packages/database/src/workspace/_types.ts)                                                                  |
| Service role           | Machine configuration's `services` selection                              | [Service configuration](../packages/service/src/config.ts)                                                                                                                                   |
| Activity / chat / task | Separate history, conversation, and background-work records               | [Activity](../packages/realtime/src/documents/activity/_types.ts), [chat](../packages/realtime/src/documents/chat/_types.ts), [task](../packages/realtime/src/documents/taskQueue/_types.ts) |

Application realtime synchronization uses the Hocuspocus/Yjs server in
[`apps/realtime/server.ts`](../apps/realtime/server.ts). Its
[persistence extension](../packages/realtime/src/_lib/createSupabaseExtension.ts)
stores eligible documents in Supabase; some transient document families are
excluded. Follow that policy before assuming a live document survives a restart.

## Find the right validation

- [`npm test`](../scripts/test-all.mjs) runs translation checks, JavaScript/TypeScript
  behavior tests, and Python tests. [`vitest.config.mts`](../vitest.config.mts)
  defines discovery and test aliases. The [test CI workflow](../.github/workflows/test.yml)
  adds coverage gates and production builds. Use the [testing guide](testing.md)
  when reproducing a failing validation layer locally.
- [`npm run knip`](../knip.ts) checks unused code and dependency declarations in
  a separate CI job. Read the [testing guide](testing.md#unused-code-and-dependencies)
  when maintaining dynamic entry points or reviewing findings.
- [`npm run test:sql`](../scripts/test-sql.mjs) runs every regression in
  [`supabase/tests`](../supabase/tests) against its own disposable database.
  This is separate from `npm test`; the runner owns database setup and cleanup.
- UI and context changes also need the [Storybook checks](testing.md#storybook)
  and relevant visual stories. The [visual CI workflow](../.github/workflows/storybook-visual.yml)
  runs those separately from `npm test`.
- [`AGENTS.md`](../AGENTS.md) is the source for contribution requirements, including
  formatting, documentation, translations, and the full suite before commits.

## Platform MCP and native agent tools

[`createPlatformTools`](../packages/realtime/src/platform/tools.ts) defines the shared
catalog for the web application's single [MCP route](../apps/web/app/mcp/route.ts) and
[`AgentToolSession`](../apps/realtime/src/chat/AgentToolSession.ts). The
[registry](../packages/realtime/src/platform/registry.ts) checks the access ceiling
and handlers authorize the exact workspace before privileged operations.
[Chat queueing](../packages/realtime/src/documents/chat/queueChat.ts) is shared
with the existing web submission and OAuth-resumption entry points through their
compatibility export. Delegated chats receive claims limited to the tool's level.

[Platform OAuth](../apps/web/lib/platformMcp/oauth.ts) uses separate opaque tokens,
S256 PKCE and exact resource binding. [Database operations](../packages/database/src/platformMcp)
keep hashed codes and tokens private; the exchange RPC consumes a code atomically.
The refresh RPC locks the grant, consumes the refresh credential and rotates both
credentials in one transaction. Consumed hashes remain until grant deletion to
revoke the entire family on replay. Refresh never extends the original 30-day
consent deadline; either token type can revoke the grant. See the
[rotation regression tests](../supabase/tests/platform_mcp_refresh.sql).
The [consent action](../apps/web/app/oauth/authorize/_actions/authorizePlatformMcp.ts)
validates the registered redirect and the selected level against the authenticated user's current permissions.
The [consent user loader](../apps/web/lib/platformMcp/getAuthorizationUser.ts)
resolves current roles for both the available choices and the submission check.
[Authentication](../apps/web/lib/platformMcp/authenticate.ts) rechecks the account
and current roles and creates a user client limited to the authorized level.

Behavior checks: [catalog and OAuth inputs](../tests/platform-mcp.test.ts),
[HTTP SDK transport](../tests/platform-mcp-http.test.ts),
[access ceilings](../tests/platform-access.test.ts), and
[SQL credential isolation and replay](../supabase/tests/platform_mcp_oauth.sql).
The [user guide and catalog](de/agent/edit/plattformzugriff.md) document tool names,
levels and limits. Maintain matching tools and page references as required by
[AGENTS.md](../AGENTS.md#platform-mcp-and-agent-tools).

The catalog is grouped into [settings](../packages/realtime/src/platform/settingsTools.ts),
[profiles](../packages/realtime/src/platform/profileTools.ts),
[workflow operations](../packages/realtime/src/platform/workflowTools.ts), and
[monitoring](../packages/realtime/src/platform/monitoringTools.ts).
Theme schemas and atomic saves live in [database/config](../packages/database/src/config),
SAML defaults and operations in [database/sso](../packages/database/src/sso).
The UI and MCP share [file selection](../packages/realtime/src/documents/storage/selectChatFile.ts)
, [history removal](../packages/realtime/src/documents/activity/removeActivityFromHistory.ts),
and [avatar replacement](../packages/database/src/user/replaceProfileAvatar.ts).
Theme and welcome-message loaders read current values on page load so mutations
from realtime workers do not depend on a Next.js action's private cache invalidation.

The [coverage inventory](../tests/fixtures/platform-mcp-coverage.json) accounts for
all web Server Actions, including explicit authentication-protocol exceptions.
[Coverage checks](../tests/platform-mcp-coverage.test.ts) fail when an action lacks
an entry or a tool lacks German catalog documentation.
[Extended authorization tests](../tests/platform-mcp-extended.test.ts) guard
self-service identity, asset privileges and activity-versus-repository access;
[workflow tests](../tests/platform-mcp-workflow.test.ts) exercise actual Yjs drafts,
approval matching and delegated claim ceilings through an in-memory transport.

Platform agent approval policies live in [`platformAgentPolicy.ts`](../packages/database/src/mcp/platformAgentPolicy.ts).
The shared registry enforces disabled levels, including privileged variants of user-level tools;
`AgentToolSession` supplies the agent policy while external OAuth MCP endpoints retain their own consent ceiling.
[`PlatformToolPreview`](../apps/web/app/%28main%29/agent/%5BagentId%5D/%5BactivityId%5D/_components/PlatformToolPreview.tsx)
uses read-only snapshots of the existing agent and repository info layouts for approvals and results.
Policy regressions are covered by [`platform-agent-policy.test.ts`](../tests/platform-agent-policy.test.ts).

Connected-object choices are resolved and authorized by [getXRAGRelatedObjects](../packages/database/src/xrag/getXRAGRelatedObjects.ts), shared by the app and platform MCP. Selected dependencies become independent entries in one atomic upsert. Personal XRAG selections live in [package operations](../packages/database/src/xrag/listXRAGPackages.ts) and the [package tables](../supabase/migrations/20261115133603_xrag_import_export.sql).

The [model catalog](../apps/web/app/_models/getModelCatalog.ts) exposes read-only public model details to workspace administrators. Global administrators can also manage model connections and metadata. Individual model downloads authorize the model and pin the selected archive version through [getModelExportSource](../packages/database/src/xrag/getModelExportSource.ts). The [web download route](../apps/web/app/api/xrag/download/%5B...path%5D/route.ts) serves byte ranges from the [installed model files](../packages/database/src/xrag/installedModelArchive.ts) or a published archive when the files are unavailable on the core host. For a resource, the route streams a freshly generated [resource archive](../packages/xrag/src/resourceArchive.ts) to the browser. MCP single exports use [exportXRAG](../packages/database/src/xrag/exportXRAG.ts) to create a temporary transfer. The HTTP MCP transport returns transfer metadata and a public application URL for single exports and a public download URL for completed package jobs. The `includeModels` option resolves [referenced local models](../packages/database/src/xrag/getReferencedXRAGModelIds.ts) for single exports. Saved packages include the model entries selected by the caller.

XRAG external model references carry only provider and model ID. [resolveExternalXRAGModels](../packages/database/src/xrag/resolveExternalXRAGModels.ts) shares destination matching between import preview and commit: one match is automatic, ambiguous matches require explicit selection, missing matches remain unresolved. UI and platform MCP use the same coordinator; credentials stay on the destination.

The web upload calls [prepareXRAGUpload](<../apps/web/app/(main)/app/xrag/_actions/prepareXRAGUpload.ts>) before opening the selection. The selection page reads the prepared display data with [getPreparedXRAGImport](../packages/database/src/xrag/getPreparedXRAGImport.ts). [inspectXRAGTransfer](../packages/database/src/xrag/inspectXRAGTransfer.ts) also supports direct links to unprepared uploads and platform tools. [selectXRAGImportEntries](../packages/database/src/xrag/selectXRAGImportEntries.ts) validates immutable child archive digests shared by preview and commit; whole-package access is checked before filtering. Only selected resources require a workspace. The app separates import and export tabs.

[prepareXRAGTransfer](../packages/database/src/xrag/prepareXRAGTransfer.ts) deletes outer archives after preparing an immutable, owner-scoped selection inventory. Successful and terminally failed imports consume the entire selection, including unselected children; only model/platform archives become artifacts. Existing destination files alone get undo copies. The [upload page](<../apps/web/app/(main)/app/xrag/import/page.tsx>) opens an owner-scoped [import selection](<../apps/web/app/(main)/app/xrag/import/[id]/page.tsx>) by upload ID. The [export page](<../apps/web/app/(main)/app/xrag/export/page.tsx>) loads packages and jobs independently. Model/setup singletons import automatically; packages default to all entries selected. Workspace and replacement decisions remain inline. [deleteXRAGTransfer](../packages/database/src/xrag/deleteXRAGTransfer.ts) authorizes exact ownership before abandoning a selection. The scheduler expires inventories one hour after publication and reclaims orphaned preparation files after 72 hours; preparation also enforces that deadline. Active rollback keeps its backups until restoration completes.

Saved XRAG package exports are queued by [exportXRAGPackage](../packages/database/src/xrag/exportXRAGPackage.ts).
The [XRAG export worker](../apps/realtime/src/xrag/worker.ts) claims durable jobs
through [processXRAGExport](../packages/database/src/xrag/processXRAGExport.ts),
streams installed model weights or published archives and necessary resource snapshots with
[streamPackageExport](../packages/database/src/xrag/streamPackageExport.ts), and
uploads bounded TUS chunks. [XRAGExportJobs](<../apps/web/app/(main)/app/xrag/_components/XRAGExportJobs.tsx>)
restores progress from SQL after navigation. Read [ADR 0009](adr/0009-streamed-xrag-package-exports.md)
when changing retry, snapshot, authorization, or spool semantics. Checks:
[lease SQL](../supabase/tests/xrag_export_jobs.sql),
[worker behavior](../tests/xrag-export-worker.test.ts),
[transport retries](../tests/xrag-upload-stream.test.ts), and
[large archive backpressure](../tests/xrag-stream-archive.test.ts).
