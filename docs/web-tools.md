# Web tools: implementation reference

For UI configuration and permissions, see the
[German web-access guide](de/agent/edit/web.md). This reference preserves the
processing and provider details previously documented in the root README.

## Fetch

Each agent role independently enables fetch and search and may require approval
before each call. Fetch supports public HTTP(S) addresses or a host allowlist.
Entries contain a hostname without a protocol, path, or port: `example.com`
matches that host, while `*.example.com` matches only its subdomains. An empty
allowlist denies every request. Every redirect is checked again.

Localhost, private addresses, and internal hostnames require an exact allowlist
entry; public-web mode and wildcard entries do not allow them. DNS results are
checked before fetching and pinned for the connection. Limits are five redirects,
60 seconds for downloading, and 50 MiB per file.

By default, the original file is stored at
`/this_conversation/web/<domain>/<URL-path>`. HTML routes without a filename get
`index.html`, for example `/this_conversation/web/example.com/path/to/file/index.html`.
Query parameters and fragments are excluded. Fetching the same path again replaces
the file and refreshes its extracted text.

With a mounted document repository, `path` can select a full destination path;
read-only and write-approval rules still apply. `storage-list` and
`storage-read-file` also work without a document repository. Fetch waits up to ten
minutes for the same `process-file` or configured `transcribe` task used by normal
uploads. Tika processes HTML, PDF, and Office files. Audio/video processing needs
a transcriber selected in the agent role or document repository.

The tool result includes the extracted text or transcript in `content`, the
mounted filesystem `path`, and `storagePath` relative to the actual storage. If
processing fails, the downloaded original remains and the tool reports the
failure. Chat components show results, pending requests, errors, and sources.

## Search

Search supports [Brave](https://api-dashboard.search.brave.com/documentation/web-search)
and [Staan](https://docs.staan.ai/docs/web-search). Global administrators configure
credentials under `/settings/connections`; agent roles store only a connection
ID. Staan additionally accepts language/region settings, such as `de-de`, with
`en-us` as the default.

The realtime worker performs searches. Provider keys remain in server-side
connection storage and are excluded from model inputs, tool results, and error
messages. Static MCP headers are a separate feature: they remain part of the
agent configuration and require trusted editors.

Each page contains up to ten results; `nextOffset` requests another page. The
fetch allowlist does not constrain search requests: these are independent tools.

## Where to look and test

- [Role validation](../packages/database/src/agent/webAccess.ts)
- [Fetch implementation](../apps/realtime/src/chat/tools/web/webFetch.ts)
- [Network policy](../apps/realtime/src/chat/tools/web/networkPolicy.ts)
- [Web tool implementations](../apps/realtime/src/chat/tools/web)

The regular suite uses mocked providers and needs no API keys. It covers provider
contracts, pagination, redirects, DNS/IP access rules, response limits, aborts,
configuration, role activation, approvals, and chat/editor components. Live
provider checks require separately configured credentials.
