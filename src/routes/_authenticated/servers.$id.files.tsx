import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  FolderPlus, Upload, Trash2, Download, File as FileIcon, Folder, Pencil, FileCode2, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  listFiles, createFolder, deleteFile, renameFile, uploadFile, getFileDownloadUrl,
} from "@/lib/files.functions";

export const Route = createFileRoute("/_authenticated/servers/$id/files")({
  component: FilesPage,
});

const ALLOWED = [".js", ".ts", ".py", ".json", ".txt", ".env", ".yml", ".yaml", ".md", ".mjs", ".cjs"];

function FilesPage() {
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
  const inputRef = useRef<HTMLInputElement>(null);

  const addFolder = useMutation({
    mutationFn: () => folderFn({ data: { server_id: id, path: newFolder } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["files", id] }); toast.success("Folder created"); setFolderOpen(false); setNewFolder(""); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (path: string) => delFn({ data: { server_id: id, path } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["files", id] }); toast.success("Deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const ren = useMutation({
    mutationFn: ({ from, to }: { from: string; to: string }) => renameFn({ data: { server_id: id, from, to } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["files", id] }); toast.success("Renamed"); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    for (const f of Array.from(fileList)) {
      const ext = "." + (f.name.split(".").pop() ?? "").toLowerCase();
      if (!ALLOWED.includes(ext)) { toast.error(`${f.name}: type ${ext} not allowed`); continue; }
      if (f.size > 2 * 1024 * 1024) { toast.error(`${f.name}: max 2 MB`); continue; }
      const buf = await f.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      try {
        await uploadFn({ data: { server_id: id, path: f.name, content_base64: b64 } });
        toast.success(`Uploaded ${f.name}`);
      } catch (e) {
        toast.error(`Upload failed: ${(e as Error).message}`);
      }
    }
    qc.invalidateQueries({ queryKey: ["files", id] });
  }

  async function download(path: string) {
    try {
      const { url } = await dlFn({ data: { server_id: id, path } });
      window.open(url, "_blank");
    } catch (e) { toast.error((e as Error).message); }
  }

  function onRename(path: string) {
    const next = window.prompt("Rename to:", path);
    if (next && next !== path) ren.mutate({ from: path, to: next });
  }

  const [dropActive, setDropActive] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
          <DialogTrigger asChild><Button variant="outline" size="sm" className="border-white/15 bg-white/5"><FolderPlus className="mr-2 h-4 w-4" />New folder</Button></DialogTrigger>
          <DialogContent className="glass-strong border-white/10">
            <DialogHeader><DialogTitle>New folder</DialogTitle></DialogHeader>
            <Input value={newFolder} onChange={(e) => setNewFolder(e.target.value)} placeholder="src/utils" className="bg-white/5" />
            <DialogFooter><Button onClick={() => addFolder.mutate()} disabled={addFolder.isPending || !newFolder}>{addFolder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
        <Button variant="outline" size="sm" className="border-white/15 bg-white/5" onClick={() => inputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Upload</Button>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <span className="text-xs text-muted-foreground">Allowed: {ALLOWED.join(", ")} · 2 MB / file</span>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDropActive(true); }}
        onDragLeave={() => setDropActive(false)}
        onDrop={(e) => { e.preventDefault(); setDropActive(false); handleFiles(e.dataTransfer.files); }}
        className={`glass-strong rounded-2xl p-2 transition-colors ${dropActive ? "ring-2 ring-[oklch(0.66_0.22_296)]" : ""}`}
      >
        {files.isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !files.data?.length ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No files yet — drop files here or upload above.</div>
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
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Delete ${f.path}?`)) del.mutate(f.path); }} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></Button>
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
