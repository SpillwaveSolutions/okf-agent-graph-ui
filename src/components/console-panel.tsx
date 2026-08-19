import { useEffect, useRef, useState } from "react";
import { useDesigner } from "@/lib/ager/store";
import { BackendPicker } from "./backend-picker";

export function ConsolePanel() {
  const [text, setText] = useState("");
  const messages = useDesigner((s) => s.messages);
  const generating = useDesigner((s) => s.generating);
  const draftText = useDesigner((s) => s.draftText);
  const draftStatus = useDesigner((s) => s.draftStatus);
  const compose = useDesigner((s) => s.compose);
  const loadSample = useDesigner((s) => s.loadSample);
  const newGraph = useDesigner((s) => s.newGraph);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages.length, draftText, draftStatus]);

  function submit() {
    const next = text.trim();
    if (!next) return;
    setText("");
    void compose(next);
  }

  return (
    <section
      data-testid="console-panel"
      className="flex h-full min-h-0 flex-col bg-surface"
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <h2 className="text-xs font-medium tracking-wide text-muted uppercase">
          Describe the loop
        </h2>
        <div className="flex items-center gap-1">
          <BackendPicker />
          <button
            type="button"
            data-testid="load-sample"
            onClick={loadSample}
            className="rounded-xs px-2 py-1 text-xs text-muted hover:bg-raised hover:text-fg"
          >
            Sample
          </button>
          <button
            type="button"
            data-testid="new-graph"
            onClick={newGraph}
            className="rounded-xs px-2 py-1 text-xs text-muted hover:bg-raised hover:text-fg"
          >
            New
          </button>
        </div>
      </header>
      <div
        ref={logRef}
        data-testid="console-log"
        className="min-h-0 flex-1 space-y-3 overflow-auto px-3 py-3"
      >
        {messages.map((m) => (
          <p
            key={m.id}
            className={
              m.role === "user"
                ? "rounded-sm bg-raised px-2.5 py-2 text-sm text-fg"
                : "text-xs leading-relaxed text-muted"
            }
          >
            <span className="mr-1.5 text-[10px] tracking-wide text-subtle uppercase">
              {m.role === "user" ? "You" : "AGER"}
            </span>
            {m.text}
          </p>
        ))}
        {generating && (
          <div data-testid="console-stream" className="space-y-1">
            {draftStatus && (
              <p className="text-[10px] tracking-wide text-subtle uppercase">
                {draftStatus}
              </p>
            )}
            {draftText && (
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-sm bg-raised px-2.5 py-2 font-mono text-[11px] leading-relaxed text-muted">
                {draftText}
              </pre>
            )}
            {!draftText && !draftStatus && (
              <p className="text-xs text-subtle">Drawing…</p>
            )}
          </div>
        )}
      </div>
      <form
        className="border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="sr-only" htmlFor="console-input">
          Loop description
        </label>
        <textarea
          id="console-input"
          data-testid="console-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          rows={5}
          placeholder="A lead orchestrator spawns three web workers, a synthesizer merges findings, and a judge stops at 0.72 or after 6 turns."
          className="field min-h-24 resize-none"
        />
        <button
          type="submit"
          data-testid="console-submit"
          disabled={!text.trim() || generating}
          className="mt-2 w-full rounded-sm bg-accent px-3 py-2.5 text-sm font-medium text-accent-fg disabled:opacity-40"
        >
          {generating ? "Drawing…" : "Draw graph"}
        </button>
        <p className="mt-1.5 text-[10px] text-subtle">⌘ / Ctrl + Enter</p>
      </form>
    </section>
  );
}
