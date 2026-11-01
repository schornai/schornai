# Security review and dependency update — 2026-10-18

Scope: merge fetched `github/dev` (`bb7a394783bb191739da63b25751ec04d9129790`)
into `chores/security`, preserving the security boundaries from `f1c037c0`.
Review covered the merged authorization, workspace and SSO roles, recovery keys,
realtime workers, file operations, mounted paths, deployment helpers and declared
npm, Python, binary and active container dependencies. Validation used source
inspection and local regression checks, including a disposable database.
Deployment and production database migrations remain operator tasks.

## Additional corrections

- Save external-model connection metadata and credentials in a single database
  transaction, locking the model during edits. Reads use one joined snapshot so
  concurrent edits cannot combine an old endpoint with a new secret. SQL tests
  inject credential-write failures and verify rollback; mutation RPCs are
  executable only by the service role after application authorization. A real
  PostgREST/Supabase roundtrip also verified 40 concurrent reads during 20 edits,
  blank-key retention and anonymous denials.
- Normalize Unicode and forbidden characters **before** interpreting path
  separators/dot segments and choosing a mount. Previously a path containing
  fullwidth dots could turn into `..` after mount selection and escape its base.
  File mutations reject these disguised traversal segments. Regression tests
  cover fullwidth dots/slashes and dot segments formed by character removal.
- Re-check read-only mounts in the write tool's execution handler. SDK approval
  is not a substitute for an authorization check.
- Replace newly merged placeholder worker tokens in file editing, processing,
  transfers and conversation attachments with the configured server credential.
  Tests verify authorization precedes privileged connections, the correct secret
  is passed and missing secrets fail closed.
- Preserve verified SSO identity matching and strongest-role accumulation while
  merging the workspace-administrator mappings. Both the identity-forgery tests
  and the new workspace-role tests remain in the suite.
- Supply the missing Kong startup script. It validates key characters and
  performs literal substitutions without evaluating configuration as shell code.
  Configuration parsing and the real entrypoint were exercised in Kong 3.9.4.
- Call the migration CLI directly without debug logging: `npm run` previously
  printed the database DSN/password as part of its command. A subprocess test
  verifies argument forwarding and absence of the password from output.
- Remove vendored jsrsasign 11.1.0 and its embedded CryptoJS. Supabase HS256 API
  keys now use Node's native HMAC implementation; independent JOSE verification
  tests cover role, issuer, expiry and rejection with a different key.
- Make the external-model credential migration compatible with PostgreSQL 15 by
  removing the PostgreSQL-17-only MAINTAIN privilege. All other required grants
  remain. No tables or application types change as a result of that grant correction.
- On PostgreSQL 17+, revoke the MAINTAIN privilege inherited by API roles from
  the original blanket table defaults, including defaults for future tables.
  The guarded migration also runs on PostgreSQL 15. SQL regression checks cover
  the effective privileges, which the standard information-schema view omits.
- Request Tika 4's native Markdown from `/tika/md`: the former HTML Accept header
  produced HTTP 406. Both extraction clients use the Markdown response directly;
  the Domino/Turndown conversion and its dependencies have been removed. Live
  HTML and DOCX checks cover tables and list content; regression tests preserve
  the native response, cancellation, empty results and non-ASCII text.
- Keep bundled container versions equal to Compose and stop including the unused
  legacy Supabase Realtime image. A regression test protects this packaging
  invariant. The migration image now installs from its own npm lockfile; its separate npm
  audit reports zero known vulnerabilities.

German documentation was reviewed for mount restrictions, server credentials and
runtime upgrade requirements. Dependency/tooling changes otherwise preserve user
workflows. No seed data changes are required.

## Dependency inventory

All directly declared npm packages were checked against the public registry and
updated to the latest stable compatible releases, with the lockfile refreshed.
Highlights: React 19.3.1, Supabase JS 2.118.0 / SSR 0.12.7, Hocuspocus 4.7.1,
AI SDK 7.0.143, Electron 44.9.0, Forge 8.0.1, Vite 8.3.4, Storybook 10.6.2,
Playwright 1.64.1 and Vitest 5.0.5. Next 16.4.2 was already current.
Vite's JSX transform configuration was migrated to Oxc.

TypeScript stays on 6.0.3 where the ESLint parser's peer contract requires
`<6.1.0`; supported workspaces use 7.0.2. No forced peer overrides were added.
Node remains on the maintained 24 LTS line at 24.22.0 rather than changing runtime
major. Download URLs for Node, Ollama 0.40.6, FFmpeg 9.0.2, Colima 0.10.3,
Lima 2.2.1, Docker 29.9.1 and Compose 5.6.0 were checked successfully.

