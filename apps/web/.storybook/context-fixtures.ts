import {
  createContext,
  createElement,
  useContext,
  type ReactNode,
} from "react";
import { connectionFixtures } from "./connection-fixtures";
// Fixed context data; the component implementations remain real (spy-only mocks).
import { fn, mocked } from "storybook/test";
import type { Scenario } from "./scenario";
import { useContextFixture } from "./context-runtime";
import { useFileUpload as hook0 } from "../app/_components/FileUploadProvider.tsx";
import { useActivites as hook1 } from "../app/(main)/_components/ActivityContextProvider.tsx";
import { useActivityTypeInfos as hook2 } from "../app/(main)/_components/ActivityContextProvider.tsx";
import { useActivityList as hook3 } from "../app/(main)/activity/_components/ActivityListProvider.tsx";
import { useAgentList as hook4 } from "../app/(main)/agent/_components/AgentListProvider.tsx";
import { useStorageView as hook5 } from "../app/_components/StorageViewProvider.tsx";
import { useChatStatus as hook6 } from "../app/(main)/agent/[agentId]/[activityId]/_components/ChatContext.tsx";
import { useCanSendMessage as hook7 } from "../app/(main)/agent/[agentId]/[activityId]/_components/ChatContext.tsx";
import { useMessages as hook8 } from "../app/(main)/agent/[agentId]/[activityId]/_components/ChatContext.tsx";
import { useChatComposeMessage as hook9 } from "../app/(main)/agent/[agentId]/[activityId]/_components/ChatComposeMessageContext.tsx";
import { useMediaPlayerContext as hook10 } from "../app/_components/transcription/MediaPlayerContext.tsx";
import { useAgentEditor as hook12 } from "../app/(main)/agent/_components/AgentEditor.tsx";
import { useDocumentRepositoryList as hook13 } from "../app/(main)/app/documents/_components/DocumentRepositoryListProvider.tsx";
import { useDocumentRepositoryEditor as hook14 } from "../app/(main)/app/documents/[documentRepositoryId]/_components/DocumentRepositoryEditor.tsx";
import { useTranscriberList as hook15 } from "../app/(main)/app/transcribe/_components/TranscriberListProvider.tsx";
import { useTranscriberEditor as hook16 } from "../app/(main)/app/transcribe/[transcriberId]/_components/TranscriberEditor.tsx";
import { useEditorAvatarUpload as hook17 } from "../app/(settings)/_components/EditorAvatarUploadProvider.tsx";
import { useUserList as hook18 } from "../app/(settings)/settings/user/_components/UserListProvider.tsx";
import { useUserEditPermissionList as hook19 } from "../app/(settings)/settings/user/[userId]/_components/UserEditPermissionListProvider.tsx";
import { useWorkspaceList as hook20 } from "../app/(settings)/settings/workspace/_components/WorkspaceListProvider.tsx";
import { useWorkspaceEditPermissionList as hook21 } from "../app/(settings)/settings/workspace/[workspaceId]/_components/WorkspaceEditPermissionListProvider.tsx";
import { useXRAGUpload as hook22 } from "../app/(settings)/settings/xrag/_components/XRAGUploadProvider.tsx";
import { useFeedback as hook23 } from "../app/feedback/_components/FeedbackContext.tsx";

// Composer controls and recommendation tiles consume the same draft in the app.
const chatComposeFixtureContext = createContext<
  ReturnType<typeof hook9> | undefined
>(undefined);

export function ChatComposeFixtureProvider({
  children,
}: {
  children: ReactNode;
}) {
  const value = hook9();
  return createElement(chatComposeFixtureContext.Provider, { value }, children);
}

