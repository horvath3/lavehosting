import type {
  AppFileEntry,
  AppLogRow,
  AppMetric,
  AppRuntime,
  AppServer,
  AppServerStatus,
  RunnerConsoleEvent,
  RunnerFileEntry,
  RunnerProcessMetric,
  RunnerRuntime,
  RunnerServer,
  RunnerServerStatus
} from "./types";

export const toRunnerRuntime = (runtime: AppRuntime): RunnerRuntime => (runtime === "nodejs" ? "node" : "python");

export const toAppRuntime = (runtime: RunnerRuntime): AppRuntime => (runtime === "node" ? "nodejs" : "python");

export const toAppStatus = (status: RunnerServerStatus): AppServerStatus => {
  const map: Record<RunnerServerStatus, AppServerStatus> = {
    STOPPED: "stopped",
    STARTING: "starting",
    RUNNING: "running",
    STOPPING: "stopping",
    RESTARTING: "starting",
    CRASHED: "crashed"
  };

  return map[status];
};

export const toRunnerServerType = (runtime: AppRuntime): string => {
  return runtime === "nodejs" ? "node-service" : "python-service";
};

export const getDefaultEntryFile = (runtime: AppRuntime): string => {
  return runtime === "nodejs" ? "index.js" : "main.py";
};

export const toAppServer = (server: RunnerServer): AppServer => ({
  id: server.id,
  name: server.name,
  description: server.description || null,
  runtime: toAppRuntime(server.runtime),
  status: toAppStatus(server.status),
  started_at: server.lastStart,
  created_at: server.createdAt,
  updated_at: server.updatedAt,
  cpu_limit_pct: 100,
  ram_limit_mb: 1024,
  disk_limit_mb: 1024,
  entry_file: normalizeEntryFile(server.entryFile),
  working_directory: server.workingDirectory,
  pid: server.pid
});

export const toAppMetric = (metric: RunnerProcessMetric | undefined): AppMetric | null => {
  if (!metric) {
    return null;
  }

  return {
    cpu_pct: metric.cpuUsagePercent ?? 0,
    ram_mb: metric.memoryBytes ? metric.memoryBytes / 1024 / 1024 : 0,
    disk_mb: 0,
    uptime_s: Math.floor(metric.uptime),
    recorded_at: metric.refreshedAt
  };
};

export const toAppFileEntry = (entry: RunnerFileEntry): AppFileEntry => ({
  id: entry.path,
  path: entry.path,
  is_dir: entry.type === "directory",
  size_bytes: entry.size,
  mime: entry.mimeType,
  updated_at: entry.updatedAt
});

export const toAppLogRow = (event: RunnerConsoleEvent): AppLogRow => ({
  id: event.id,
  level: event.stream,
  message: event.data,
  ts: event.timestamp
});

const normalizeEntryFile = (entryFile: string): string => {
  const normalized = entryFile.replaceAll("\\", "/");
  return normalized.split("/").pop() ?? normalized;
};
