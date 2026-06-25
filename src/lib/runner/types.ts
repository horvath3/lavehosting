export interface RunnerApiResponse<TData> {
  success: boolean;
  message: string;
  data: TData;
  timestamp: string;
}

export type RunnerRuntime = "node" | "python";
export type AppRuntime = "nodejs" | "python";

export type RunnerServerStatus = "STOPPED" | "STARTING" | "RUNNING" | "STOPPING" | "RESTARTING" | "CRASHED";
export type AppServerStatus = "stopped" | "starting" | "running" | "stopping" | "crashed" | "creating" | "deleting";

export interface RunnerServer {
  id: string;
  name: string;
  description: string;
  runtime: RunnerRuntime;
  type: string;
  workingDirectory: string;
  entryFile: string;
  createdAt: string;
  updatedAt: string;
  pid: number | null;
  status: RunnerServerStatus;
  uptime: number;
  lastStart: string | null;
  lastStop: string | null;
}

export interface AppServer {
  id: string;
  name: string;
  description: string | null;
  runtime: AppRuntime;
  status: AppServerStatus;
  started_at: string | null;
  created_at: string;
  updated_at: string;
  cpu_limit_pct: number;
  ram_limit_mb: number;
  disk_limit_mb: number;
  entry_file: string | null;
  working_directory: string;
  pid: number | null;
}

export interface AppMetric {
  cpu_pct: number;
  ram_mb: number;
  disk_mb: number;
  uptime_s: number;
  recorded_at: string;
}

export interface RunnerProcessMetric {
  serverId: string;
  name: string;
  status: RunnerServerStatus;
  running: boolean;
  pid: number | null;
  cpuUsagePercent: number | null;
  memoryUsagePercent: number | null;
  memoryBytes: number | null;
  uptime: number;
  refreshedAt: string;
}

export interface RunnerFileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppFileEntry {
  id: string;
  path: string;
  is_dir: boolean;
  size_bytes: number;
  mime: string | null;
  updated_at: string;
}

export interface RunnerFileContent {
  path: string;
  mimeType: string;
  encoding: "utf8";
  content: string;
  size: number;
  updatedAt: string;
}

export interface RunnerConsoleEvent {
  id: string;
  serverId: string;
  stream: "stdout" | "stderr" | "system";
  data: string;
  timestamp: string;
}

export interface AppLogRow {
  id: string;
  level: "stdout" | "stderr" | "system";
  message: string;
  ts: string;
}

export interface DashboardSnapshot {
  runner: {
    id: string;
    name: string;
    version: string;
    online: boolean;
    uptime: number;
  };
  servers: RunnerServer[];
  cpu: { usagePercent: number } | null;
  ram: { total: number; used: number; free: number; usagePercent: number } | null;
  disk: { total: number; used: number; free: number; usagePercent: number } | null;
  uptime: number;
}
