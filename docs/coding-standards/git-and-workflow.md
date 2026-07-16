# Git & Workflow Standards

Applies to the whole repository.

---

## 1. Conventional Commits

Format: `<type>(<scope>): <description>`

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`,
`revert`.

**Scopes map to the app/service directory** and are **required** in this monorepo:

```
feat(crm-service): add lead status history endpoint
fix(web-crm): stop refetching leads on window focus
chore(infra): pin minio image to a digest
docs(audit): add security findings
```

- Body explains **why**, not what.
- Breaking changes: `feat(x)!: …` or a `BREAKING CHANGE:` footer.
- The existing history already uses `feat`/`fix`/`refactor` prefixes — keep that up and add
  required scopes.

Enforce with **commitlint** (`@commitlint/config-conventional`) + a Husky `commit-msg` hook,
and a CI check on PRs.

_Sources: <https://www.conventionalcommits.org/>, <https://github.com/conventional-changelog/commitlint>_

---

## 2. Branching & PRs

- Never commit directly to `master` (it auto-deploys to prod). Use short-lived feature
  branches → PR → review → merge.
- PRs must pass all CI gates (type-check, lint, format, tests) before merge.
- Keep PRs focused; every changed line should trace to the PR's stated purpose.
- Add an ADR link in the PR when the change is an architectural decision (see §4).

---

## 3. Lint & format gates

- **Frontend**: single flat `eslint.config.js` (delete legacy `.eslintrc.cjs`), Prettier for
  formatting, run `eslint --max-warnings 0` + `prettier --check` in CI. Pre-commit via
  `lint-staged`.
- **Backend**: Spotless (`spotless:apply` local, `spotless:check` CI), optional Checkstyle.
- Fast hooks pre-commit (lint-staged / spotless); expensive checks (`tsc`, `mvn verify`)
  pre-push / CI.

_Sources: <https://advancedfrontends.com/eslint-flat-config-typescript-javascript/>_

---

## 4. Architecture Decision Records (ADRs)

- One decision per ADR. Immutable once accepted — supersede with a new ADR, don't edit.
- Location: `docs/adr/NNNN-short-title.md`. First ADR records the decision to use ADRs.
- Nygard template: **Status / Context / Decision / Consequences** (include the negatives).
- Keep them short (~2 pages). Co-locate with code so they appear in PRs and version with it.

Candidate ADRs this project should backfill: the HirePath merge, gateway-vs-per-service JWT
validation, per-service databases, the internal service-auth mechanism, and the VMS module
boundary.

_Sources: <https://adr.github.io/madr/>, <https://aws.amazon.com/blogs/architecture/master-architecture-decision-records-adrs-best-practices-for-effective-decision-making/>_

---

## 5. Repository hygiene

- `.gitignore` must actually cover generated/local artifacts. Current gaps: `.env` is listed
  twice, and tool output (`graphify-out/`), scratch debug images
  (`.tmp-contact-modal-debug.png`), and UUID `*_plan.md` files are committed.
- Planning docs belong in `docs/` (or an issue tracker), not as loose root files.
- No build artifacts, secrets, or personal tunnel URLs (ngrok) in version control.

See the [cleanup checklist](../audit/cleanup-checklist.md) for the concrete list.