export function configureContextFixtures(
  scenario: Scenario,
  overrides: Record<string, unknown> = {},
) {
  mocked(hook0).mockImplementation(
    () =>
      useContextFixture(
        {
          clearErrors: fn(),
          clearFinished: fn(),
          progress: 0.45,
          queueFileUploadsByDataTransfer: fn(),
          queueFileUploadsByFileList: fn(),
          queueFileUploadsByFiles: fn(async (files: readonly File[]) =>
            files.map((file) => ({
              file,
              id: "recording-upload",
              path: file.name,
              progress: 1,
              sanitizedFileType: file.type,
              state: "success" as const,
            })),
          ),
          uploads: [
            {
              id: "11111111-1111-4111-8111-111111111111",
              file: {
                lastModified: 1,
                name: "Beispiel",
                webkitRelativePath: "/",
                size: 1,
                type: "text",
                arrayBuffer: fn(),
                bytes: fn(),
                slice: fn(),
                stream: fn(),
                text: fn(),
              },
              path: "/beispiel.txt",
              progress: 0.45,
              sanitizedFileType: "Beispiel",
              state: "queued",
            },
          ],
        },
        scenario,
        overrides.useFileUpload,
      ) as ReturnType<typeof hook0>,
  );
  mocked(hook1).mockImplementation(
    () =>
      useContextFixture(
        {
          last30Days: [
            {
              content: {
                chatbotId: "11111111-1111-4111-8111-111111111111",
                type: "chat",
              },
              createdAtISO: "2026-01-15T12:00:00.000Z",
              deleteAtISO: "Beispiel",
              id: "11111111-1111-4111-8111-111111111111",
              label: "Beispiel",
              labelUserInput: false,
              pinned: false,
              state: "running",
              stateTimeoutISO: "2026-01-15T12:00:00.000Z",
              updatedAtISO: "2026-01-15T12:00:00.000Z",
            },
          ],
          last7Days: [
            {
              content: {
                chatbotId: "11111111-1111-4111-8111-111111111111",
                type: "chat",
              },
              createdAtISO: "2026-01-15T12:00:00.000Z",
              deleteAtISO: "Beispiel",
              id: "11111111-1111-4111-8111-111111111111",
              label: "Beispiel",
              labelUserInput: false,
              pinned: false,
              state: "running",
              stateTimeoutISO: "2026-01-15T12:00:00.000Z",
              updatedAtISO: "2026-01-15T12:00:00.000Z",
            },
          ],
          today: [
            {
              content: {
                chatbotId: "11111111-1111-4111-8111-111111111111",
                type: "chat",
              },
              createdAtISO: "2026-01-15T12:00:00.000Z",
              deleteAtISO: "Beispiel",
              id: "11111111-1111-4111-8111-111111111111",
              label: "Beispiel",
              labelUserInput: false,
              pinned: false,
              state: "running",
              stateTimeoutISO: "2026-01-15T12:00:00.000Z",
              updatedAtISO: "2026-01-15T12:00:00.000Z",
            },
          ],
          activities: [
            {
              content: {
                chatbotId: "11111111-1111-4111-8111-111111111111",
                type: "chat",
              },
              createdAtISO: "2026-01-15T12:00:00.000Z",
              deleteAtISO: "Beispiel",
              id: "11111111-1111-4111-8111-111111111111",
              label: "Beispiel",
              labelUserInput: false,
              pinned: false,
              state: "running",
              stateTimeoutISO: "2026-01-15T12:00:00.000Z",
              updatedAtISO: "2026-01-15T12:00:00.000Z",
            },
          ],
          pinnedActivities: [
            {
              content: {
                chatbotId: "11111111-1111-4111-8111-111111111111",
                type: "chat",
              },
              createdAtISO: "2026-01-15T12:00:00.000Z",
              deleteAtISO: "Beispiel",
              id: "11111111-1111-4111-8111-111111111111",
              label: "Beispiel",
              labelUserInput: false,
              pinned: false,
              state: "running",
              stateTimeoutISO: "2026-01-15T12:00:00.000Z",
              updatedAtISO: "2026-01-15T12:00:00.000Z",
            },
          ],
        },
        scenario,
        overrides.useActivites,
      ) as ReturnType<typeof hook1>,
  );
  mocked(hook2).mockImplementation(
    () =>
      useContextFixture(
        new Map(),
        scenario,
        overrides.useActivityTypeInfos,
      ) as ReturnType<typeof hook2>,
  );
  mocked(hook3).mockImplementation(
    () =>
      useContextFixture(
        {
          filter: "",
          filteredData: [{}],
          setFilter: fn(),
          isDefaultPreferences: false,
          isUserPreferences: false,
          itemGroups: [
            [
              "Beispiel",
              [
                {
                  content: {
                    chatbotId: "11111111-1111-4111-8111-111111111111",
                    type: "chat",
                  },
                  createdAtISO: "2026-01-15T12:00:00.000Z",
                  deleteAtISO: "Beispiel",
                  id: "11111111-1111-4111-8111-111111111111",
                  label: "Beispiel",
                  labelUserInput: false,
                  pinned: false,
                  state: "running",
                  stateTimeoutISO: "2026-01-15T12:00:00.000Z",
                  updatedAtISO: "2026-01-15T12:00:00.000Z",
                },
              ],
            ],
          ],
          resetPreferences: fn(),
          savePreferences: fn(),
          savePreferencesHasErrored: false,
          savePreferencesHasSucceeded: false,
          savePreferencesIsPending: false,
          setGroup: fn(),
          setSort: fn(),
          setView: fn(),
          group: "state",
          sort: "name:asc",
          view: "list",
        },
        scenario,
        overrides.useActivityList,
      ) as ReturnType<typeof hook3>,
  );
  mocked(hook4).mockImplementation(
    () =>
      useContextFixture(
        {
          filter: "",
          filteredData: [{}],
          setFilter: fn(),
          isDefaultPreferences: false,
          isUserPreferences: false,
          itemGroups: [
            [
              "Beispiel",
              [
                {
                  description: "Eine Beschreibung für Storybook.",
                  id: "11111111-1111-4111-8111-111111111111",
                  name: "Beispiel",
                  workspaceId: "11111111-1111-4111-8111-111111111111",
                  additionalFunctions: {
                    batch: false,
                    disappearingChats: false,
                    fileUpload: false,
                    nightshift: false,
                    pursueGoal: false,
                  },
                  color: { oklchHue: 284, type: "color-oklch-hue" },
                  documentation: "Beispiel",
                  icon: { iconName: "bot", type: "icon-lucide" },
                  modelIdentifier: "example-model",
                  modelThinking: "mandatory-on",
                  recommendedMessages: [
                    {
                      id: "11111111-1111-4111-8111-111111111111",
                      message: "Beispiel",
                      label: "Beispiel",
                    },
                  ],
                  roles: [
                    {
                      documentRepositoryMounts: [],
                      id: "11111111-1111-4111-8111-111111111111",
                      prompt: "Beantworte die Frage verständlich.",
                      mcps: [],
                      modelIdentifierOverride:
                        "11111111-1111-4111-8111-111111111111",
                      modelThinkingOverride: "mandatory-on",
                      name: "Beispiel",
                      roleSelectionHint: "Beispiel",
                      toolCalculator: { active: false },
                      toolChatAwareness: {
                        active: false,
                        recommendNextMessages: false,
                        updateChatLabel: false,
                      },
                      toolWebAccess: {
                        active: false,
                        webFetchAccess: "allow-all",
                        webFetchAllowList: [],
                        webFetch: "on",
                        webSearch: "on",
                      },
                    },
                  ],
                  version: "agent-config-version-4",
                  favorite: false,
                },
              ],
            ],
          ],
          resetPreferences: fn(),
          savePreferences: fn(),
          savePreferencesHasErrored: false,
          savePreferencesHasSucceeded: false,
          savePreferencesIsPending: false,
          setGroup: fn(),
          setSort: fn(),
          setView: fn(),
          group: "no-group",
          sort: "name:asc",
          view: "cards",
        },
        scenario,
        overrides.useAgentList,
      ) as ReturnType<typeof hook4>,
  );
  mocked(hook5).mockImplementation(
    () =>
      useContextFixture(
        {
          filter: "",
          filteredData: [{}],
          setFilter: fn(),
          isDefaultPreferences: false,
          isUserPreferences: false,
          itemGroups: [
            [
              "Beispiel",
              [
                {
                  name: "Beispiel",
                  path: "/beispiel.txt",
                  createdAtISO: "2026-01-15T12:00:00.000Z",
                  file: true,
                  readableContent: "text",
                  size: 1,
                  type: "text",
                  updatedAtISO: "2026-01-15T12:00:00.000Z",
                  currentAction: {
                    target: {
                      name: "Beispiel",
                      path: "/beispiel.txt",
                      createdAtISO: "2026-01-15T12:00:00.000Z",
                      file: true,
                      readableContent: "text",
                      size: 1,
                      type: "text",
                      updatedAtISO: "2026-01-15T12:00:00.000Z",
                    },
                    progress: 0.45,
                    state: "uploading",
                  },
                },
              ],
            ],
          ],
          resetPreferences: fn(),
          savePreferences: fn(),
          savePreferencesHasErrored: false,
          savePreferencesHasSucceeded: false,
          savePreferencesIsPending: false,
          setGroup: fn(),
          setSort: fn(),
          setView: fn(),
          group: "type",
          sort: "name:asc",
          view: "table",
          canWrite: true,
          basePathApp: "/files",
          basePathStorage: "/",
          pendingFilePaths: [],
          storage: {
            activityId: "11111111-1111-4111-8111-111111111111",
            agentId: "11111111-1111-4111-8111-111111111111",
            type: "activity",
          },
        },
        scenario,
        overrides.useStorageView,
      ) as ReturnType<typeof hook5>,
  );
  mocked(hook6).mockImplementation(
    () =>
      useContextFixture(
        scenario === "pending"
          ? "generating"
          : scenario === "error"
            ? "error"
            : "idle",
        scenario,
        overrides.useChatStatus,
      ) as ReturnType<typeof hook6>,
  );
  mocked(hook7).mockImplementation(
    () =>
      useContextFixture(
        scenario !== "pending",
        scenario,
        overrides.useCanSendMessage,
      ) as ReturnType<typeof hook7>,
  );
  mocked(hook8).mockImplementation(
    () =>
      useContextFixture(
        [
          {
            id: "11111111-1111-4111-8111-111111111111",
            role: "user",
            metadata: {
              roleName: "Beispiel",
              roleId: "11111111-1111-4111-8111-111111111111",
              thinking: false,
              timing: { inputDuration: 1, outputDuration: 1, totalDuration: 1 },
              usage: {
                inputTokens: 1,
                inputTokenDetails: {
                  noCacheTokens: 1,
                  cacheReadTokens: 1,
                  cacheWriteTokens: 1,
                },
                outputTokens: 1,
                outputTokenDetails: { textTokens: 1, reasoningTokens: 1 },
                totalTokens: 1,
                raw: {},
              },
            },
            parts: [
              {
                type: "text",
                text: "Eine Beispielnachricht.",
                state: "streaming",
                providerMetadata: {},
              },
            ],
          },
        ],
        scenario,
        overrides.useMessages,
      ) as ReturnType<typeof hook8>,
  );
  mocked(hook9).mockImplementation(() => {
    const shared = useContext(chatComposeFixtureContext);
    const local = useContextFixture(
      {
        activity: {
          content: {
            chatbotId: "11111111-1111-4111-8111-111111111111",
            type: "chat",
          },
          createdAtISO: "2026-01-15T12:00:00.000Z",
          deleteAtISO: "Beispiel",
          id: "11111111-1111-4111-8111-111111111111",
          label: "Beispiel",
          labelUserInput: false,
          pinned: false,
          state: "running",
          stateTimeoutISO: "2026-01-15T12:00:00.000Z",
          updatedAtISO: "2026-01-15T12:00:00.000Z",
        },
        activityId: "11111111-1111-4111-8111-111111111111",
        agentId: "11111111-1111-4111-8111-111111111111",
        defaultThinking: false,
        interaction: { type: "message-batch" },
        approvalSubmitted: false,
        submitToolApproval: fn(),
        messageBatch: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            state: "queued",
            content: {
              files: [
                {
                  name: "Beispiel",
                  path: "/beispiel.txt",
                  createdAtISO: "2026-01-15T12:00:00.000Z",
                  file: true,
                  readableContent: "text",
                  size: 1,
                  type: "text",
                  updatedAtISO: "2026-01-15T12:00:00.000Z",
                  currentAction: {
                    target: {
                      name: "Beispiel",
                      path: "/beispiel.txt",
                      createdAtISO: "2026-01-15T12:00:00.000Z",
                      file: true,
                      readableContent: "text",
                      size: 1,
                      type: "text",
                      updatedAtISO: "2026-01-15T12:00:00.000Z",
                    },
                    progress: 0.45,
                    state: "uploading",
                  },
                },
              ],
              type: "text",
              text: "Eine Beispielnachricht.",
              thinking: false,
            },
          },
        ],
        messageBatchAdd: fn(() => ({ messageId: crypto.randomUUID() })),
        messageBatchDelete: fn(),
        selectedCurrentMessage: {
          id: "11111111-1111-4111-8111-111111111111",
          state: "queued",
          content: {
            files: [
              {
                name: "Beispiel",
                path: "/beispiel.txt",
                createdAtISO: "2026-01-15T12:00:00.000Z",
                file: true,
                readableContent: "text",
                size: 1,
                type: "text",
                updatedAtISO: "2026-01-15T12:00:00.000Z",
                currentAction: {
                  target: {
                    name: "Beispiel",
                    path: "/beispiel.txt",
                    createdAtISO: "2026-01-15T12:00:00.000Z",
                    file: true,
                    readableContent: "text",
                    size: 1,
                    type: "text",
                    updatedAtISO: "2026-01-15T12:00:00.000Z",
                  },
                  progress: 0.45,
                  state: "uploading",
                },
              },
            ],
            type: "text",
            text: "Eine Beispielnachricht.",
            thinking: false,
          },
        },
        setMessageBatchState: fn(),
        setMessageState: fn(),
        setSelectedCurrentMessageId: fn(),
        setFirstCurrentMessageSubmitted: fn(
          () => "11111111-1111-4111-8111-111111111111",
        ),
        setSelectedCurrentMessageText: fn(),
        setSelectedCurrentMessageThinking: fn(),
        addSelectedFiles: fn(),
        waitForSubmittedChanges: fn(async () => {}),
      },
      scenario,
      overrides.useChatComposeMessage,
    ) as ReturnType<typeof hook9>;
    return shared ?? local;
  });
  mocked(hook10).mockImplementation(
    () =>
      useContextFixture(
        {
          error: false,
          loading: null,
          currentTime: 30,
          duration: 120,
          hasVideo: false,
          isPlaying: false,
          pause: fn(),
          play: fn(),
          playUntil: fn(),
          rate: 1,
          setCurrentTime: fn(),
          setRate: fn(),
          setVolume: fn(),
          videoRef: { current: null },
          volume: 0.8,
        },
        scenario,
        overrides.useMediaPlayerContext,
      ) as ReturnType<typeof hook10>,
  );
  mocked(hook12).mockImplementation(
    () =>
      useContextFixture(
        {
          setAgentRole: fn(),
          agent: {
            description: "Eine Beschreibung für Storybook.",
            id: "11111111-1111-4111-8111-111111111111",
            name: "Beispiel",
            workspaceId: "11111111-1111-4111-8111-111111111111",
            additionalFunctions: {
              batch: false,
              disappearingChats: false,
              fileUpload: false,
              nightshift: false,
              pursueGoal: false,
            },
            color: { oklchHue: 284, type: "color-oklch-hue" },
            documentation: "Beispiel",
            icon: { iconName: "bot", type: "icon-lucide" },
            modelIdentifier: "example-model",
            modelThinking: "mandatory-on",
            recommendedMessages: [
              {
                id: "11111111-1111-4111-8111-111111111111",
                message: "Beispiel",
                label: "Beispiel",
              },
            ],
            roles: [
              {
                documentRepositoryMounts: [
                  {
                    documentRepositoryIdentifier:
                      "11111111-1111-4111-8111-111111111111",
                    id: "11111111-1111-4111-8111-111111111111",
                    mount: "Beispiel",
                    pathRepository: "/",
                    permission: "read-only",
                  },
                ],
                id: "11111111-1111-4111-8111-111111111111",
                prompt: "Beantworte die Frage verständlich.",
                mcps: [
                  {
                    headers: {},
                    id: "11111111-1111-4111-8111-111111111111",
                    type: "http",
                    url: "/brand/squared.png",
                    name: "Beispiel",
                  },
                ],
                modelIdentifierOverride: "11111111-1111-4111-8111-111111111111",
                modelThinkingOverride: "mandatory-on",
                name: "Beispiel",
                roleSelectionHint: "Beispiel",
                toolCalculator: { active: false },
                toolChatAwareness: {
                  active: false,
                  recommendNextMessages: false,
                  updateChatLabel: false,
                },
                toolWebAccess: {
                  active: false,
                  webFetchAccess: "allow-all",
                  webFetchAllowList: ["Beispiel"],
                  webFetch: "on",
                  webSearch: "on",
                },
              },
            ],
            version: "agent-config-version-4",
          },
          defaultAgent: {
            description: "Eine Beschreibung für Storybook.",
            id: "11111111-1111-4111-8111-111111111111",
            name: "Beispiel",
            workspaceId: "11111111-1111-4111-8111-111111111111",
            additionalFunctions: {
              batch: false,
              disappearingChats: false,
              fileUpload: false,
              nightshift: false,
              pursueGoal: false,
            },
            color: { oklchHue: 284, type: "color-oklch-hue" },
            documentation: "Beispiel",
            icon: { iconName: "bot", type: "icon-lucide" },
            modelIdentifier: "example-model",
            modelThinking: "mandatory-on",
            recommendedMessages: [
              {
                id: "11111111-1111-4111-8111-111111111111",
                message: "Beispiel",
                label: "Beispiel",
              },
            ],
            roles: [
              {
                documentRepositoryMounts: [
                  {
                    documentRepositoryIdentifier:
                      "11111111-1111-4111-8111-111111111111",
                    id: "11111111-1111-4111-8111-111111111111",
                    mount: "Beispiel",
                    pathRepository: "/",
                    permission: "read-only",
                  },
                ],
                id: "11111111-1111-4111-8111-111111111111",
                prompt: "Beantworte die Frage verständlich.",
                mcps: [
                  {
                    headers: {},
                    id: "11111111-1111-4111-8111-111111111111",
                    type: "http",
                    url: "/brand/squared.png",
                    name: "Beispiel",
                  },
                ],
                modelIdentifierOverride: "11111111-1111-4111-8111-111111111111",
                modelThinkingOverride: "mandatory-on",
                name: "Beispiel",
                roleSelectionHint: "Beispiel",
                toolCalculator: { active: false },
                toolChatAwareness: {
                  active: false,
                  recommendNextMessages: false,
                  updateChatLabel: false,
                },
                toolWebAccess: {
                  active: false,
                  webFetchAccess: "allow-all",
                  webFetchAllowList: ["Beispiel"],
                  webFetch: "on",
                  webSearch: "on",
                },
              },
            ],
            version: "agent-config-version-4",
          },
          hasValidationError: fn(),
          relations: {
            connections: connectionFixtures,
            documentRepositories: [
              {
                description: "Eine Beschreibung für Storybook.",
                id: "11111111-1111-4111-8111-111111111111",
                name: "Beispiel",
                workspaceId: "11111111-1111-4111-8111-111111111111",
                identifier: "11111111-1111-4111-8111-111111111111",
                type: "database-v2",
                color: { oklchHue: 284, type: "color-oklch-hue" },
                icon: { iconName: "bot", type: "icon-lucide" },
                index: {
                  embedding: {
                    active: false,
                    modelIdentifier: "example-model",
                    modelVectorSize: 384,
                  },
                  keyword: { active: false },
                },
                transcriberIdentifier: "11111111-1111-4111-8111-111111111111",
              },
            ],
            models: [
              {
                id: "11111111-1111-4111-8111-111111111111",
                createdAt: new Date("2026-01-15T12:00:00.000Z"),
                name: "Beispiel",
                description: "Eine Beschreibung für Storybook.",
                identifier: "11111111-1111-4111-8111-111111111111",
                config: {
                  contextSize: 1,
                  featureThinking: false,
                  featureTools: false,
                  featureVision: false,
                  ollamaIdentifier: "11111111-1111-4111-8111-111111111111",
                },
                type: "ollama_llm_v1",
              },
            ],
            theme: {
              version: "theme-v2",
              colors: [
                {
                  color: { oklchHue: 284, type: "color-oklch-hue" },
                  id: "11111111-1111-4111-8111-111111111111",
                  name: "Beispiel",
                },
              ],
              logo: {},
            },
            workspaces: [
              {
                id: "11111111-1111-4111-8111-111111111111",
                createdAt: new Date("2026-01-15T12:00:00.000Z"),
                name: "Beispiel",
                description: "Eine Beschreibung für Storybook.",
                documentation: "Beispiel",
                autoJoin: false,
                samlMappingUser: "Beispiel",
                samlMappingEditor: "Beispiel",
                samlMappingWorkspaceAdmin: "Beispiel",
                claim: "admin",
              },
            ],
          },
          setAgent: fn(),
        },
        scenario,
        overrides.useAgentEditor,
      ) as ReturnType<typeof hook12>,
  );
  mocked(hook13).mockImplementation(
    () =>
      useContextFixture(
        {
          filter: "",
          filteredData: [{}],
          setFilter: fn(),
          isDefaultPreferences: false,
          isUserPreferences: false,
          itemGroups: [
            [
              "Beispiel",
              [
                {
                  description: "Eine Beschreibung für Storybook.",
                  id: "11111111-1111-4111-8111-111111111111",
                  name: "Beispiel",
                  workspaceId: "11111111-1111-4111-8111-111111111111",
                  identifier: "11111111-1111-4111-8111-111111111111",
                  type: "database-v2",
                  color: { oklchHue: 284, type: "color-oklch-hue" },
                  icon: { iconName: "bot", type: "icon-lucide" },
                  index: {
                    embedding: {
                      active: false,
                      modelIdentifier: "example-model",
                      modelVectorSize: 384,
                    },
                    keyword: { active: false },
                  },
                  transcriberIdentifier: "11111111-1111-4111-8111-111111111111",
                  favorite: false,
                },
              ],
            ],
          ],
          resetPreferences: fn(),
          savePreferences: fn(),
          savePreferencesHasErrored: false,
          savePreferencesHasSucceeded: false,
          savePreferencesIsPending: false,
          setGroup: fn(),
          setSort: fn(),
          setView: fn(),
          group: "no-group",
          sort: "name:asc",
          view: "cards",
        },
        scenario,
        overrides.useDocumentRepositoryList,
      ) as ReturnType<typeof hook13>,
  );
  mocked(hook14).mockImplementation(
    () =>
      useContextFixture(
        {
          defaultDocumentRepository: {
            description: "Eine Beschreibung für Storybook.",
            id: "11111111-1111-4111-8111-111111111111",
            name: "Beispiel",
            workspaceId: "11111111-1111-4111-8111-111111111111",
            identifier: "11111111-1111-4111-8111-111111111111",
            type: "database-v2",
            color: { oklchHue: 284, type: "color-oklch-hue" },
            icon: { iconName: "bot", type: "icon-lucide" },
            index: {
              embedding: {
                active: false,
                modelIdentifier: "example-model",
                modelVectorSize: 384,
              },
              keyword: { active: false },
            },
            transcriberIdentifier: "11111111-1111-4111-8111-111111111111",
          },
          hasValidationError: fn(),
          relations: {
            models: [
              {
                id: "11111111-1111-4111-8111-111111111111",
                createdAt: new Date("2026-01-15T12:00:00.000Z"),
                name: "Beispiel",
                description: "Eine Beschreibung für Storybook.",
                identifier: "11111111-1111-4111-8111-111111111111",
                config: {
                  contextSize: 1,
                  featureThinking: false,
                  featureTools: false,
                  featureVision: false,
                  ollamaIdentifier: "11111111-1111-4111-8111-111111111111",
                },
                type: "ollama_llm_v1",
              },
            ],
            theme: {
              version: "theme-v2",
              colors: [
                {
                  color: { oklchHue: 284, type: "color-oklch-hue" },
                  id: "11111111-1111-4111-8111-111111111111",
                  name: "Beispiel",
                },
              ],
              logo: {},
            },
            transcribers: [
              {
                id: "11111111-1111-4111-8111-111111111111",
                identifier: "11111111-1111-4111-8111-111111111111",
                name: "Beispiel",
                version: "transcriber-v2",
                workspaceId: "11111111-1111-4111-8111-111111111111",
                color: { oklchHue: 284, type: "color-oklch-hue" },
                description: "Eine Beschreibung für Storybook.",
                icon: { iconName: "bot", type: "icon-lucide" },
                modelIdentifier: "example-model",
                prompt: "Beantworte die Frage verständlich.",
              },
            ],
            workspaces: [
              {
                id: "11111111-1111-4111-8111-111111111111",
                createdAt: new Date("2026-01-15T12:00:00.000Z"),
                name: "Beispiel",
                description: "Eine Beschreibung für Storybook.",
                documentation: "Beispiel",
                autoJoin: false,
                samlMappingUser: "Beispiel",
                samlMappingEditor: "Beispiel",
                samlMappingWorkspaceAdmin: "Beispiel",
                claim: "admin",
              },
            ],
          },
          setDocumentRepository: fn(),
          documentRepository: {
            description: "Eine Beschreibung für Storybook.",
            id: "11111111-1111-4111-8111-111111111111",
            name: "Beispiel",
            workspaceId: "11111111-1111-4111-8111-111111111111",
            identifier: "11111111-1111-4111-8111-111111111111",
            type: "database-v2",
            color: { oklchHue: 284, type: "color-oklch-hue" },
            icon: { iconName: "bot", type: "icon-lucide" },
            index: {
              embedding: {
                active: false,
                modelIdentifier: "example-model",
                modelVectorSize: 384,
              },
              keyword: { active: false },
            },
            transcriberIdentifier: "11111111-1111-4111-8111-111111111111",
          },
        },
        scenario,
        overrides.useDocumentRepositoryEditor,
      ) as ReturnType<typeof hook14>,
  );
  mocked(hook15).mockImplementation(
    () =>
      useContextFixture(
        {
          filter: "",
          filteredData: [{}],
          setFilter: fn(),
          isDefaultPreferences: false,
          isUserPreferences: false,
          itemGroups: [
            [
              "Beispiel",
              [
                {
                  id: "11111111-1111-4111-8111-111111111111",
                  identifier: "11111111-1111-4111-8111-111111111111",
                  name: "Beispiel",
                  version: "transcriber-v2",
                  workspaceId: "11111111-1111-4111-8111-111111111111",
                  color: { oklchHue: 284, type: "color-oklch-hue" },
                  description: "Eine Beschreibung für Storybook.",
                  icon: { iconName: "bot", type: "icon-lucide" },
                  modelIdentifier: "example-model",
                  prompt: "Beantworte die Frage verständlich.",
                  favorite: false,
                },
              ],
            ],
          ],
          resetPreferences: fn(),
          savePreferences: fn(),
          savePreferencesHasErrored: false,
          savePreferencesHasSucceeded: false,
          savePreferencesIsPending: false,
          setGroup: fn(),
          setSort: fn(),
          setView: fn(),
          group: "no-group",
          sort: "name:asc",
          view: "cards",
        },
        scenario,
        overrides.useTranscriberList,
      ) as ReturnType<typeof hook15>,
  );
  mocked(hook16).mockImplementation(
    () =>
      useContextFixture(
        {
          defaultTranscriber: {
            id: "11111111-1111-4111-8111-111111111111",
            identifier: "11111111-1111-4111-8111-111111111111",
            name: "Beispiel",
            version: "transcriber-v2",
            workspaceId: "11111111-1111-4111-8111-111111111111",
            color: { oklchHue: 284, type: "color-oklch-hue" },
            description: "Eine Beschreibung für Storybook.",
            icon: { iconName: "bot", type: "icon-lucide" },
            modelIdentifier: "example-model",
            prompt: "Beantworte die Frage verständlich.",
          },
          hasValidationError: fn(),
          isPending: false,
          relations: {
            models: [
              {
                id: "11111111-1111-4111-8111-111111111111",
                createdAt: new Date("2026-01-15T12:00:00.000Z"),
                name: "Beispiel",
                description: "Eine Beschreibung für Storybook.",
                identifier: "11111111-1111-4111-8111-111111111111",
                config: {
                  contextSize: 1,
                  featureThinking: false,
                  featureTools: false,
                  featureVision: false,
                  ollamaIdentifier: "11111111-1111-4111-8111-111111111111",
                },
                type: "ollama_llm_v1",
              },
            ],
            theme: {
              version: "theme-v2",
              colors: [
                {
                  color: { oklchHue: 284, type: "color-oklch-hue" },
                  id: "11111111-1111-4111-8111-111111111111",
                  name: "Beispiel",
                },
              ],
              logo: {},
            },
            workspaces: [
              {
                id: "11111111-1111-4111-8111-111111111111",
                createdAt: new Date("2026-01-15T12:00:00.000Z"),
                name: "Beispiel",
                description: "Eine Beschreibung für Storybook.",
                documentation: "Beispiel",
                autoJoin: false,
                samlMappingUser: "Beispiel",
                samlMappingEditor: "Beispiel",
                samlMappingWorkspaceAdmin: "Beispiel",
                claim: "admin",
              },
            ],
          },
          setTranscriber: fn(),
          transcriber: {
            id: "11111111-1111-4111-8111-111111111111",
            identifier: "11111111-1111-4111-8111-111111111111",
            name: "Beispiel",
            version: "transcriber-v2",
            workspaceId: "11111111-1111-4111-8111-111111111111",
            color: { oklchHue: 284, type: "color-oklch-hue" },
            description: "Eine Beschreibung für Storybook.",
            icon: { iconName: "bot", type: "icon-lucide" },
            modelIdentifier: "example-model",
            prompt: "Beantworte die Frage verständlich.",
          },
        },
        scenario,
        overrides.useTranscriberEditor,
      ) as ReturnType<typeof hook16>,
  );
  mocked(hook17).mockImplementation(
    () =>
      useContextFixture(
        { hasErrored: false, hasSucceeded: false, isPending: false },
        scenario,
        overrides.useEditorAvatarUpload,
      ) as ReturnType<typeof hook17>,
  );
  mocked(hook18).mockImplementation(
    () =>
      useContextFixture(
        {
          filter: "",
          filteredData: [{}],
          setFilter: fn(),
          isDefaultPreferences: false,
          isUserPreferences: false,
          itemGroups: [
            [
              "Beispiel",
              [
                {
                  id: "11111111-1111-4111-8111-111111111111",
                  email: "alex@example.test",
                  firstName: "Alex",
                  lastName: "Beispiel",
                  name: "Beispiel",
                  signInMethod: "email",
                  lastSignInAt: new Date("2026-01-15T12:00:00.000Z"),
                },
              ],
            ],
          ],
          resetPreferences: fn(),
          savePreferences: fn(),
          savePreferencesHasErrored: false,
          savePreferencesHasSucceeded: false,
          savePreferencesIsPending: false,
          setGroup: fn(),
          setSort: fn(),
          setView: fn(),
          group: "no-group",
          sort: "name:asc",
          view: "table",
        },
        scenario,
        overrides.useUserList,
      ) as ReturnType<typeof hook18>,
  );
  mocked(hook19).mockImplementation(
    () =>
      useContextFixture(
        {
          filter: "",
          filteredData: [{}],
          setFilter: fn(),
          isDefaultPreferences: false,
          isUserPreferences: false,
          itemGroups: [
            [
              "Beispiel",
              [
                {
                  userRole: "editor",
                  id: "11111111-1111-4111-8111-111111111111",
                  createdAt: new Date("2026-01-15T12:00:00.000Z"),
                  name: "Beispiel",
                  description: "Eine Beschreibung für Storybook.",
                  documentation: "Beispiel",
                  autoJoin: false,
                  samlMappingUser: "Beispiel",
                  samlMappingEditor: "Beispiel",
                  samlMappingWorkspaceAdmin: "Beispiel",
                },
              ],
            ],
          ],
          resetPreferences: fn(),
          savePreferences: fn(),
          savePreferencesHasErrored: false,
          savePreferencesHasSucceeded: false,
          savePreferencesIsPending: false,
          setGroup: fn(),
          setSort: fn(),
          setView: fn(),
          group: "permission",
          sort: "name:asc",
          view: "table",
        },
        scenario,
        overrides.useUserEditPermissionList,
      ) as ReturnType<typeof hook19>,
  );
  mocked(hook20).mockImplementation(
    () =>
      useContextFixture(
        {
          filter: "",
          filteredData: [{}],
          setFilter: fn(),
          isDefaultPreferences: false,
          isUserPreferences: false,
          itemGroups: [
            [
              "Beispiel",
              [
                {
                  id: "11111111-1111-4111-8111-111111111111",
                  createdAt: new Date("2026-01-15T12:00:00.000Z"),
                  name: "Beispiel",
                  description: "Eine Beschreibung für Storybook.",
                  documentation: "Beispiel",
                  autoJoin: false,
                  samlMappingUser: "Beispiel",
                  samlMappingEditor: "Beispiel",
                  samlMappingWorkspaceAdmin: "Beispiel",
                },
              ],
            ],
          ],
          resetPreferences: fn(),
          savePreferences: fn(),
          savePreferencesHasErrored: false,
          savePreferencesHasSucceeded: false,
          savePreferencesIsPending: false,
          setGroup: fn(),
          setSort: fn(),
          setView: fn(),
          group: "no-group",
          sort: "name:asc",
          view: "table",
        },
        scenario,
        overrides.useWorkspaceList,
      ) as ReturnType<typeof hook20>,
  );
  mocked(hook21).mockImplementation(
    () =>
      useContextFixture(
        {
          filter: "",
          filteredData: [{}],
          setFilter: fn(),
          isDefaultPreferences: false,
          isUserPreferences: false,
          itemGroups: [
            [
              "Beispiel",
              [
                {
                  workspaceRole: "editor",
                  id: "11111111-1111-4111-8111-111111111111",
                  email: "alex@example.test",
                  firstName: "Alex",
                  lastName: "Beispiel",
                  name: "Beispiel",
                  signInMethod: "email",
                  lastSignInAt: new Date("2026-01-15T12:00:00.000Z"),
                },
              ],
            ],
          ],
          resetPreferences: fn(),
          savePreferences: fn(),
          savePreferencesHasErrored: false,
          savePreferencesHasSucceeded: false,
          savePreferencesIsPending: false,
          setGroup: fn(),
          setSort: fn(),
          setView: fn(),
          group: "permission",
          sort: "name:asc",
          view: "table",
        },
        scenario,
        overrides.useWorkspaceEditPermissionList,
      ) as ReturnType<typeof hook21>,
  );
  mocked(hook22).mockImplementation(
    () =>
      useContextFixture(
        { hasErrored: false, hasSucceeded: false, isPending: false },
        scenario,
        overrides.useXRAGUpload,
      ) as ReturnType<typeof hook22>,
  );
  mocked(hook23).mockImplementation(
    () =>
      useContextFixture(
        {
          feedback: {
            textFeedback: "Beispiel",
            starsClicked: 1,
            starsHovered: 1,
          },
          setFeedback: fn(),
        },
        scenario,
        overrides.useFeedback,
      ) as ReturnType<typeof hook23>,
  );
}
