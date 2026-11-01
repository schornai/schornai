# schorn.ai in a Box

Shared language for discussing the application and its machine services. The
[German glossary](docs/de/hilfe/begriffe.md) covers the corresponding UI labels.

## Resources and access

**Workspace**: An organizational scope that groups agents, document repositories,
and transcribers and assigns access to people.
_Avoid_: Organization in new domain descriptions; repository for a workspace.

**Agent**: A configured assistant with a default model and one or more agent roles.
_Avoid_: Chatbot in new domain descriptions; worker for the assistant.

**Agent role**: A named part of an agent's behavior, with instructions, model
overrides, and available tools.
_Avoid_: Unqualified role when access permissions are also being discussed.

**Workspace role**: A person's level of access within a workspace, such as user,
editor, or workspace administrator. Global administrator access spans the instance.
_Avoid_: Agent role for a person's permissions.

**Document repository**: A shared collection of files that can provide knowledge
to agents. Conversation files instead belong to an individual chat.
_Avoid_: Database or unqualified repository when referring to this resource.

**Transcriber**: A saved configuration for converting audio or video to text,
including its model, prompt, and retry level.
_Avoid_: Transcriber worker when referring to the saved configuration.

## Conversations and background work

**Activity**: A history entry for a work session, such as a chat or transcription,
with its label and progress state.
_Avoid_: Task for a history entry; chat for every kind of activity.

**Chat**: A conversation with an agent, associated with an activity and containing
the exchanged messages and tool interactions.

**Chat input**: A prepared message or tool-approval response awaiting processing.
A message batch can contain several inputs for the same chat.
_Avoid_: Task or generated message for a prepared input.

**Generation**: One execution of a chat's submitted inputs. It can process more
than one input and can finish with a tool interaction still awaiting approval.
_Avoid_: Message when referring to the whole execution.

**Task**: A unit of background work with a lifecycle and required capabilities,
such as generating a chat response, processing a file, or transcribing audio.
_Avoid_: Activity or message batch for a worker's unit of work.

**Worker**: An executor that claims tasks of a supported type when it has the
required capabilities.
_Avoid_: Agent or machine service for a task executor.

## Machine operation

**Machine service**: The supervisor on a machine that owns its selected services
and synchronizes applicable artifacts.
_Avoid_: Unqualified service when discussing individual managed processes too.

**Service role**: A configured responsibility of a machine, such as Core,
Supabase, Ollama, document extraction, or MLX transcription.
_Avoid_: Workspace role or agent role for a machine's responsibilities.

**Core**: The service role comprising the web application, realtime server, and
HTTPS proxy.

**Artifact**: A published XRAG package available for distribution, such as a
model, resource, or software update.
_Avoid_: Chat output when discussing the artifact catalog.
