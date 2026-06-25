import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runnerJsonRequest, runnerRequest } from "@/lib/runner/client.server";
import { toAppFileEntry } from "@/lib/runner/adapters";
import type { AppFileEntry, RunnerFileContent, RunnerFileEntry } from "@/lib/runner/types";

const MAX_FILE_BYTES = 2 * 1024 * 1024;

function normalizePath(path: string): string {
  const clean = path.replace(/^\/+/, "").replace(/\/+/g, "/");
  if (clean.split("/").some((segment) => segment === "..")) {
    throw new Error("Invalid path");
  }
  return clean;
}

export const listFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ server_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const files = await runnerRequest<RunnerFileEntry[]>(`/api/v1/servers/${data.server_id}/files`);
    return files.map(toAppFileEntry);
  });

export const createFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z.object({ server_id: z.string().uuid(), path: z.string().min(1).max(400) }).parse(input),
  )
  .handler(async ({ data }) => {
    await runnerJsonRequest(`/api/v1/servers/${data.server_id}/files/create-folder`, {
      path: normalizePath(data.path)
    });
    return { ok: true };
  });

export const deleteFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ server_id: z.string().uuid(), path: z.string().min(1).max(400) }).parse(input))
  .handler(async ({ data }) => {
    const path = normalizePath(data.path);
    const entry = await findFileEntry(data.server_id, path);

    await runnerJsonRequest(`/api/v1/servers/${data.server_id}/files`, {
      path,
      type: entry?.is_dir ? "folder" : "file"
    }, "DELETE");

    return { ok: true };
  });

export const renameFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z.object({
      server_id: z.string().uuid(),
      from: z.string().min(1).max(400),
      to: z.string().min(1).max(400),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const from = normalizePath(data.from);
    const to = normalizePath(data.to);
    if (from === to) return { ok: true };

    const entry = await findFileEntry(data.server_id, from);
    const newName = to.split("/").pop();
    if (!newName) {
      throw new Error("Invalid target path");
    }

    await runnerJsonRequest(`/api/v1/servers/${data.server_id}/files`, {
      action: entry?.is_dir ? "rename-folder" : "rename-file",
      path: from,
      newName
    }, "PUT");

    return { ok: true };
  });

export const getFileContent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ server_id: z.string().uuid(), path: z.string().min(1).max(400) }).parse(input))
  .handler(async ({ data }) => {
    const file = await runnerRequest<RunnerFileContent>(
      `/api/v1/servers/${data.server_id}/files/content?path=${encodeURIComponent(normalizePath(data.path))}`,
    );

    return {
      content: file.content.length > MAX_FILE_BYTES ? file.content.slice(0, MAX_FILE_BYTES) : file.content
    };
  });

export const saveFileContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z.object({
      server_id: z.string().uuid(),
      path: z.string().min(1).max(400),
      content: z.string().max(MAX_FILE_BYTES),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    await runnerJsonRequest(`/api/v1/servers/${data.server_id}/files`, {
      action: "save",
      path: normalizePath(data.path),
      content: data.content
    }, "PUT");

    return { ok: true };
  });

export const uploadFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z.object({
      server_id: z.string().uuid(),
      path: z.string().min(1).max(400),
      content_base64: z.string().max(Math.ceil((MAX_FILE_BYTES * 4) / 3)),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const path = normalizePath(data.path);
    const content = Buffer.from(data.content_base64, "base64").toString("utf8");
    if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) {
      throw new Error("File too large (max 2 MB)");
    }

    await runnerJsonRequest(`/api/v1/servers/${data.server_id}/files`, {
      path,
      content,
      overwrite: true
    });

    return { ok: true };
  });

export const getFileDownloadUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ server_id: z.string().uuid(), path: z.string().min(1).max(400) }).parse(input))
  .handler(async ({ data }) => {
    const file = await runnerRequest<RunnerFileContent>(
      `/api/v1/servers/${data.server_id}/files/content?path=${encodeURIComponent(normalizePath(data.path))}`,
    );
    const encoded = Buffer.from(file.content, "utf8").toString("base64");
    return { url: `data:${file.mimeType};base64,${encoded}` };
  });

const findFileEntry = async (serverId: string, path: string): Promise<AppFileEntry | undefined> => {
  const files = await runnerRequest<RunnerFileEntry[]>(`/api/v1/servers/${serverId}/files`);
  return files.map(toAppFileEntry).find((entry) => entry.path === path);
};
