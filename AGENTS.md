# Agent Operating Instructions

These instructions apply to all work in this repository:

- **Commits**: Do not add `Co-authored-by:`, `Signed-off-by:`, or any Cursor/agent/IDE attribution to commit messages. Do not advertise the agent or tool in commits. To enforce this locally, run `./scripts/install-git-hooks.sh` once (installs a prepare-commit-msg hook that strips such lines).

- Do not install anything on the host system. Use containers for any installs.
- If any install is required, ask for approval before proceeding.
- Run tests or tooling inside containers whenever possible.
- If a command must run outside containers, only use existing folders (no new host-wide installs).
- Always check container logs after making changes, to spot errors.
- Never use `npm install`; always use `npm ci --ignore-scripts`, pin versions in package.json/package-lock.json, and avoid running scripts on install (supply chain risk).

- **Smoke tests after changes:** After any change that could affect the running app (code, config, Docker, env), run at least a quick smoke test so regressions (e.g. 503, broken routes, failed build) are caught before the user hits them. For example: hit the app URL (e.g. `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/`) or run the Puppeteer landing test (`BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:landing-version` from `front/`). If the app is not up, run `docker compose ps` and `docker compose logs --tail=50 front` (and back/haproxy as needed) to diagnose before concluding.

## Docker: status, port, and logs

When debugging the running app (e.g. frontend not loading a route, API issues):

1. **Check if containers are up and which port the app is on**
   - From the repo root: `docker compose ps`
   - The **frontend** is exposed via **HAProxy**. In the PORTS column, find the `haproxy` service: it shows `HOST_PORT->4202/tcp` (e.g. `0.0.0.0:4203->4202/tcp`). The **host port** (e.g. 4203 or 4202) is the one to use in the browser: `http://127.0.0.1:4203` or `http://localhost:4202`. The port comes from `FRONTEND_PORT` in the environment (default in docker-compose is 4202).

2. **Frontend dev server: live reload in Docker**
   - The `front` container runs `ng serve` with **`--poll 2000`** so that file changes on the host (volume `./front:/app`) are detected and the app rebuilds immediately. You should never need to rebuild the image or restart the container for frontend code changes; if the UI doesn’t update, check `docker compose logs --tail=50 front` for build errors.
   - If you still see stale frontend after editing: ensure the container was started with the current docker-compose (no cached run), then hard-refresh the browser (Ctrl+Shift+R / Cmd+Shift+R).
   - **First time after this change:** rebuild the front image so the dev server runs with `--poll`: `docker compose build front && docker compose up -d`.

3. **Review logs and last requests**
   - All services: `docker compose logs -f` (follow) or `docker compose logs --tail=100`
   - Frontend (build errors, dev server): `docker compose logs --tail=80 front`
   - Backend (API requests, errors): `docker compose logs --tail=50 back`
   - HAProxy (HTTP/WS access, redirects): `docker compose logs --tail=30 haproxy`
   - Use these to confirm the app is running, see recent requests, and spot build or runtime errors (e.g. Angular build failures in `front` logs).

## Reservation tests (Puppeteer)

Run these from the repo root or from `front/` when the app is up (e.g. on port 4203 or 4202). Chrome must be installed (e.g. `/Applications/Google Chrome.app` on macOS). Scripts auto-detect the first responding port among 4203, 4202, 4200.

**Staff flow (login → reservations → create → cancel):**

```bash
cd /path/to/pos2
source .env   # optional: provides DEMO_LOGIN_EMAIL, DEMO_LOGIN_PASSWORD
export LOGIN_EMAIL="${DEMO_LOGIN_EMAIL:-$LOGIN_EMAIL}"
export LOGIN_PASSWORD="${DEMO_LOGIN_PASSWORD:-$LOGIN_PASSWORD}"
cd front && node scripts/debug-reservations.mjs
```

Or with credentials inline (no .env):  
`LOGIN_EMAIL="user@example.com" LOGIN_PASSWORD="secret" node front/scripts/debug-reservations.mjs`

**Public flow (no login: book page → submit → view/cancel by token):**

```bash
cd /path/to/pos2/front
node scripts/debug-reservations-public.mjs
```

Optional env: `BASE_URL` (e.g. `http://127.0.0.1:4203`), `TENANT_ID` (default `1`). No credentials needed for the public test.

**Run reservation tests on both localhost and production (satisfecho.de):**

```bash
# From repo root: public tests only (default)
./scripts/run-reservation-tests.sh

# Include staff test (needs .env with DEMO_LOGIN_EMAIL / DEMO_LOGIN_PASSWORD)
STAFF_TEST=1 ./scripts/run-reservation-tests.sh

# Custom URLs, headless
BASE_URLS="http://127.0.0.1:4203 http://satisfecho.de" HEADLESS=1 ./scripts/run-reservation-tests.sh
```

Production (satisfecho.de) requires the front container’s nginx to strip the `/api` prefix when proxying to the backend; see `front/nginx.conf` (`location /api` → `proxy_pass http://pos-back:8020/`).

## Demo tables (seed and test)

The demo restaurant (tenant id 1) should have **T01–T10**: T01–T05 with 4 seats, T06–T10 with 2 seats, on a single floor "Main". **Deploy** runs the seed automatically (`scripts/deploy-amvara9.sh`). If the database was reinitialized or tables were lost outside deploy, seed manually and run the check.

**Seed tables (idempotent; creates only missing tables):**

```bash
# From repo root, with backend in Docker:
docker compose exec back python -m app.seeds.seed_demo_tables

# Or from back/ with venv and DB reachable:
cd back && python -m app.seeds.seed_demo_tables
```

**Test that tables exist:**

```bash
docker compose exec back python -m app.seeds.check_demo_tables
```

Exit 0 means tenant 1 has T01–T10 with the correct seat counts; exit 1 reports missing or wrong tables.

**Demo products (tenant 1):** Deploy also runs `app.seeds.seed_demo_products`, which seeds a default menu (main courses, beverages) for tenant 1. Idempotent; no images. To run manually: `docker compose exec back python -m app.seeds.seed_demo_products`.

**Puppeteer test (demo data):** Verifies tenant 1 has ≥10 tables and ≥10 products and /book/1 loads. Run with tenant 1 credentials: `BASE_URL=http://satisfecho.de LOGIN_EMAIL=... LOGIN_PASSWORD=... node front/scripts/test-demo-data.mjs` (or `npm run test:demo-data` from front/). Set `HEADLESS=1` for headless.

**Puppeteer test (catalog + images):** `front/scripts/test-catalog.mjs` logs in, opens /catalog, and reports total cards, how many have loaded images vs placeholders. Compare dev vs amvara9: `BASE_URL=http://127.0.0.1:4202 LOGIN_EMAIL=... LOGIN_PASSWORD=... node front/scripts/test-catalog.mjs` and same with `BASE_URL=http://satisfecho.de`. Catalog data (ProductCatalog, ProviderProduct, images) comes from wine/beer/pizza import seeds, not from deploy; amvara9 has no catalog unless those imports are run on the server.
