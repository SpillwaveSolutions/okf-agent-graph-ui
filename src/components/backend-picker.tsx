import { useEffect, useState } from "react";
import { BACKEND_META, isCliBackend, type AiBackendId } from "@/lib/ai/cli-protocol";
import { useAiSettings } from "@/lib/ai/settings";
import { isTauri } from "@/lib/tauri";

const ORDER: AiBackendId[] = ["grok-cli", "claude-cli", "codex-cli", "grok-api", "local"];

interface Status {
  clis: { id: string; available: boolean }[];
  grokApi: boolean;
}

export function BackendPicker() {
  const backend = useAiSettings((s) => s.backend);
  const setBackend = useAiSettings((s) => s.setBackend);
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (isTauri()) {
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          const clis = await Promise.all(
            (["grok-cli", "claude-cli", "codex-cli"] as const).map(async (id) => ({
              id,
              available: await invoke<boolean>("ai_cli_available", { backend: id }),
            })),
          );
          if (!cancelled) setStatus({ clis, grokApi: false });
          return;
        } catch {
          if (!cancelled) setStatus({ clis: [], grokApi: false });
          return;
        }
      }
      try {
        const res = await fetch("/api/ai/backends");
        if (!res.ok) return;
        const data = (await res.json()) as Status;
        if (!cancelled) setStatus(data);
      } catch {
        /* picker still works without probes */
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function available(id: AiBackendId): boolean | undefined {
    if (id === "local") return true;
    if (id === "grok-api") return status ? status.grokApi : undefined;
    if (!status) return undefined;
    return status.clis.find((c) => c.id === id)?.available;
  }

  return (
    <label className="flex items-center gap-1.5">
      <span className="sr-only">AI backend</span>
      <select
        data-testid="ai-backend"
        value={backend}
        onChange={(e) => setBackend(e.target.value as AiBackendId)}
        className="max-w-36 truncate rounded-xs border-0 bg-transparent py-1 pr-1 text-[11px] text-muted hover:text-fg focus:outline-none"
        title={BACKEND_META[backend].description}
      >
        {ORDER.map((id) => {
          const ok = available(id);
          const mark = ok === false && isCliBackend(id) ? " · missing" : "";
          return (
            <option key={id} value={id}>
              {BACKEND_META[id].label}
              {mark}
            </option>
          );
        })}
      </select>
    </label>
  );
}
