/**
 * Reference Lave Hosting runner — minimal Node.js implementation.
 *
 * THIS FILE IS DOCUMENTATION. Copy it to your VPS, install dependencies,
 * and run it with the env vars listed in README.md. Do not try to import
 * this from the Lovable project.
 *
 *   npm i node-fetch@3 dockerode @supabase/supabase-js
 *   node index.js
 */
import { createHmac } from "node:crypto";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import Docker from "dockerode";
import { createClient } from "@supabase/supabase-js";

const {
  LAVE_CONTROL_URL,
  LAVE_RUNNER_SECRET,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  DATA_DIR = "/var/lib/lave/servers",
} = process.env;

if (!LAVE_CONTROL_URL || !LAVE_RUNNER_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing required env vars");
}

const docker = new Docker();
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const containers = new Map(); // server_id -> Container

function sign(body) {
  const t = Math.floor(Date.now() / 1000);
  const v1 = createHmac("sha256", LAVE_RUNNER_SECRET).update(`${t}.${body}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

async function post(path, payload) {
  const body = JSON.stringify(payload);
  return fetch(`${LAVE_CONTROL_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-runner-signature": sign(body) },
    body,
  });
}

async function syncFiles(serverId) {
  const dir = join(DATA_DIR, serverId);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const { data: list } = await sb.storage.from("server-files").list(serverId, { limit: 1000 });
  for (const obj of list ?? []) {
    const { data: blob } = await sb.storage.from("server-files").download(`${serverId}/${obj.name}`);
    if (!blob) continue;
    const buf = Buffer.from(await blob.arrayBuffer());
    await writeFile(join(dir, obj.name), buf);
  }
  return dir;
}

async function startContainer(server) {
  const dir = await syncFiles(server.id);
  const image = server.runtime === "python" ? "python:3.12-slim" : "node:20-slim";
  const cmd = server.runtime === "python"
    ? ["python", server.entry_file || "main.py"]
    : ["node", server.entry_file || "index.js"];
  await docker.pull(image);
  const container = await docker.createContainer({
    Image: image, Cmd: cmd, WorkingDir: "/app", Tty: false,
    HostConfig: {
      Binds: [`${dir}:/app:ro`],
      Memory: (server.ram_limit_mb || 512) * 1024 * 1024,
      NanoCpus: Math.floor((server.cpu_limit_pct || 50) / 100 * 1e9),
      PidsLimit: 100, CapDrop: ["ALL"], ReadonlyRootfs: false, NetworkMode: "bridge",
    },
  });
  await container.start();
  containers.set(server.id, container);

  // Stream logs
  const stream = await container.logs({ follow: true, stdout: true, stderr: true });
  let buf = "";
  stream.on("data", async (chunk) => {
    buf += chunk.toString("utf8");
    const lines = buf.split("\n"); buf = lines.pop() ?? "";
    if (lines.length) await post("/api/public/runner/logs", { server_id: server.id, entries: lines.map((m) => ({ level: "stdout", message: m })) });
  });
  return container.id;
}

async function handleCommand(cmd) {
  try {
    const { data: server } = await sb.from("servers").select("*").eq("id", cmd.server_id).single();
    if (cmd.kind === "start") {
      const id = await startContainer(server);
      await post("/api/public/runner/ack", { command_id: cmd.id, server_id: server.id, status: "done", server_status: "running", container_id: id });
    } else if (cmd.kind === "stop" || cmd.kind === "delete") {
      const c = containers.get(server.id);
      if (c) { try { await c.stop({ t: 10 }); } catch {} try { await c.remove({ force: true }); } catch {} containers.delete(server.id); }
      await post("/api/public/runner/ack", { command_id: cmd.id, server_id: server.id, status: "done", server_status: "stopped" });
    } else if (cmd.kind === "restart") {
      const c = containers.get(server.id);
      if (c) { try { await c.stop({ t: 5 }); } catch {} try { await c.remove({ force: true }); } catch {} containers.delete(server.id); }
      const id = await startContainer(server);
      await post("/api/public/runner/ack", { command_id: cmd.id, server_id: server.id, status: "done", server_status: "running", container_id: id });
    } else if (cmd.kind === "exec") {
      const c = containers.get(server.id);
      if (!c) throw new Error("not running");
      const exec = await c.exec({ Cmd: ["sh", "-c", cmd.payload?.command ?? ""], AttachStdout: true, AttachStderr: true });
      await exec.start({});
      await post("/api/public/runner/ack", { command_id: cmd.id, server_id: server.id, status: "done" });
    }
  } catch (err) {
    await post("/api/public/runner/ack", { command_id: cmd.id, server_id: cmd.server_id, status: "failed", result: { error: String(err) } });
  }
}

async function pollLoop() {
  while (true) {
    try {
      const r = await post("/api/public/runner/poll", {});
      const { commands } = await r.json();
      for (const c of commands ?? []) await handleCommand(c);
    } catch (e) { console.error("poll error", e); }
    await new Promise((r) => setTimeout(r, 3000));
  }
}

async function metricsLoop() {
  while (true) {
    for (const [serverId, c] of containers) {
      try {
        const stats = await c.stats({ stream: false });
        const cpu = Math.min(100, (stats.cpu_stats.cpu_usage.total_usage / stats.cpu_stats.system_cpu_usage) * 100 || 0);
        const ram = (stats.memory_stats.usage ?? 0) / 1024 / 1024;
        await post("/api/public/runner/metrics", { server_id: serverId, cpu_pct: cpu, ram_mb: ram, disk_mb: 0, uptime_s: Math.floor(Date.now() / 1000) });
      } catch {}
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
}

console.log("Lave runner online — polling", LAVE_CONTROL_URL);
pollLoop();
metricsLoop();
