# Security

## Reporting a vulnerability

Please email [thomas@schorn.ai](mailto:thomas@schorn.ai) with the subject
`[schorn.ai security]` to report a suspected vulnerability privately.
Do not disclose exploit details or credentials in a public issue or pull request.

Include the affected version or commit, the deployment type, steps to reproduce,
and the potential impact. A minimal proof of concept using synthetic data is
helpful. Share only information needed to investigate; redact tokens, passwords,
user data, and private documents. If a secret was exposed, revoke or rotate it
at its source rather than sending it in the report.

Reports are handled by the project maintainer on a best-effort basis. There is
no guaranteed response time or paid bug bounty. Please coordinate public
disclosure with the maintainer so a fix and operator guidance can be prepared.

## Supported versions

Security fixes target the current development version. There is no maintained
security backport policy for older releases. Operators should review release
changes, back up their instance, and update the application and bundled runtime
components together.

## Running an instance

The [security and operations guide](docs/de/hilfe/sicherheit-und-betrieb.md)
covers credentials, TLS, backups, updates, and trusted setup bundles. Local
development seeds contain public demo credentials and are intended only for
isolated development. The dated [October 2026 security review](docs/security-review-2026-10-18.md)
records its scope and remaining findings; it is not a certification of a current
deployment.
