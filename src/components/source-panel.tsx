import { downloadText } from "@/lib/ager/export";
import { useDesigner, useSources } from "@/lib/ager/store";

export function SourcePanel() {
  const tab = useDesigner((s) => s.sourceTab);
  const setTab = useDesigner((s) => s.setSourceTab);
  const graph = useDesigner((s) => s.graph);
  const { okf, mermaid } = useSources();
  const text = tab === "okf" ? okf : mermaid;

  return (
    <section className="flex h-full min-h-0 flex-col bg-bg">
      <div
        data-testid="source-tabs"
        role="tablist"
        className="flex items-center gap-1 border-b border-border px-3 py-2"
      >
        {(["okf", "mermaid"] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={
              tab === id
                ? "rounded-xs bg-raised px-3 py-1.5 text-xs font-medium"
                : "rounded-xs px-3 py-1.5 text-xs text-muted hover:text-fg"
            }
          >
            {id === "okf" ? "OKF" : "Mermaid"}
          </button>
        ))}
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(text)}
            className="rounded-xs px-2 py-1 text-xs text-muted hover:bg-raised hover:text-fg"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={() =>
              downloadText(
                tab === "okf"
                  ? `${slug(graph.title)}.ager.md`
                  : `${slug(graph.title)}.mmd`,
                text,
              )
            }
            className="rounded-xs px-2 py-1 text-xs text-muted hover:bg-raised hover:text-fg"
          >
            Download
          </button>
        </div>
      </div>
      <pre className="min-h-0 flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-fg">
        {text}
      </pre>
    </section>
  );
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "graph";
}
