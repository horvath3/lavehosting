import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  FolderPlus, Upload, Trash2, Download, File as FileIcon, Folder, Pencil, FileCode2, Loader2, FolderUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  listFiles, createFolder, deleteFile, renameFile, uploadFile, getFileDownloadUrl,
} from "@/lib/files.functions";
import { useT } from "@/i18n/I18nProvider";

export const Route = createFileRoute("/_authenticated/servers/$id/files")({
  component: FilesPage,
});

const ALLOWED = [".js", ".ts", ".py", ".json", ".txt", ".env", ".yml", ".yaml", ".md", ".mjs", ".cjs"];
const MAX_SIZE = 2 * 1024 * 1024;

type UploadEntry = { path: string; file: File };

function FilesPage() {
  const t = useT();
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const listFn = useServerFn(listFiles);
  const folderFn = useServerFn(createFolder);
  const delFn = useServerFn(deleteFile);
  const renameFn = useServerFn(renameFile);
  const uploadFn = useServerFn(uploadFile);
  const dlFn = useServerFn(getFileDownloadUrl);

  const files = useQuery({ queryKey: ["files", id], queryFn: () => listFn({ data: { server_id: id } }) });
  const [newFolder, setNewFolder] = useState("");
  const [folderOpen, setFolderOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<{ total: number; done: number } | null>(null);

  const addFolder = useMutation({
    mutationFn: () => folderFn({ data: { server_id: id, path: newFolder } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["files", id] }); toast.success(t("files.folderCreated")); setFolderOpen(false); setNewFolder(""); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (path: string) => delFn({ data: { server_id: id, path } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["files", id] }); toast.success(t("files.deleted")); },
    onError: (e: Error) => toast.error(e.message),
  });
  const ren = useMutation({
    mutationFn: ({ from, to }: { from: string; to: string }) => renameFn({ data: { server_id: id, from, to } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["files", id] }); toast.success(t("files.renamed")); },
    onError: (e: Error) => toast.error(e.message),
  });

  function fileToEntries(fileList: FileList | null): UploadEntry[] {
    if (!fileList) return [];
    return Array.from(fileList).map((f) => {
      // webkitRelativePath is set when input has webkitdirectory, or when a folder is dropped.
      const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
      return { path: rel, file: f };
    });
  }

  async function processEntries(entries: UploadEntry[]) {
    if (!entries.length) return;
    // Filter / validate
    const valid: UploadEntry[] = [];
    for (const e of entries) {
      const name = e.path.split("/").pop() || e.path;
      const ext = "." + (name.split(".").pop() ?? "").toLowerCase();
      if (!ALLOWED.includes(ext)) { toast.error(t("files.skipped", { name, ext })); continue; }
      if (e.file.size > MAX_SIZE) { toast.error(t("files.tooLarge", { name })); continue; }
      valid.push(e);
    }
    if (!valid.length) { qc.invalidateQueries({ queryKey: ["files", id] }); return; }

    // Pre-create intermediate folders so they show in the tree.
    const folders = new Set<string>();
    for (const e of valid) {
      const parts = e.path.split("/");
      for (let i = 1; i < parts.length; i++) {
        folders.add(parts.slice(0, i).join("/"));
      }
    }
    for (const f of folders) {
      try { await folderFn({ data: { server_id: id, path: f } }); } catch { /* duplicate is fine */ }
    }

    // Upload with mild concurrency.
    setBusy({ total: valid.length, done: 0 });
    if (valid.length > 1) toast.message(t("files.uploadingFolder", { count: valid.length }));
    let ok = 0;
    const CONCURRENCY = 3;
    let i = 0;
    async function worker() {
      while (i < valid.length) {
        const idx = i++;
        const entry = valid[idx];
        try {
          const buf = await entry.file.arrayBuffer();
          let bin = "";
          const u8 = new Uint8Array(buf);
          for (let j = 0; j < u8.length; j++) bin += String.fromCharCode(u8[j]);
          const b64 = btoa(bin);
          await uploadFn({ data: { server_id: id, path: entry.path, content_base64: b64 } });
          ok++;
        } catch (err) {
          toast.error(t("files.uploadFailed", { msg: (err as Error).message }));
        } finally {
          setBusy((s) => (s ? { ...s, done: s.done + 1 } : s));
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, valid.length) }, () => worker()));
    setBusy(null);
    toast.success(t("files.folderDone", { ok, total: valid.length }));
    qc.invalidateQueries({ queryKey: ["files", id] });
  }

  async function download(path: string) {
    try {
      const { url } = await dlFn({ data: { server_id: id, path } });
      window.open(url, "_blank");
    } catch (e) { toast.error((e as Error).message); }
  }

  function onRename(path: string) {
    const next = window.prompt(t("files.renamePrompt"), path);
    if (next && next !== path) ren.mutate({ from: path, to: next });
  }

  // Drag-and-drop: walk the DataTransferItemList so dropped folders preserve structure.
  const [dropActive, setDropActive] = useState(false);
  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDropActive(false);
    const items = e.dataTransfer.items;
    if (items && items.length && typeof (items[0] as any).webkitGetAsEntry === "function") {
      const collected: UploadEntry[] = [];
      const promises: Promise<void>[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = (items[i] as any).webkitGetAsEntry?.();
        if (entry) promises.push(walkEntry(entry, "", collected));
      }
      await Promise.all(promises);
      await processEntries(collected);
    } else {
      await processEntries(fileToEntries(e.dataTransfer.files));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="border-white/15 bg-white/5"><FolderPlus className="mr-2 h-4 w-4" />{t("files.newFolder")}</Button>
          </DialogTrigger>
          <DialogContent className="glass-strong border-white/10">
            <DialogHeader><DialogTitle>{t("files.newFolder")}</DialogTitle></DialogHeader>
            <Input value={newFolder} onChange={(e) => setNewFolder(e.target.value)} placeholder="src/utils" className="bg-white/5" />
            <DialogFooter><Button onClick={() => addFolder.mutate()} disabled={addFolder.isPending || !newFolder}>{addFolder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("files.newFolder")}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Button variant="outline" size="sm" className="border-white/15 bg-white/5" onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />{t("files.upload")}
        </Button>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => processEntries(fileToEntries(e.target.files))} />

        <Button variant="outline" size="sm" className="border-white/15 bg-white/5" onClick={() => folderInputRef.current?.click()}>
          <FolderUp className="mr-2 h-4 w-4" />{t("files.uploadFolder")}
        </Button>
        {/* webkitdirectory enables folder uploads with full relative paths preserved */}
        <input
          ref={folderInputRef}
          type="file"
          multiple
          className="hidden"
          // @ts-expect-error -- non-standard but widely supported
          webkitdirectory=""
          directory=""
          onChange={(e) => processEntries(fileToEntries(e.target.files))}
        />

        <span className="text-xs text-muted-foreground">{t("files.allowed", { types: ALLOWED.join(", ") })}</span>
      </div>

      <AnimatePresence>
        {busy && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="glass-strong flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
          >
            <Loader2 className="h-4 w-4 animate-spin text-[oklch(0.85_0.15_290)]" />
            <span className="flex-1 font-mono tabular-nums">{busy.done} / {busy.total}</span>
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full bg-gradient-to-r from-[oklch(0.78_0.13_210)] to-[oklch(0.66_0.22_296)]"
                animate={{ width: `${(busy.done / busy.total) * 100}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        onDragOver={(e) => { e.preventDefault(); setDropActive(true); }}
        onDragLeave={() => setDropActive(false)}
        onDrop={handleDrop}
        className={`glass-strong rounded-2xl p-2 transition-colors ${dropActive ? "ring-2 ring-[oklch(0.66_0.22_296)]" : ""}`}
      >
        {files.isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">…</div>
        ) : !files.data?.length ? (
          <div className="p-10 text-center text-sm text-muted-foreground">{dropActive ? t("files.dropHere") : t("files.empty")}</div>
        ) : (
          <ul className="divide-y divide-white/5">
            {files.data.map((f) => {
              const ext = f.path.split(".").pop()?.toLowerCase() ?? "";
              const editable = ALLOWED.includes("." + ext);
              return (
                <li key={f.id} className="flex items-center gap-3 px-3 py-2 hover:bg-white/[0.04]">
                  {f.is_dir ? <Folder className="h-4 w-4 text-[oklch(0.78_0.13_210)]" /> : editable ? <FileCode2 className="h-4 w-4 text-[oklch(0.85_0.15_290)]" /> : <FileIcon className="h-4 w-4 text-muted-foreground" />}
                  <div className="min-w-0 flex-1">
                    {f.is_dir || !editable ? (
                      <span className="truncate font-mono text-sm">{f.path}</span>
                    ) : (
                      <Link to="/servers/$id/edit" params={{ id }} search={{ path: f.path } as never} className="truncate font-mono text-sm hover:text-[oklch(0.85_0.15_290)] hover:underline">
                        {f.path}
                      </Link>
                    )}
                  </div>
                  <span className="hidden text-xs text-muted-foreground sm:inline">{f.is_dir ? "—" : `${(f.size_bytes / 1024).toFixed(1)} KB`}</span>
                  <div className="flex items-center gap-1">
                    {!f.is_dir && <Button variant="ghost" size="icon" onClick={() => download(f.path)}><Download className="h-3.5 w-3.5" /></Button>}
                    <Button variant="ghost" size="icon" onClick={() => onRename(f.path)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm(t("files.deletePrompt", { path: f.path }))) del.mutate(f.path); }} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// Recursively walk a dropped FileSystemEntry. Skips errors silently so a half-permission
// drop still uploads what it can.
async function walkEntry(entry: any, prefix: string, out: UploadEntry[]): Promise<void> {
  if (entry.isFile) {
    return new Promise<void>((resolve) => {
      entry.file((file: File) => {
        out.push({ path: prefix + entry.name, file });
        resolve();
      }, () => resolve());
    });
  }
  if (entry.isDirectory) {
    const reader = entry.createReader();
    // readEntries may return in batches; loop until empty.
    const readAll = (): Promise<any[]> =>
      new Promise((resolve) => {
        const acc: any[] = [];
        const next = () => {
          reader.readEntries((batch: any[]) => {
            if (!batch.length) return resolve(acc);
            acc.push(...batch);
            next();
          }, () => resolve(acc));
        };
        next();
      });
    const children = await readAll();
    await Promise.all(children.map((c) => walkEntry(c, prefix + entry.name + "/", out)));
  }
}
