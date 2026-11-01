# Contributing to schorn.ai

Thanks for helping improve schorn.ai. Bug reports, focused code changes,
documentation fixes, and usability feedback are welcome. Issues and pull requests
can be written in English or German.

## Start here

1. Search the [existing issues](https://github.com/schornai/schornai/issues) before
   opening a new one. For a substantial feature or architectural change, describe
   the problem and proposed approach in an issue first.
2. Fork the repository and create a branch for your change.
3. Follow the [development guide](docs/development.md). You can run the tests and
   work in Storybook without configuring a database, model, or API key.
4. Use the [repository map](docs/architecture.md) to find the implementation and
   tests, and the [glossary](GLOSSARY.md) for project terminology.

Report suspected vulnerabilities privately using [SECURITY.md](SECURITY.md),
rather than in a public issue. Remove credentials, personal data, and private
documents from logs and screenshots before sharing them.

## Making a change

Keep each pull request focused on one problem. Describe the observable behavior
before and after the change, and add regression coverage where it protects that
behavior. Start with the nearest comparable feature and follow its conventions.

Read [AGENTS.md](AGENTS.md) before changing code: it is the authoritative guide
for application patterns, authorization, database operations, formatting,
documentation, translations, and validation. Its rules apply to human and
AI-assisted contributions alike; check for additional instructions in the area
you edit. You remain responsible for understanding and reviewing any generated
code you submit.

For user-facing changes, update the relevant [German user documentation](docs/de/index.md)
and both German and English UI translations. Other languages are maintained only
when explicitly in scope. For changes with no user documentation impact, explain
why in the pull request. Keep local configuration and credentials out of Git.

## Before submitting

After the final edits, format only the files you changed with the repository's
installed Prettier, then run the complete test suite from the repository root:

```sh
node_modules/.bin/prettier --write --ignore-unknown path/to/changed-file.ts
npm test
```

Quote paths containing spaces, parentheses, or brackets. `npm test` includes the
translation check, JavaScript/TypeScript tests, and Python tests. Run it before
every commit; a filtered run does not replace the full suite.

UI or context/provider changes also require Storybook type checks, story coverage,
and affected visual stories, including indirect consumers of changed components.
See the [testing guide](docs/testing.md) for commands and the Linux screenshot
workflow. Database SQL checks are separate from `npm test`.

In your pull request, include:

- The problem, resulting behavior, and a related issue if one exists.
- Validation you ran and its results; state any checks you could not run.
- Screenshots for appearance changes, and any setup or migration requirements.
- Documentation and translation updates, or the reason they are unnecessary.

CI runs the [test suite](.github/workflows/test.yml) and the separate
[Storybook workflow](.github/workflows/storybook-visual.yml). A passing local
`npm test` alone does not cover all CI checks. Maintainers may ask for a smaller
scope or further tests before merging.

## Working together

Be respectful and specific. Discuss the code and the problem, give actionable
feedback, and allow others time to respond. Harassment, discriminatory language,
and publishing another person's private information are not acceptable. Contact
[Thomas Schorn](mailto:thomas@schorn.ai) privately about conduct concerns.

## Contribution license

By submitting a contribution, you agree to license your original contribution
under the project's [GNU Affero General Public License, version 3 only](LICENSE)
(`AGPL-3.0-only`). You retain your copyright. Only submit material you have the
right to contribute, and preserve third-party copyright and license notices.
