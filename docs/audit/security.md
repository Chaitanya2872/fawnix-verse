# Security Findings

> **Action required before other work.** The items below are exploitable with information that
> is already public in the repository.

Verified against `git` on 2026-07-14.

---

## <a id="1"></a>1. P0 — Live Gemini API keys committed to git

**File**: `ml/speech-to-text-service/.env.example` (tracked in git; confirmed via
`git ls-files`). It contains **two real Google/Gemini API keys** (`GEMINI_API_KEY`,
`GEMINI_API_KEYS`, both live `AIzaSy…` values), present across the repo's history.

**Impact**: Anyone with repo access (or anyone the history leaks to) can use the keys, running
up billing and quota against the owner's Google account.

**Fix**
1. **Rotate/revoke both keys now** in Google Cloud.
2. Remove the values; replace with empty placeholders (as the root `.env.compose.example`
   already does for these vars).
3. **Purge from history** (`git filter-repo` or BFG) — deletion in a new commit is not enough;
   the keys remain in every prior commit.
4. Add a secret scanner (gitleaks/trufflehog) to CI to prevent recurrence.

> Two other `.env.example` files are tracked (`.env.compose.example`, `PRD/.env.example`) but
> keep these secret vars **empty** — those are fine as templates.

---

## <a id="2"></a>2. P0 — Usable default secrets and credentials

Every service `application.yml` and both compose files ship working fallback secrets:

| Variable | Committed default |
|---|---|
| `JWT_SECRET` | `change-this-local-dev-secret-change-this-local-dev-secret` |
| `INTERNAL_SERVICE_SECRET` | `fawnix-internal-secret` |
| `POSTGRES_PASSWORD` | `postgres` |
| `MINIO_ROOT_PASSWORD` | `minioadmin` |
| `DEV_ADMIN_PASSWORD` | `Admin@123` (identity-service) |

**Impact**: If any of these env vars is not overridden at deploy time (a CI hiccup, a manual
`docker run`, a forgotten override), the service boots with **publicly known** values. With the
default `JWT_SECRET`, an attacker can **forge valid tokens** for any user; with
`DEV_ADMIN_PASSWORD`, they can log in as admin.

**Fix**
- Remove the insecure defaults. Make the secrets **required**: bind them via `@Validated`
  `@ConfigurationProperties` with `@NotBlank`, so a service with no real secret **fails to
  start** instead of starting insecurely.
- Give each service its **own** DB user/password and MinIO service account (today all share the
  Postgres superuser and MinIO root keys — see [infrastructure](./infrastructure.md)).
- Gate `DEV_ADMIN_*` seeding behind an explicit non-prod profile.

---

## <a id="3"></a>3. P0 — Hardcoded ngrok URL and demo credentials in the VMS module

- `src/modules/visitor management/services/apiConfig.ts` — a developer's personal **ngrok
  tunnel URL** is checked in as the fallback API base
  (`https://5d7e-122-164-68-247.ngrok-free.app`).
- `src/modules/visitor management/pages/Login/loginpage.tsx` — hardcoded demo credentials
  (`admin` / `secret`) used to pre-fill and shown on screen.
- `authService.ts` sends `ngrok-skip-browser-warning: true` on every request.

**Impact**: The tunnel URL points app traffic at an uncontrolled endpoint (and will silently
break when the tunnel dies). Hardcoded credentials normalize a known password and can work
against a real backend if the demo user exists.

**Fix**: Remove the ngrok fallback and the hardcoded credentials; require a real
`VITE_*` base URL; delete the `ngrok-skip-browser-warning` header. See the
[VMS section of the frontend audit](./frontend.md#vms) for the broader integration problem.

---

## <a id="4"></a>4. P0 — VMS "offline demo" mode forges a session

`src/modules/visitor management/services/authService.ts` — on network failure the login path
silently creates a fake session (an `offline-demo-token`) and treats the user as authenticated.
Several VMS services also fall back to cached/demo data with `console.warn("[offline] …")`.

**Impact**: Auth failure becomes auth **success**. In production this is an authentication
bypass: a user who cannot reach the backend is granted a local "logged-in" state.

**Fix**: Remove the offline/demo fallback from production code, or guard it behind an explicit
build-time flag that is off in all deployed builds. Auth failures must fail closed.

---

## <a id="5"></a>5. P1 — Containers run as root

Neither `backend/Dockerfile` nor `ml/speech-to-text-service/Dockerfile` sets a `USER`. Every
Java service and the Python service run as **root** inside their containers. A container escape
or RCE therefore starts with root. **Fix**: add a non-root user in each runtime stage
([DevOps standards](../coding-standards/docker-devops.md#1-dockerfiles)).

---

## <a id="6"></a>6. P1 — Maven build disables TLS verification

`backend/Dockerfile` passes `-Dmaven.wagon.http.ssl.insecure=true
-Dmaven.wagon.http.ssl.allowall=true`, disabling certificate validation for dependency
downloads — a **supply-chain** risk (MITM can inject artifacts). **Fix**: remove these flags
and fix the underlying certificate/proxy problem.

---

## <a id="7"></a>7. P1 — CI/CD security gaps

`.github/workflows/deploy-ec2.yml` uses `StrictHostKeyChecking=no` and
`UserKnownHostsFile=/dev/null` (MITM risk on the deploy connection), runs as root on the host,
and has no test/scan gate. Details in [infrastructure](./infrastructure.md#cicd).

---

## <a id="8"></a>8. P2 — Token storage in `localStorage`

The main app stores access/refresh tokens in `localStorage` (`fawnix.accessToken`,
`fawnix.refreshToken`), which is readable by any XSS. For an ERP handling business data,
prefer `httpOnly`, `Secure`, `SameSite` cookies for the refresh token. Track as a hardening
item, not an emergency.

---

## <a id="9"></a>9. P2 — Shared datastore credentials

All services connect to Postgres as the single `postgres` superuser, and CRM/recruitment use
the MinIO **root** keys as S3 credentials. A SQL injection or leak in **one** service exposes
**all** databases/buckets. **Fix**: per-service DB roles (least privilege) and scoped MinIO
service accounts.

---

## Secret-handling policy (going forward)

- `.env.example` files contain **placeholders only** — never real values.
- No usable default for any secret; required secrets fail startup if unset.
- Secrets injected at runtime from a secret store; never baked into images or committed config.
- CI runs a secret scanner on every PR.

See [DevOps standards §3 (Secrets)](../coding-standards/docker-devops.md#3-secrets).
