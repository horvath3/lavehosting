import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Save, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import Editor from "@monaco-editor/react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { getFileContent, saveFileContent } from "@/lib/files.functions";

export const Route = createFileRoute("/_authenticated/servers/$id/edit")({
  validateSearch: (s) => z.object({ path: z.string().min(1) }).parse(s),
  component: EditFile,
});

const langMap: Record<string, string> = {
  js: "javascript", mjs: "javascript", cjs: "javascript",
  ts: "typescript", py: "python", json: "json", txt: "plaintext",
  env: "shell", yml: "yaml", yaml: "yaml", md: "markdown",
};

function EditFile() {
  const { id } = Route.useParams();
  const { path } = Route.useSearch();
  const qc = useQueryClient();
  const getFn = useServerFn(getFileContent);
  const saveFn = useServerFn(saveFileContent);

  const q = useQuery({
    queryKey: ["file", id, path],
    queryFn: () => getFn({ data: { server_id: id, path } }),
  });

  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [full, setFull] = useState(false);

  useEffect(() => { if (q.data) { setContent(q.data.content); setDirty(false); } }, [q.data]);

  const save = useMutation({
    mutationFn: () => saveFn({ data: { server_id: id, path, content } }),
    onSuccess: () => { setDirty(false); qc.invalidateQueries({ queryKey: ["files", id] }); toast.success("Saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Cmd/Ctrl + S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); if (dirty && !save.isPending) save.mutate(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, save]);

  const ext = path.split(".").pop()?.toLowerCase() ?? "txt";

  return (
    <div className={full ? "fixed inset-0 z-50 bg-background p-4" : "space-y-3"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link to="/servers/$id/files" params={{ id }}><Button variant="ghost" size="sm"><ArrowLeft className="mr-1 h-3.5 w-3.5" />Files</Button></Link>
          <span className="font-mono text-sm">{path}</span>
          {dirty && <span className="text-xs text-[oklch(0.85_0.17_80)]">● unsaved</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending} size="sm" className="bg-gradient-to-r from-[oklch(0.66_0.22_296)] to-[oklch(0.62_0.20_258)] text-white">
            {save.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}Save
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setFull((f) => !f)}>{full ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</Button>
        </div>
      </div>

      <div className="glass-strong overflow-hidden rounded-2xl p-1">
        <Editor
          height={full ? "calc(100vh - 100px)" : "70vh"}
          theme="vs-dark"
          language={langMap[ext] ?? "plaintext"}
          value={content}
          onChange={(v) => { setContent(v ?? ""); setDirty(true); }}
          options={{
            fontSize: 13, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            minimap: { enabled: false }, lineNumbers: "on", scrollBeyondLastLine: false,
            automaticLayout: true, wordWrap: "on", smoothScrolling: true,
          }}
        />
      </div>
    </div>
  );
}
