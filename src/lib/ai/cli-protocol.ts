/**
 * Pure helpers for talking to coding-agent CLIs.
 * Shared by the Node server (web) and the Tauri desktop path.
 */

export type CliBackendId = "claude-cli" | "codex-cli" | "grok-cli";

export type AiBackendId = CliBackendId | "grok-api" | "local";

export function isCliBackend(id: string | undefined | null): id is CliBackendId {
  return id === "claude-cli" || id === "codex-cli" || id === "grok-cli";
}

export function isAiBackend(id: string | undefined | null): id is AiBackendId {
  return isCliBackend(id) || id === "grok-api" || id === "local";
}

/**
 * Pull the text out of one line of `claude --output-format stream-json`.
 * Returns "" for progress / tool-use / blank frames.
 */
export function extractStreamJsonToken(line: string): string {
  const trimmed = line.trim();
  if (!trimmed.startsWith("{")) return "";
  try {
    const obj = JSON.parse(trimmed) as Record<string, unknown>;
    if (obj.type === "content_block_delta") {
      const delta = obj.delta as { type?: string; text?: string } | undefined;
      if (delta?.text) return delta.text;
    }
    if (obj.type === "assistant" && typeof obj.message === "object" && obj.message) {
      const msg = obj.message as { content?: Array<{ type?: string; text?: string }> };
      if (Array.isArray(msg.content)) {
        return msg.content.map((c) => c.text ?? "").join("");
      }
    }
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.content === "string") return obj.content;
    if (typeof obj.delta === "string") return obj.delta;
    if (obj.type === "item.completed" || obj.type === "message") {
      const item = obj.item as { text?: string; content?: string } | undefined;
      if (item?.text) return item.text;
      if (item?.content) return item.content;
    }
  } catch {
    return "";
  }
  return "";
}

export const CLI_PREFERENCE = ["grok-cli", "claude-cli", "codex-cli"] as const;

export function cliOutputMode(backend: CliBackendId): "stream-json" | "text" {
  return backend === "claude-cli" ? "stream-json" : "text";
}

export const BACKEND_META: Record<
  AiBackendId,
  { label: string; binary?: string; description: string }
> = {
  "grok-cli": {
    label: "Grok CLI",
    binary: "grok",
    description: "grok chat --stream / grok -p",
  },
  "claude-cli": {
    label: "Claude Code",
    binary: "claude",
    description: "claude -p --output-format stream-json",
  },
  "codex-cli": {
    label: "Codex",
    binary: "codex",
    description: "codex exec (streams stdout)",
  },
  "grok-api": {
    label: "Grok API",
    description: "xAI chat completions (stream)",
  },
  local: {
    label: "Local",
    description: "Heuristic compose, no model",
  },
};
