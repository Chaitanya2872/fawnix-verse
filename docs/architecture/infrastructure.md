# Infrastructure & Deployment

How Fawnix Verse is built, packaged, and deployed.

---

## 1. Topology

The entire platform runs as a **single Docker Compose stack on one EC2 host**. There is no
orchestrator (Kubernetes/Swarm), no autoscaling, and no multi-node HA.

```
EC2 host
 └─ docker compose (fawnix-network, single bridge)
     ├─ Caddy (prod only) ── TLS ──► frontend + api-gateway
     ├─ frontend (nginx serving built SPA)
     ├─ api-gateway :8080
     ├─ eureka-server :8761
     ├─ 15 domain services :8081–8095
     ├─ postgres :5432   (named volume postgres-data)
     ├─ redis :6379
     ├─ minio :9000/9001 (named volume minio-data)
     ├─ speech-to-text-service :8000
     └─ one-shot: db-bootstrap, minio-bootstrap
```

---

## 2. Compose files (two, drifted)

| | `compose.yml` (root) | `PRD/compose.yml` |
|---|---|---|
| Intended for | Local dev / full stack | Production on EC2 |
| Services | 24 | 16 (subset) |
| TLS | none | Caddy (`caddy:2`, ACME) |
| Frontend | nginx (built image) | **Vite dev server** mounted from source ⚠ |
| Postgres host port | 5432 | 5433 |
| MinIO host ports | 9000/9001 | 9002/9003 |
| Redis | present | **absent** (notifications also absent) |
| Seed default | `APP_SEED_ENABLED=true` | `false` |
| DBs bootstrapped | 15 | 8 |

The two files have diverged materially. Notably, PRD serves the frontend through a **Vite dev
server**, not the production nginx build — see the [infrastructure audit](../audit/infrastructure.md).

---

## 3. Images & Dockerfiles

| Image | Base | Multi-stage | Notes |
|---|---|---|---|
| `backend/Dockerfile` (all Java services, parameterized by `MODULE`) | `maven:3.9.9-eclipse-temurin-17` → `eclipse-temurin:17-jre-alpine` | yes | `-DskipTests`; Maven SSL verification disabled; runs as **root**; retry loop for flaky downloads. |
| `docker/frontend/Dockerfile` | `node:20-alpine` → `nginx:1.27-alpine` | yes | `npm ci`; good layer caching; `VITE_API_URL` baked at build time. |
| `ml/speech-to-text-service/Dockerfile` | `python:3.11-slim` | no | runs as **root**; `__pycache__` copied into image. |

All base images use floating minor tags (not pinned by SHA). JVM memory is bounded only by
`JAVA_TOOL_OPTIONS` (`-Xmx256m`), not by Docker resource limits.

`.dockerignore` excludes `node_modules`, `dist`, `.git`, `target/`. It does **not** exclude
`.env*`, `PRD/`, `graphify-out/`, or plan `.md` files.

---

## 4. Data & storage bootstrap

- **Postgres** — `docker/postgres/bootstrap/bootstrap-databases.sh` creates one database per
  service (idempotent), driven by `SERVICE_DATABASES`. All services connect as the single
  `postgres` superuser (no per-service roles). A second unused `create-databases.sql`
  (5 DBs) also exists.
- **MinIO** — `docker/minio/bootstrap/create-buckets.sh` creates buckets from `MINIO_BUCKETS`
  (default single bucket `fawnix-objects`). Services use the MinIO **root** credentials as
  access keys.

---

## 5. Networking & routing

```
Prod:  client → Caddy :443
                  /api/*  → api-gateway:8080
                  /*      → frontend:80 (nginx; also has a redundant /api proxy)
Dev:   browser → vite :5173
                  /api/*  → vite proxy → gateway (localhost or api-gateway in Docker)
```

`vite.config.ts` auto-detects Docker (`/.dockerenv`) and rewrites the proxy host. Deployment
hosts (`fawnixverse.acstechnologies.co.in` and two EC2 IPs) are **hardcoded** in
`vite.config.ts` `allowedHosts`, in each service's CORS config, and in compose env — so an IP
change touches 20+ files.

---

## 6. CI/CD (`.github/workflows/deploy-ec2.yml`)

- **Trigger**: push to `master` or manual dispatch.
- **Pipeline**: checkout → SSH to EC2 → `docker compose up --build`.
- **No build/test/lint gate**, no image registry, no staging, no rollback.
- SSH uses `StrictHostKeyChecking=no` / `/dev/null` known-hosts.
- Deploy runs as root on the host; health "check" is `docker ps | grep prd-` after `sleep 10`.

Every push rebuilds all 24 images from scratch on the production host.

---

## 7. Observability

- Spring Boot Actuator `health,info` per service; gateway also exposes `gateway`.
- **No** Prometheus/Grafana, **no** tracing (Zipkin/Jaeger), **no** log aggregation.
  Operations rely on `docker ps` and `docker logs`.

---

## 8. Secrets & config surface

Config is env-driven (`${VAR:-default}`), but **defaults are unsafe** and one file contains
**live keys**:

- `ml/speech-to-text-service/.env.example` — committed **real Gemini API keys** (tracked in
  git). **Rotate immediately.** See [security findings](../audit/security.md).
- Default `JWT_SECRET`, `INTERNAL_SERVICE_SECRET`, `POSTGRES_PASSWORD=postgres`,
  `MINIO_ROOT_PASSWORD=minioadmin`, `DEV_ADMIN_PASSWORD=Admin@123` shipped as fallbacks.

The full risk register is in the [infrastructure audit](../audit/infrastructure.md).

---

## 9. Scripts

- `scripts/import_inventory_products.py` — converts an Excel product template into SQL INSERTs
  for the inventory `products` table (manual seeding utility).

See the [Docker/DevOps coding standards](../coding-standards/docker-devops.md) for target
practices.