Active image updates: Kong 3.9.4, GoTrue 2.197.0, PostgREST 16.4, Storage 1.83.5,
imgproxy 4.0.18, postgres-meta 0.100.0, Supavisor 2.9.13, Tika 4.1.0-1-full and
Nginx stable 1.30.6-alpine. PostgreSQL is updated within major 15 to 15.19.0.004;
an existing data directory must not be pointed at a different database major.
Supabase migration CLI is 2.121.0. Every active container tag was verified for
AMD64 and ARM64 availability. GitHub Actions already use the current v7 major
tags and were checked without changing their permissions.

Python: coverage updated to 7.16.2. MLX Whisper 0.4.3 is current. The actual
Python 3.13/macOS transcriber environment was upgraded, including PyInstaller
6.22.3, MLX 0.32.4 and pip 26.2.1. Both a fresh resolution of the 38 transcriber
dependencies and the installed environment pass `pip-audit` with zero known
findings; `pip check` also passes. The install script now upgrades pip and
transitive dependencies, so existing environments receive these fixes too.
A real ML transcription model was not exercised.

## Verification

- Complete Node 24.22 `npm test`: 139 JavaScript test files / 1,771 tests and
  seven Python tests pass. The complete suite is run again after final formatting
  before the merge commit; no filtered suite substitutes for that check.
- All repository migrations and seven SQL regression scripts pass on isolated
  databases using PostgreSQL 17.11 and PostgreSQL 15.19. The configured user's
  database was not reset or migrated. Supabase security advisors report no issues
  on the isolated PostgreSQL-17 database.
- Both generated database type files were regenerated together with
  `npm run supabase:types` against the isolated database.
- Next production build, web/realtime/transcriber application type checks and
  both Electron macOS ARM64 package builds pass. Electron apps were not launched
  or published. Realtime and macOS Transcriber Rollup bundles build with explicit
  application TypeScript configurations. The Transcriber bundler now handles the
  updated SDK's CommonJS/JSON dependencies. Its Python executable also builds
  and the packaged `--help` smoke test passes.
  Realtime keeps its intentional external imports; the real production Docker
  image builds and all 35 external runtime modules load inside it.
- Storybook builds, separate type checks and coverage inventory pass (335 custom
  component exports). All 4,864 Linux ARM64 visual cases are covered across runs:
  the long run completed 3,666 cases successfully before local VM memory pressure
  required stopping it. All 1,198 failed, possibly in-flight or remaining cases
  then passed in six smaller single-worker runs, with no skipped cases or
  snapshot updates during those verification runs. Four Sidebar baselines were
  updated beforehand after inspecting the Lucide Apps icon change in both themes.
  The transient AudioRecorder difference needed no baseline change. This was not
  one uninterrupted full-suite visual run.
- The running Next app was checked via its MCP endpoint and agent-browser:
  compilation diagnostics were empty; an authenticated local dashboard and the
  seeded document file listing rendered. The sign-in page still emits an existing
  Cache Components instant-navigation warning for uncached profile access.
  Full live SAML and end-to-end worker processing were not exercised.

## Remaining findings and limits

- Production npm audit reports **zero known vulnerabilities**. Full npm audit
  still reports nine high-severity dependency nodes rooted in the development-only
  [braces stack-exhaustion advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm),
  for which upstream publishes no fixed release. The finding is not suppressed.
  Development tooling must process trusted patterns/repositories only.
- XRAG bundles still need a protected release-signing and trust-key distribution
  process. The checksum manifest shipped inside a bundle cannot authenticate its
  publisher. Only globally authorized administrators can install updates; use
  independently verified trusted sources. No signing key was invented or silently
  trusted during this task.
- No complete container OS/host/firmware vulnerability scan, historical Git secret
  audit, real model inference, live external identity-provider test or complete
  fresh-box deployment was performed. Updated tags and successful local checks
  do not prove a deployed installation is secure. Existing credentials and
  sessions were not rotated.
- The standalone `packages/realtime` TypeScript project reports errors
  in unused legacy chat/embedding modules and external-model response typing.
  The application TypeScript checks pass; these legacy errors are not hidden by
  weakening compiler settings.

Upstream compatibility references: [Vite 8 migration](https://vite.dev/guide/migration),
[Kong upgrades](https://developer.konghq.com/gateway/upgrade/),
[imgproxy 4.0.18 fixes](https://github.com/imgproxy/imgproxy/releases/tag/v4.0.18),
[Tika 4.1](https://tika.apache.org/4.1.0/index.html).
