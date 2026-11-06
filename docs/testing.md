# Testing

Run commands from the repository root after `npm ci`. The contribution
requirements live in [AGENTS.md](../AGENTS.md); this guide explains how to run the
individual validation layers.

## Full suite

```sh
npm test
```

Requires Node.js 24+ and Python 3. The runner checks German/English translation
parity, runs all Vitest tests under `tests`, `apps`, and `packages`, then runs the
Python unit tests. Tests use model mocks, local HTTP/WebSocket servers, and Yjs
documents; no production services or API keys are required. Local test ports must
be available. Set `AIBOX_TEST_PYTHON` to select a Python interpreter; otherwise
the runner prefers `.test-venv` when present, then system Python.

`npm run test:watch` is useful while iterating. Before every commit, run the full
`npm test` after formatting and all final edits. Filtered tests do not replace it.

`npm run i18n:check` runs the translation check on its own without changing files.
German/English differences in files, keys, or value types fail the check. Missing
or invalid secondary translations produce warnings; locale-specific plural forms
can also produce warnings. Secondary languages are updated only when explicitly
requested, and missing entries fall back to German at runtime.

## Coverage

```sh
python3 -m venv .test-venv
.test-venv/bin/python -m pip install -r tests/requirements.txt
npm run test:coverage
```

This runs the full suite with JavaScript and Python coverage. The JavaScript gate
requires 90% of lines, statements, functions and branches, plus 90% lines per
workspace. Python requires 90%. Reports are written to `coverage/` and
[`reports/coverage.md`](../reports/coverage.md), including failures.

The JavaScript scope follows production application imports and the separately
deployed machine service. Stories, fixtures inside Storybook directories, tests,
generated declarations and build configuration are not production coverage.
`npm run test:scope` regenerates the dependency inventory and unused-code review
candidates; tests cannot make unused production code appear reachable.

## SQL regressions

```sh
npm run test:sql
```

Requires Node.js 24+, Docker and network access for the pinned Supabase CLI and
database image. The runner creates a uniquely named, disposable local database,
applies the complete migration sequence and seed, then executes every `.sql`
file in [`supabase/tests`](../supabase/tests). Any SQL error fails the run.

The runner uses its own project ID, port and work directory under `.service-dev`;
it neither loads application credentials nor links to a hosted database. It
removes only its own containers and volumes after success, failure or a handled
interrupt. Cleanup failure also fails the run and prints the retained project
configuration for manual recovery. SQL regressions are separate from `npm test`.

## Installed PostgreSQL upgrades

The database entrypoint's failure cases run in the full suite. To additionally
verify the real PostgreSQL image and Docker Compose replacement of a running
legacy database, run:

```sh
SCHORNAI_TEST_POSTGRES_UPGRADE=1 node_modules/.bin/vitest run tests/postgres-upgrade.integration.test.ts
```

This requires Docker Compose and the pinned `supabase/postgres:15.19.0.004` image.
The test creates a unique disposable project and a small fixture directory in
the checkout (so Colima can access it). It verifies preserved rows, the new data
location, restart without reimporting stale data, source-content preservation,
and the actual health check. Cleanup removes only that test project's containers,
volumes and fixture data. The installed machine service and database are not used.
The image uses a vanilla test cluster with extension preloading disabled; full
Supabase schema migrations remain a separate validation layer.

## Storybook

Storybook runs independently of the application services:

```sh
npm run storybook:web       # http://localhost:6006
npm run storybook:ui        # http://localhost:6007
npm run storybook:admin     # http://localhost:6008
npm run storybook:build
npm run storybook:typecheck
npm run storybook:check
```

The three books cover web feature components, shared custom UI components, and
the Mac admin interface. Original shadcn primitives and pure hooks/utilities are
excluded from the UI component inventory. Mac admin stories use sample data and
do not start machine services. The toolbar supports light/dark themes, and the
web and admin books also support German/English.

The web application's TypeScript check excludes Storybook. Run both
`storybook:typecheck` and `storybook:check` for UI or context/provider changes,
and add stories for new custom components and meaningful states.

### Fixtures and server boundaries

Web stories render the real components and Tailwind styles. Server data, actions,
uploads, and WebSocket connections are mocked at their boundaries through
[`server-boundaries.json`](../apps/web/.storybook/server-boundaries.json) and its
`server-mocks/` modules. Reuse the existing action-hook mocks.

