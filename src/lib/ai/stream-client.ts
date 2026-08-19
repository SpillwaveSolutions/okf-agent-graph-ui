import type { AgerGraph } from "@/lib/ager/types";
import {
  BACKEND_META,
  isCliBackend,
  type AiBackendId,
} from "@/lib/ai/cli-protocol";
import { AGER_SYSTEM, buildUserPrompt, composeCliPrompt, graphFromModelText } from "@/lib/ai/schema";
import { firstAvailableDesktopCli, runDesktopCli } from "@/lib/ai/desktop-cli";
import { isTauri } from "@/lib/tauri";

export interface ComposeStreamEvent {
  type: "token" | "status" | "done" | "error";
  text?: string;
  message?: string;
  graph?: AgerGraph;
  source?: string;
}

export interface StreamComposeOptions {
  prompt: string;
  current: AgerGraph;
  backend: AiBackendId;
  signal?: AbortSignal;
  onToken?: (text: string, full: string) => void;
  onStatus?: (message: string) => void;
}

export interface StreamComposeResult {
  text: string;
  graph: AgerGraph | null;
  source: string;
  error?: string;
}

function parseSseFrame(part: string): ComposeStreamEvent | null {
  const line = part
    .split("\n")
    .filter((l) => l.startsWith("data:"))
    .map((l) => l.slice(5).trim())
    .join("");
  if (!line) return null;
  try {
    return JSON.parse(line) as ComposeStreamEvent;
  } catch {
    return null;
  }
}

export async function streamCompose(opts: StreamComposeOptions): Promise<StreamComposeResult> {
  let backend = opts.backend;
  if (isTauri() && !isCliBackend(backend) && backend !== "local") {
    backend = (await firstAvailableDesktopCli()) ?? "local";
  }

  if (isTauri() && isCliBackend(backend)) {
    const prompt = composeCliPrompt(AGER_SYSTEM, buildUserPrompt(opts.prompt, opts.current));
    const raw = await runDesktopCli({
      backend,
      prompt,
      signal: opts.signal,
      onToken: opts.onToken,
      onStatus: opts.onStatus,
    });
    return {
      text: raw.text,
      graph: graphFromModelText(raw.text, opts.current),
      source: backend,
    };
  }

  const res = await fetch("/api/ai/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({
      prompt: opts.prompt,
      current: opts.current,
      backend,
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Stream failed (${res.status})`);
  }
  if (!res.body) throw new Error("No response body for stream");

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    throw new Error(
      contentType.includes("text/html")
        ? "AI needs the AGER server. Use the web preview, or pick a CLI in the desktop app."
        : `Expected an event stream, got ${contentType || "no content type"}.`,
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  let graph: AgerGraph | null = null;
  let source: string = backend;
  let streamError: string | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const ev = parseSseFrame(part);
      if (!ev) continue;
      if (ev.type === "token" && ev.text) {
        full += ev.text;
        opts.onToken?.(ev.text, full);
      } else if (ev.type === "status" && ev.message) {
        opts.onStatus?.(ev.message);
      } else if (ev.type === "done") {
        if (ev.text) full = ev.text;
        if (ev.graph) graph = ev.graph;
        if (ev.source) source = ev.source;
      } else if (ev.type === "error") {
        streamError = ev.message || "Stream error";
      }
    }
  }

  if (!graph && full.trim()) {
    graph = graphFromModelText(full, opts.current);
  }

  return { text: full, graph, source, error: streamError };
}

export function backendLabel(id: string): string {
  return BACKEND_META[id as AiBackendId]?.label ?? id;
}
