import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ALLOWED_EXT = new Set(["js", "ts", "py", "json", "txt", "env", "yml", "yaml", "md", "mjs", "cjs"]);
const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB per file

function normalizePath(p: string): string {
  // Strip leading slashes; collapse repeated slashes; reject "..".
  const clean = p.replace(/^\/+/, "").replace(/\/+/g, "/");
  if (clean.split("/").some((seg) => seg === "..")) throw new Error("Invalid path");
  return clean;
}

async function assertServerAccess(supabase: any, server_id: string) {
  const { data, error } = await supabase.from("servers").select("id").eq("id", server_id).maybeSingle();
  if (error || !data) throw new Error("Server not found");
}

export const listFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ server_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await assertServerAccess(supabase, data.server_id);
    const { data: rows, error } = await supabase
      .from("server_files")
      .select("id, path, is_dir, size_bytes, mime, updated_at")
      .eq("server_id", data.server_id)
      .order("path");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ server_id: z.string().uuid(), path: z.string().min(1).max(400) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await assertServerAccess(supabase, data.server_id);
    const path = normalizePath(data.path);
    const { error } = await supabase.from("server_files").insert({
      server_id: data.server_id, path, is_dir: true, size_bytes: 0,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ server_id: z.string().uuid(), path: z.string().min(1).max(400) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await assertServerAccess(supabase, data.server_id);
    const path = normalizePath(data.path);

    // Find direct + descendant rows
    const { data: rows } = await supabase
      .from("server_files")
      .select("id, path, is_dir, storage_key")
      .eq("server_id", data.server_id);

    const victims = (rows ?? []).filter((r) => r.path === path || r.path.startsWith(path + "/"));
    if (!victims.length) return { ok: true };

    const storageKeys = victims.filter((v) => !v.is_dir && v.storage_key).map((v) => v.storage_key as string);
    if (storageKeys.length) await supabase.storage.from("server-files").remove(storageKeys);
    await supabase.from("server_files").delete().in("id", victims.map((v) => v.id));
    return { ok: true };
  });

export const renameFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      server_id: z.string().uuid(),
      from: z.string().min(1).max(400),
      to: z.string().min(1).max(400),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await assertServerAccess(supabase, data.server_id);
    const from = normalizePath(data.from);
    const to = normalizePath(data.to);
    if (from === to) return { ok: true };

    const { data: rows } = await supabase
      .from("server_files")
      .select("id, path, is_dir, storage_key")
      .eq("server_id", data.server_id);

    const affected = (rows ?? []).filter((r) => r.path === from || r.path.startsWith(from + "/"));
    for (const row of affected) {
      const newPath = row.path === from ? to : to + row.path.slice(from.length);
      let newStorageKey: string | null = row.storage_key as string | null;
      if (!row.is_dir && row.storage_key) {
        const targetKey = `${data.server_id}/${newPath}`;
        await supabase.storage.from("server-files").move(row.storage_key, targetKey).catch(() => {});
        newStorageKey = targetKey;
      }
      await supabase.from("server_files").update({ path: newPath, storage_key: newStorageKey }).eq("id", row.id);
    }
    return { ok: true };
  });

export const getFileContent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ server_id: z.string().uuid(), path: z.string().min(1).max(400) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await assertServerAccess(supabase, data.server_id);
    const path = normalizePath(data.path);
    const key = `${data.server_id}/${path}`;
    const { data: blob, error } = await supabase.storage.from("server-files").download(key);
    if (error || !blob) return { content: "" };
    const text = await blob.text();
    return { content: text.length > MAX_FILE_BYTES ? text.slice(0, MAX_FILE_BYTES) : text };
  });

export const saveFileContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      server_id: z.string().uuid(),
      path: z.string().min(1).max(400),
      content: z.string().max(MAX_FILE_BYTES),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await assertServerAccess(supabase, data.server_id);
    const path = normalizePath(data.path);
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXT.has(ext)) throw new Error(`File type .${ext} not allowed`);
    const key = `${data.server_id}/${path}`;
    const blob = new Blob([data.content], { type: "text/plain" });

    const { error: upErr } = await supabase.storage.from("server-files").upload(key, blob, { upsert: true });
    if (upErr) throw new Error(upErr.message);

    // Upsert file row
    const { data: existing } = await supabase
      .from("server_files").select("id").eq("server_id", data.server_id).eq("path", path).maybeSingle();
    if (existing) {
      await supabase.from("server_files").update({ size_bytes: data.content.length, storage_key: key, mime: "text/plain" }).eq("id", existing.id);
    } else {
      await supabase.from("server_files").insert({
        server_id: data.server_id, path, is_dir: false, size_bytes: data.content.length, mime: "text/plain", storage_key: key,
      });
    }
    return { ok: true };
  });

export const uploadFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      server_id: z.string().uuid(),
      path: z.string().min(1).max(400),
      content_base64: z.string().max(Math.ceil((MAX_FILE_BYTES * 4) / 3)),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await assertServerAccess(supabase, data.server_id);
    const path = normalizePath(data.path);
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXT.has(ext)) throw new Error(`File type .${ext} not allowed`);

    const bytes = Uint8Array.from(atob(data.content_base64), (c) => c.charCodeAt(0));
    if (bytes.byteLength > MAX_FILE_BYTES) throw new Error("File too large (max 2 MB)");
    const key = `${data.server_id}/${path}`;
    const { error } = await supabase.storage.from("server-files").upload(key, new Blob([bytes]), { upsert: true });
    if (error) throw new Error(error.message);

    const { data: existing } = await supabase
      .from("server_files").select("id").eq("server_id", data.server_id).eq("path", path).maybeSingle();
    if (existing) {
      await supabase.from("server_files").update({ size_bytes: bytes.byteLength, storage_key: key, mime: "application/octet-stream" }).eq("id", existing.id);
    } else {
      await supabase.from("server_files").insert({
        server_id: data.server_id, path, is_dir: false, size_bytes: bytes.byteLength, mime: "application/octet-stream", storage_key: key,
      });
    }
    return { ok: true };
  });

export const getFileDownloadUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ server_id: z.string().uuid(), path: z.string().min(1).max(400) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await assertServerAccess(supabase, data.server_id);
    const key = `${data.server_id}/${normalizePath(data.path)}`;
    const { data: signed, error } = await supabase.storage.from("server-files").createSignedUrl(key, 300);
    if (error || !signed) throw new Error(error?.message ?? "Could not create download URL");
    return { url: signed.signedUrl };
  });