Context hooks use spy mocks and sample data from
[`context-fixtures.ts`](../apps/web/.storybook/context-fixtures.ts). Override them
per story with `parameters.contextFixtures`. `parameters.scenario` supports
`default`, `empty`, `pending`, `error`, and `success`; inputs with setters remain
interactive. `parameters.errorLogs` selects error-log states, and
`parameters.serviceFixtures` overrides server results by function name, such as
`getCurrentUserConfigFavorites`. Keep pure sample data separate from transport
mocks. Add `play` functions for states reached by opening or selecting controls.

### Browser interactions

With a Storybook server running:

```sh
npx playwright install chromium
npm run storybook:test
STORYBOOK_URL=http://127.0.0.1:6007 npm run storybook:test
```

The runner renders stories and executes their `play` functions. Rendering and
interaction errors fail the run. The accessibility addon's manual panel checks
are separate from this browser test.

| Variable                           | Purpose                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| `STORYBOOK_BROWSER_CHANNEL=chrome` | Use installed Chrome.                                                               |
| `STORYBOOK_FILTER`                 | Select story IDs with a regular expression.                                         |
| `STORYBOOK_TAG`                    | Filter tags, such as `async-component` for server components.                       |
| `STORYBOOK_REPORT`                 | Write a JSON report to this path.                                                   |
| `STORYBOOK_ISOLATED=1`             | Load each story in a fresh page instead of switching through the Storybook channel. |
| `STORYBOOK_WORKERS`                | Set parallel browser pages; default 3.                                              |

## Visual regression tests

```sh
npm run storybook:visual
npm run storybook:visual:report
```

The default runner uses Docker with the Playwright image matching the installed
version, on Linux ARM64, just like CI. Docker must be running; x86 hosts need
ARM64 emulation. `storybook:visual` builds all three books unless
`STORYBOOK_VISUAL_SKIP_BUILD=1` is set.

The tests capture full-page light/dark screenshots at 1280 × 900 CSS pixels,
including portals. Web stories use German. Dates, timezone, and animations are
fixed; fonts and images finish loading before capture. Story interactions run
before screenshots, and hover/focus stories exercise the actual browser state.
Rendering and interaction errors fail independently of screenshot comparison.

Baseline PNGs live in [`tests/visual/__screenshots__/linux`](../tests/visual/__screenshots__/linux).
Missing baselines and unexpected visual changes fail the comparison.

### Selecting and updating baselines

Include indirect consumers of changed shared components when selecting stories.
First list the matched tests to check the selection:

```sh
STORYBOOK_FILTER='ui-buttonaction--' npm run storybook:visual -- --list
STORYBOOK_VISUAL_SKIP_BUILD=1 STORYBOOK_FILTER='ui-buttonaction--' npm run storybook:visual
```

For an intentional appearance change, inspect the actual screenshots first. Then
update only the affected baselines and rerun the same selection without updates:

```sh
STORYBOOK_VISUAL_SKIP_BUILD=1 STORYBOOK_FILTER='ui-buttonaction--' npm run storybook:visual:update
STORYBOOK_VISUAL_SKIP_BUILD=1 STORYBOOK_FILTER='ui-buttonaction--' npm run storybook:visual
```

Commit reviewed baselines with the change. New stories need baselines too;
removed stories may leave obsolete files to remove. Never accept rendering or
interaction failures as expected appearance changes.

`STORYBOOK_VISUAL_BOOK=ui` selects one book; `-- --project=dark` selects a theme.
`STORYBOOK_VISUAL_WORKERS` controls parallelism (default 4). Skip the build only
when the static builds are current. `STORYBOOK_VISUAL_NATIVE=1` is useful for
local investigation, but do not generate Linux CI baselines with native macOS
screenshots.

## CI

The [test workflow](../.github/workflows/test.yml) runs independent jobs for:

- The complete JavaScript/Python suite with coverage gates on Node.js 26 and
  Python 3.15; coverage reports are uploaded even when a gate fails.
- Production builds of the web app, realtime app and CLI/service, plus type
  checks for the two desktop applications. The web build uses the same non-secret
  metadata placeholders as its Dockerfile.
- SQL regressions against a newly created disposable database.

The separate
[Storybook workflow](../.github/workflows/storybook-visual.yml) runs the type and
coverage checks and distributes visual tests across four Linux ARM64 jobs. Its
reports and diffs are uploaded as artifacts; CI does not update baselines.

Report each validation layer separately in pull requests, including checks that
could not run. A successful full test suite does not imply Storybook validation
has passed.
