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
2. Both use [`queueChat`](../apps/web/lib/chat/queueChat.ts): the caller checks
   that the chat is idle, then queueing marks a generation as queued and adds its
   task. Authorization stays in the entry points.
3. [`TaskQueue`](../packages/realtime/src/documents/taskQueue/TaskQueue.ts)
   claims work by type and capabilities and owns completion/error/abort
   acknowledgement. The [`Task` union](../packages/realtime/src/documents/taskQueue/_types.ts)
   defines its states and payloads.
4. The [`chat worker`](../apps/realtime/src/chat/worker.ts) consumes submitted
   [chat inputs](../packages/realtime/src/documents/chatCurrentMessage/_types.ts),
   selects an agent role, runs its tools and model, and writes messages and
   activity state. [`AgentToolSession`](../apps/realtime/src/chat/AgentToolSession.ts)
   owns the tools available to that role.
5. [`abortChatGeneration`](../apps/web/app/%28main%29/agent/%5BagentId%5D/%5BactivityId%5D/_actions/abortChatGeneration.ts)
   and the queue/worker cooperate on cancellation. Follow the whole path when
   changing busy checks or cleanup; an idle-looking chat alone does not prove
   that the previous task has finished.

Behavior checks: [submission and cancellation](../tests/web/chat-submission.test.tsx),
[worker processing](../tests/chat-worker.test.ts),
[queue lifecycle](../tests/task-queue.test.ts), and
[OAuth routes and resumption](../tests/mcp-oauth-routes.test.ts).

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
  defines discovery and test aliases. Supabase SQL checks under
  [`supabase/tests`](../supabase/tests) are separate from this command.
- UI and context changes also need the [Storybook checks](testing.md#storybook)
  and relevant visual stories. The [visual CI workflow](../.github/workflows/storybook-visual.yml)
  runs those separately from `npm test`.
- [`AGENTS.md`](../AGENTS.md) is the source for contribution requirements, including
  formatting, documentation, translations, and the full suite before commits.
