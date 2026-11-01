# Security review — 2026-10-17

Scope: repository branch `chores/security`, based on local `dev` at `f9c724ea`.
This review covers application authorization, Supabase/RLS, realtime connections,
file delivery, outbound HTTP, host update helpers and dependency manifests.
Validation used local tests; the deployed box, its network and production data
were outside the scope. Deployment and database migrations remain operator tasks.

## Corrected boundaries

| Finding                                                                                               | Correction and regression coverage                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User-editable metadata could grant global administration or workspace roles                           | Access-token construction reads verified SAML identity data and administrated database roles; forged user metadata and identity mismatches are tested.                                                                                                                                                        |
| Realtime documents and task queues accepted unauthenticated connections and placeholder worker tokens | Separate server secret, verified user JWTs, document authorization, read-only subscriptions, expiry and periodic revalidation. Real WebSocket tests reject foreign documents and forged writes.                                                                                                               |
| Privileged server operations could be reached without sufficient resource authorization               | Storage mutations verify activity access or repository editor rights; activity creation validates the caller and agent/transcriber. Internal helpers are not exported as Server Actions.                                                                                                                      |
| Auth-hook requests were not authenticated                                                             | Standard Webhooks signature and timestamp verification, identity consistency, bounded bodies and fail-closed secret configuration.                                                                                                                                                                            |
| Search view could bypass underlying RLS                                                               | `security_invoker` view; restricted internal functions/table grants, trusted function search paths and pgvector moved to `extensions`. SQL tests include cross-workspace isolation.                                                                                                                           |
| Realtime document creation and ownership were separate writes                                         | Service-only transactional RPC; globally unique activity parent, concurrent-claim serialization and conflict diagnostics.                                                                                                                                                                                     |
| Uploaded HTML/SVG could execute under the application origin                                          | Attachment disposition for active formats, sandbox CSP and `nosniff`; range delivery remains available for media.                                                                                                                                                                                             |
| Redirects and upload proxy headers crossed trust boundaries                                           | Local-path redirect validation, explicit TUS header allowlists, authenticated upload requests and no upstream redirect following.                                                                                                                                                                             |
| Generic web-fetch permissions allowed access to internal addresses                                    | Public-address checks, DNS pinning and redirect revalidation. Private networks require an exact host allowlist entry.                                                                                                                                                                                         |
| Global TLS bypasses and unnecessarily exposed internal ports                                          | Certificate validation restored; gateway, database pooler, development proxy and Tika use loopback bindings; realtime container runs as `node`.                                                                                                                                                               |
| Unsafe host/update configuration                                                                      | Separate generated secrets, restrictive configuration permissions, validated site origins, bounded/status-checked update downloads, checked extraction exit status and model-path containment. Installation guidance no longer recommends a shared password, unlocked host or unrestricted passwordless sudo. |

German user documentation explains the changed permissions, file behavior, web
allowlists and [deployment requirements](de/hilfe/sicherheit-und-betrieb.md).
Internal test-tool cleanup has no user-facing behavior change.

## Dependencies

The initial npm audit reported 73 affected dependency nodes, including three
critical findings. This count includes transitive parent packages, not 73 unique
vulnerabilities. The updated production dependency graph reports zero known npm
advisories with `npm audit --omit=dev`.

Updates include Next.js 16.4.2, Electron 43.8.0, Electron Forge 8.0.1,
PyInstaller 6.22.3 and available compatible transitive fixes. The obsolete Jest
toolchain was removed from the already Vitest-tested Markdown package. Targeted
overrides select corrected KaTeX and PostCSS selector parser versions. Forge no
longer requires Git dependencies, so the blanket `allow-git=all` exception was
removed. shadcn's CLI/CSS build dependency is classified as development-only.

Relevant upstream references:

- [Next.js October security release](https://github.com/vercel/next.js/releases/tag/v16.4.1)
- [PyInstaller privileged executable advisory](https://github.com/pyinstaller/pyinstaller/security/advisories/GHSA-9fxf-4qw3-ghmr)
- [Forge 8 migration details](https://github.com/electron/forge/releases/tag/v8.0.1)

## Remaining findings and limits

- **Unpatched development dependency:** the complete npm audit still reports nine
  high-severity dependency nodes, all rooted in
  [braces stack exhaustion, GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
  The published advisory lists no patched version. It is reached through the
  Next ESLint/shadcn development toolchain. Those tools must only process trusted
  repositories, registry content and patterns. This finding is not suppressed;
  the complete audit intentionally remains nonzero.
- **XRAG update trust:** a global administrator may install executable update
  bundles. Their checksum manifest is supplied with the bundle and does not
  authenticate its publisher. Cryptographically signed releases and a protected
  signing-key distribution/rotation process are still required before treating
  untrusted update packages as safe. Only install packages from a verified source.
- **Host and containers:** no scan of a deployed host, container OS layers,
  firmware, historical Git secrets or the complete resolved Python/ML dependency
  environment was performed. The current tracked tree was checked for common
  private-key/API-key patterns; that is not exhaustive secret detection.
- **Sessions and identity providers:** existing JWTs retain their claims until
  expiry. Live SAML with an external identity provider and a fully authenticated
  end-to-end workflow against deployed services were not exercised. Existing
  installation credentials and potentially compromised sessions need operational
  review; repository changes do not rotate them.
- **Migration conflicts:** existing activities sharing an ID across different
  parents cause the migration to stop. Run
  `supabase/diagnostics/activity_parent_conflicts.sql`, determine the legitimate
  owners and resolve the records deliberately. The migration never deletes data
  to force the uniqueness constraint through.

## Verification

The database change was replayed with all repository migrations on a disposable
local database. All four SQL regression suites, a real pgvector search RPC and
Supabase security advisors passed (no warning/error findings). Both generated
TypeScript schemas were regenerated together using `npm run supabase:types`.

Runtime regression coverage includes genuine localhost WebSocket and HTTP
connections, authentication failures, read-only update rejection, expired tokens,
private-address filtering, malicious redirects, forged hook payloads and file
path escapes. Both Electron apps were packaged successfully for macOS ARM64;
neither app was launched or published. Next's running development server reported
no compilation issues and returned the expected unauthenticated rejection/status
and protection headers.

Validation results:

- Complete `npm test`: 116 JavaScript test files / 1,555 tests and all seven Python
  tests passed.
- Web application and realtime application TypeScript checks passed.
- Storybook builds and type checks passed; coverage inventory passed for 325
  custom component exports.
- Affected Linux ARM64 visual checks passed: 324 web tests covering realtime,
  chat, sidebar and storage consumers, plus 88 UI Markdown/KaTeX tests. Each
  selection was checked with `--list` first. No screenshot baseline was changed.
  The complete 4,734-case visual inventory was not run locally.
- The Storybook-only router adapter supplies the context expected by Next 16.4
  until Storybook's upstream router fixture supports it.
- The lockfile passed an offline `npm ci --dry-run --ignore-scripts --no-audit`
  consistency check.

The standalone `packages/realtime` TypeScript project still reports existing
errors in unused legacy chat/embedding code and external-model response typing;
the application check and new authentication code pass. No complete production
Next build or live authenticated deployment test was performed. The final commit
is gated on another complete `npm test` run after documentation and formatting.
