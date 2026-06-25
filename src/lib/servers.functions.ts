import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRunnerServerConfig } from "@/lib/runner/config.server";
import { runnerJsonRequest, runnerRequest } from "@/lib/runner/client.server";
import {
  getDefaultEntryFile,
  toAppMetric,
  toAppServer,
  toRunnerRuntime,
  toRunnerServerType
} from "@/lib/runner/adapters";
import { sendRunnerConsoleCommand } from "@/lib/runner/socket-command.server";
import type { AppRuntime, RunnerConsoleEvent, RunnerProcessMetric, RunnerServer } from "@/lib/runner/types";

export const listServers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const servers = await runnerRequest<RunnerServer[]>("/api/v1/servers");
    return servers.map(toAppServer);
  });

export const getServer = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const [server, metrics] = await Promise.all([
      runnerRequest<RunnerServer>(`/api/v1/servers/${data.id}`),
      runnerRequest<RunnerProcessMetric[]>("/api/v1/resources/servers").catch(() => []),
    ]);
    const metric = metrics.find((item) => item.serverId === data.id);

    return {
      server: toAppServer(server),
      metric: toAppMetric(metric)
    };
  });

const createServerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(280).optional(),
  runtime: z.enum(["nodejs", "python"]),
});

export const createServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => createServerSchema.parse(input))
  .handler(async ({ data }) => {
    const servers = await runnerRequest<RunnerServer[]>("/api/v1/servers");
    if (servers.length >= 3) {
      throw new Error("Free tier limit: 3 servers per account");
    }

    const runtime = data.runtime as AppRuntime;
    const serverFolderName = createSafeFolderName(data.name);
    const workingDirectory = join(getRunnerServerConfig().serversRoot, serverFolderName);
    const entryFile = getDefaultEntryFile(runtime);

    await createStarterFiles(workingDirectory, runtime, data.name);

    const created = await runnerJsonRequest<RunnerServer>("/api/v1/servers", {
      name: data.name,
      description: data.description ?? "",
      runtime: toRunnerRuntime(runtime),
      type: toRunnerServerType(runtime),
      workingDirectory,
      entryFile
    });

    return toAppServer(created);
  });

export const deleteServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    await runnerRequest<RunnerServer>(`/api/v1/servers/${data.id}`, { method: "DELETE" });
    return { ok: true };
  });

export const enqueueCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z.object({
      server_id: z.string().uuid(),
      kind: z.enum(["start", "stop", "restart", "exec", "sync_files"]),
      payload: z.record(z.unknown()).optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    if (data.kind === "start") {
      await runnerJsonRequest<RunnerServer>(`/api/v1/servers/${data.server_id}/start`, {});
      return { ok: true };
    }

    if (data.kind === "stop") {
      await runnerJsonRequest<RunnerServer>(`/api/v1/servers/${data.server_id}/stop`, {});
      return { ok: true };
    }

    if (data.kind === "restart") {
      await runnerJsonRequest<RunnerServer>(`/api/v1/servers/${data.server_id}/restart`, {});
      return { ok: true };
    }

    if (data.kind === "exec") {
      const command = typeof data.payload?.command === "string" ? data.payload.command : "";
      if (!command) {
        throw new Error("Command is required");
      }
      await sendRunnerConsoleCommand(data.server_id, command);
      return { ok: true };
    }

    return { ok: true };
  });

export const getServerMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const metrics = await runnerRequest<RunnerProcessMetric[]>("/api/v1/resources/servers");
    const metric = metrics.find((item) => item.serverId === data.id);
    const appMetric = toAppMetric(metric);
    return appMetric ? [appMetric] : [];
  });

export const getServerLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ id: z.string().uuid(), limit: z.number().int().min(1).max(500).optional() }).parse(input))
  .handler(async ({ data }) => {
    const history = await runnerRequest<RunnerConsoleEvent[]>(`/api/v1/servers/${data.id}/console/history`);
    return history.slice(-(data.limit ?? 200)).map((event) => ({
      id: event.id,
      level: event.stream,
      message: event.data,
      ts: event.timestamp
    }));
  });

export const sendConsoleCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z.object({ server_id: z.string().uuid(), command: z.string().min(1).max(500) }).parse(input),
  )
  .handler(async ({ data }) => {
    await sendRunnerConsoleCommand(data.server_id, data.command);
    return { ok: true };
  });

const createSafeFolderName = (name: string): string => {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${slug || "server"}-${randomUUID()}`;
};

const createStarterFiles = async (workingDirectory: string, runtime: AppRuntime, name: string): Promise<void> => {
  await mkdir(workingDirectory, { recursive: true });

  if (runtime === "nodejs") {
    await Promise.all([
      writeFile(
        join(workingDirectory, "package.json"),
        JSON.stringify({ name: createPackageName(name), version: "1.0.0", type: "module", scripts: { start: "node index.js" } }, null, 2),
        "utf8",
      ),
      writeFile(join(workingDirectory, "index.js"), "console.log('Lave Runner Node.js server started');\nsetInterval(() => {}, 1000);\n", "utf8"),
      writeFile(join(workingDirectory, ".env"), "", "utf8"),
    ]);
    return;
  }

  await Promise.all([
    writeFile(join(workingDirectory, "requirements.txt"), "", "utf8"),
    writeFile(join(workingDirectory, "main.py"), "import time\nprint('Lave Runner Python server started')\nwhile True:\n    time.sleep(1)\n", "utf8"),
    writeFile(join(workingDirectory, ".env"), "", "utf8"),
  ]);
};

const createPackageName = (name: string): string => {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "lave-server";
};
