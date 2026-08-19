/**
 * Run a local coding-agent CLI from the Tauri desktop app.
 * Same binaries as /api/ai/stream; no HTTP server required.
 */
import {
  CLI_PREFERENCE,
  cliOutputMode,
  extractStreamJsonToken,
  type CliBackendId,
} from "@/lib/ai/cli-protocol";
import { isTauri } from "@/lib/tauri";

type CliEvent =
  | { type: "line"; text: string }
  | { type: "status"; message: string }
  | { type: "done"; code: number }
  | { type: "error"; message: string };

export interface DesktopCliOptions {
  backend: CliBackendId;
  prompt: string;
  signal?: AbortSignal;
  onToken?: (text: string, full: string) => void;
  onStatus?: (message: string) => void;
}

export async function desktopCliAvailable(backend: CliBackendId): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<boolean>("ai_cli_available", { backend });
  } catch {
    return false;
  }
}

export async function firstAvailableDesktopCli(): Promise<CliBackendId | null> {
  for (const backend of CLI_PREFERENCE) {
    if (await desktopCliAvailable(backend)) return backend;
  }
  return null;
}

export async function runDesktopCli(opts: DesktopCliOptions): Promise<{ text: string }> {
  const { invoke, Channel } = await import("@tauri-apps/api/core");

  const mode = cliOutputMode(opts.backend);
  let full = "";
  let failure: string | null = null;

  const channel = new Channel<CliEvent>();
  channel.onmessage = (event) => {
    if (event.type === "status") {
      opts.onStatus?.(event.message);
      return;
    }
    if (event.type === "error") {
      failure = event.message;
      return;
    }
    if (event.type !== "line") return;

    const text = mode === "stream-json" ? extractStreamJsonToken(event.text) : `${event.text}\n`;
    if (!text) return;
    full += text;
    opts.onToken?.(text, full);
  };

  await invoke("run_ai_cli", { backend: opts.backend, prompt: opts.prompt, onEvent: channel });

  if (failure && !full.trim()) throw new Error(failure);
  return { text: full.trim() };
}
