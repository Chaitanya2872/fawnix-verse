# DevOps Coding Standards — Docker, Compose, CI/CD

Applies to `compose.yml`, `PRD/compose.yml`, `docker/`, `backend/Dockerfile`,
`ml/**/Dockerfile`, and `.github/`.

---

## 1. Dockerfiles

- **Multi-stage** builds: build stage (JDK+Maven / Node) → slim runtime (JRE / nginx). Never
  ship the JDK or build toolchain in the runtime image.
- **Run as non-root.** Add a dedicated user and `USER` it. Today all Java and Python
  containers run as root — the single highest-value Dockerfile fix.
- **Pin base images by digest** in production (`@sha256:...`), not floating minor tags.
- **Layer caching**: copy dependency manifests (`pom.xml` / `package.json`) and resolve
  dependencies before copying source.
- Java runtime flags: `-XX:MaxRAMPercentage=75.0`, `-XX:+UseG1GC`,
  `-XX:+ExitOnOutOfMemoryError` (respects container limits) instead of a fixed `-Xmx`.
- **Never disable TLS verification** in the build (`-Dmaven.wagon.http.ssl.insecure=true` is a
  supply-chain risk — remove it and fix the underlying cert/proxy issue).
- Don't copy build artifacts like `__pycache__` into the image; exclude via `.dockerignore`.

_Sources: <https://bell-sw.com/blog/docker-image-security-best-practices-for-production/>_

---

## 2. Docker Compose

- **Healthchecks on every long-running service** (Spring: `curl -f /actuator/health`;
  Postgres: `pg_isready`; Redis: `redis-cli ping`), with `start_period` for JVM warmup.
- **`depends_on` with conditions** — `condition: service_healthy` /
  `service_completed_successfully`. Bare `depends_on` only waits for container start.
- **Resource limits** on every service (`deploy.resources.limits.{cpus,memory}`). Today there
  are none — one runaway service can take down the host.
- **Restart policy** `unless-stopped` for services, `"no"` for one-shot jobs. (The root
  `frontend` currently has none.)
- **Log rotation** (`json-file`, `max-size`, `max-file`) to prevent disk exhaustion.
- Pin third-party images (`minio`, `mc` currently use `:latest`).
- Remove the obsolete `version:` key (Compose V2 ignores it).
- **Prod must serve the built frontend image**, not a Vite dev server (current PRD gap).
- Keep dev and prod compose files **in sync** or generate one from the other with overrides
  (`compose.override.yml`). The two files have drifted (different service sets, DB counts).

_Sources: <https://docs.docker.com/reference/compose-file/services/>_

---

## 3. Secrets

- **Never commit secrets** — not real keys, not usable defaults. `.env.example` files must
  contain **placeholders only**. (Currently `ml/.../.env.example` holds live Gemini keys —
  rotate and purge from history.)
- Dev: file-based Compose secrets (`secrets:` + `*_FILE` env), with the secret files
  git-ignored.
- Prod: Docker Swarm secrets / cloud secret manager (AWS Secrets Manager, Vault). Inject at
  runtime.
- Build-time secrets via BuildKit `--mount=type=secret` — never `ARG`/`ENV`.
- Give each service its **own** DB user and object-storage credentials (today all share the
  Postgres superuser and MinIO root keys).

_Sources: <https://blog.gitguardian.com/how-to-handle-secrets-in-docker/>_

---

## 4. CI/CD

- **Quality gates before deploy** (branch-protected):
  1. `tsc --noEmit`
  2. `eslint --max-warnings 0`
  3. `prettier --check`
  4. `mvn spotless:check`
  5. `mvn verify` (build + tests)
  6. `commitlint` on the PR
- **Build images in CI, push to a registry, deploy the tagged image.** Do not `--build` on the
  production host (current approach: no gate, builds all 24 images on EC2 every push).
- Add a **staging** environment; don't deploy `master` straight to prod.
- Provide a **rollback** path (previous image tag).
- Fix CI SSH hardening: use known-hosts, not `StrictHostKeyChecking=no`.
- Path-filter the monorepo so only changed apps/services rebuild (`dorny/paths-filter`),
  remembering to include shared deps.

_Sources: <https://generalreasoning.com/blog/2025/03/22/github-actions-vanilla-monorepo.html>_

---

## 5. Observability (to add)

- Expose `/actuator/prometheus` (micrometer) and scrape with Prometheus; dashboards in
  Grafana.
- Centralize logs (Loki / ELK) instead of `docker logs`.
- Add distributed tracing (Micrometer Tracing + Zipkin/Tempo) across the gateway and services.

Current observability is `docker ps` + `docker logs` only.
