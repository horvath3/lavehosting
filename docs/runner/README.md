# Lave Hosting Runner

The Lave Hosting control panel (this Lovable project) doesn't run user bot processes itself — it only stores metadata, queues commands, and renders the UI. The actual bot processes run on **your VPS** inside Docker containers, controlled by this small runner agent.

## How it works

```
 Control panel (Lovable)  <— HMAC-signed HTTPS —>  Runner (your VPS, Node + Docker)
```

1. Runner polls `POST /api/public/runner/poll` every ~3 seconds for pending commands (`start`, `stop`, `restart`, `delete`, `exec`).
2. Runner downloads the server's files from Supabase Storage (bucket: `server-files`, prefix: `<server_id>/`) into a per-server volume.
3. Runner starts a Docker container (`node:20-slim` or `python:3.12-slim`) with strict CPU/RAM limits.
4. Runner pipes container stdout/stderr to `POST /api/public/runner/logs` in batches.
5. Runner posts CPU/RAM/disk every 5 seconds to `POST /api/public/runner/metrics`.
6. Runner calls `POST /api/public/runner/ack` on every command with the result and updated `server_status`.

## Required environment variables

```bash
LAVE_CONTROL_URL=https://project--<project-id>.lovable.app
LAVE_RUNNER_SECRET=<copy of RUNNER_SECRET from Lovable Cloud → Secrets>
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role>   # required to download files
DATA_DIR=/var/lib/lave/servers
```

> The control panel signs and verifies every webhook using HMAC-SHA256 with `RUNNER_SECRET`. The signed string is `${unix_seconds}.${raw_body}`, sent in the header `x-runner-signature: t=<sec>,v1=<hex>`. The window is 5 minutes.

## Quickstart

```bash
cd docs/runner
docker build -t lave-runner .
docker run -d --name lave-runner \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/lave:/var/lib/lave \
  -e LAVE_CONTROL_URL=... \
  -e LAVE_RUNNER_SECRET=... \
  -e SUPABASE_URL=... \
  -e SUPABASE_SERVICE_ROLE_KEY=... \
  lave-runner
```

## API contract

### `POST /api/public/runner/poll`
Returns up to 20 pending commands and flips their status to `running`.
```json
{ "commands": [{ "id": "...", "server_id": "...", "kind": "start", "payload": {} }] }
```

### `POST /api/public/runner/ack`
```json
{
  "command_id": "uuid", "server_id": "uuid",
  "status": "done", "server_status": "running", "container_id": "abcd1234",
  "result": { "exit_code": null }
}
```

### `POST /api/public/runner/metrics`
```json
{ "server_id": "uuid", "cpu_pct": 12.4, "ram_mb": 89, "disk_mb": 22, "uptime_s": 1234 }
```

### `POST /api/public/runner/logs`
```json
{ "server_id": "uuid", "entries": [{ "level": "stdout", "message": "Ready" }] }
```

## Security notes

- All endpoints live under `/api/public/*` (auth bypassed on published sites), then verified inline via HMAC.
- Use `pg_cron` / per-runner rate limits in front of this if you expose multiple runners.
- Containers should drop capabilities (`--cap-drop=ALL`), run as non-root, and have strict `--memory`, `--cpus`, and `--pids-limit` flags.
- Never expose Docker socket to the bot containers themselves.

See `index.js` for a reference Node.js implementation and `Dockerfile` for the recommended image.
