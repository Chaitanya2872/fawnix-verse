# Infrastructure Audit

Scope: `compose.yml`, `PRD/compose.yml`, `docker/`, Dockerfiles, `.github/`.
Standards reference: [docker-devops.md](../coding-standards/docker-devops.md).

---

## <a id="containers-root"></a>1. P0 — All containers run as root

Neither `backend/Dockerfile` nor `ml/speech-to-text-service/Dockerfile` sets a `USER`. Every
Java service and the Python STT service run as **root**. A container escape or app RCE yields
root inside the container. **Fix**: add a dedicated non-root user in each runtime stage.

---

## <a id="cicd"></a>2. P1 — CI/CD deploys unverified code to production

`.github/workflows/deploy-ec2.yml`:

- Trigger: **push to `master`** (or manual) → SSH to EC2 → `docker compose up --build`.
- **No test/lint/scan gate.** Nothing verifies the code before it goes live.
- **Builds all 24 images on the production host** every push (slow, resource-heavy, no cache).
- **No registry, no staging, no rollback.** A failed build leaves prod in a partial state with
  no previous image to revert to.
- **`StrictHostKeyChecking=no` + `/dev/null` known-hosts** → MITM risk on the deploy channel.
- Deploy runs as **root** on the host; the "health check" is `docker ps | grep prd-` after
  `sleep 10` — it never checks a health endpoint.

**Fix**: add quality gates (type-check, lint, format, tests) as required checks; build+push
tagged images in CI and deploy the image; add staging + rollback; pin the EC2 host key.

---

## <a id="prd-vite"></a>3. P1 — Production serves a Vite dev server

`PRD/compose.yml` mounts the source tree and runs the **Vite dev server** (HMR,
`CHOKIDAR_USEPOLLING=true`, port 5174) behind Caddy — instead of the nginx image built by
`docker/frontend/Dockerfile`. This exposes source, enlarges the attack surface, and performs
poorly under real load. **Fix**: serve the built frontend image in prod.

---

## 4. P1 — No resource limits

No `deploy.resources.limits` on any service in either compose file. JVM heap is bounded only by
`JAVA_TOOL_OPTIONS` (`-Xmx256m`), but nothing bounds CPU/memory at the Docker level, so a single
runaway container can starve the whole 24-service host. **Fix**: set `cpus`/`memory` limits per
service.

---

## 5. P2 — Dev/prod compose drift

`compose.yml` (24 services) and `PRD/compose.yml` (16 services) have materially diverged:

- PRD omits redis, notifications, forms, integration, org, approval, recruitment, analytics.
- Different host ports, health endpoints (`/actuator/health` vs `/actuator/health/liveness`),
  and seed defaults.
- **PRD `db-bootstrap` creates only 8 databases** — if any omitted service is later added to
  PRD, it will fail to start with no database.

**Fix**: derive one from the other via a `compose.override.yml`, or keep them synchronized with
a documented diff.

---

## 6. P2 — Shared datastore credentials

- All services connect to Postgres as the single **`postgres` superuser** — no per-service
  roles. SQL injection in one service = access to all 15 databases.
- CRM/recruitment use the **MinIO root** credentials (`minioadmin`) as S3 access keys — no
  bucket-scoped service accounts.

**Fix**: least-privilege DB users per service; scoped MinIO service accounts. (Cross-linked
from [security §9](./security.md#9).)

---

## 7. P2 — Image & build hygiene

- **Floating tags**: `minio/minio:latest`, `minio/mc:latest`, and minor-version tags elsewhere
  (`node:20-alpine`, `nginx:1.27-alpine`, `python:3.11-slim`, `maven:3.9.9-…`) — not pinned by
  digest, so `latest`/minor drift can change prod silently. Pin by SHA in prod.
- **Maven TLS verification disabled** in `backend/Dockerfile` (supply-chain risk — see
  [security §6](./security.md#6)).
- **`__pycache__` copied** into the STT image (build-context pollution).
- **`.dockerignore`** doesn't exclude `.env*`, `PRD/`, `graphify-out/`, or plan `.md` files —
  they're shipped in the build context.
- Root **`frontend`** service has **no `restart:` policy** (all other services use
  `unless-stopped`).

---

## <a id="observability"></a>8. P3 — No observability

Only Actuator `health,info` per service (gateway adds `gateway`). No Prometheus/Grafana, no
tracing (Zipkin/Jaeger/Tempo), no log aggregation. Production diagnosis relies on `docker ps`
and `docker logs`. **Fix**: expose `/actuator/prometheus`, add metrics + tracing + centralized
logs.

---

## 9. P3 — Hardcoded hosts/IPs spread across the repo

The prod domain and two EC2 IPs (`54.76.187.129`, `108.131.209.156`) are hardcoded in
`vite.config.ts` `allowedHosts`, every service's CORS config, and compose env
(`FRONTEND_ORIGINS`/`ALLOW_ORIGINS`). An IP change requires coordinated edits across 20+ files.
**Fix**: drive these from a single env var / config source.

---

## What's good

- Clean per-service database isolation via the bootstrap script (idempotent).
- Multi-stage builds for frontend and backend with reasonable layer caching.
- Actuator-based healthchecks on the 20 long-running backend services, with
  `depends_on: condition: service_healthy` used for ordering.
- Named volumes for Postgres/MinIO persistence.
- Caddy provides automatic TLS in prod.
- Sensible JVM memory caps via a shared YAML anchor.
