/**
 * Coding-agent CLI backends — Claude Code · Codex · Grok Build.
 * Streaming stdout when the CLI supports it. Same argv as Forge Notes.
 */
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import {
  extractStreamJsonToken,
  isCliBackend,
  type CliBackendId,
} from "@/lib/ai/cli-protocol";
import { AGER_SYSTEM, buildUserPrompt, composeCliPrompt } from "@/lib/ai/schema";
import type { AgerGraph } from "@/lib/ager/types";

export { isCliBackend };
export type { CliBackendId };

export interface CliBackendInfo {
  id: CliBackendId;
  label: string;
  binary: string;
  available: boolean;
  supportsStream: boolean;
}

const BIN: Record<CliBackendId, string> = {
  "claude-cli": "claude",
  "codex-cli": "codex",
  "grok-cli": "grok",
};

async function which(bin: string): Promise<boolean> {
  if (bin.includes("/")) {
    try {
      await access(bin, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }
  return new Promise((resolve) => {
    const child = spawn("which", [bin], { stdio: "ignore" });
    child.on("close", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

export async function listCliBackends(): Promise<CliBackendInfo[]> {
  const defs: Array<Omit<CliBackendInfo, "available">> = [
    {
      id: "claude-cli",
      label: "Claude Code CLI",
      binary: "claude",
      supportsStream: true,
    },
    {
      id: "codex-cli",
      label: "Codex CLI",
      binary: "codex",
      supportsStream: true,
    },
    {
      id: "grok-cli",
      label: "Grok CLI / Grok Build",
      binary: "grok",
      supportsStream: true,
    },
  ];
  const out: CliBackendInfo[] = [];
  for (const d of defs) {
    out.push({ ...d, available: await which(d.binary) });
  }
  return out;
}

export interface CliStreamChunk {
  type: "token" | "status" | "done" | "error";
  text?: string;
  message?: string;
}

function buildArgs(
  backend: CliBackendId,
  prompt: string,
  stream: boolean,
): { bin: string; args: string[]; mode: "stream-json" | "text" } {
  const bin = BIN[backend];
  if (backend === "claude-cli") {
    if (stream) {
      return {
        bin,
        args: ["-p", prompt, "--output-format", "stream-json", "--verbose"],
        mode: "stream-json",
      };
    }
    return { bin, args: ["-p", prompt, "--output-format", "text"], mode: "text" };
  }
  if (backend === "codex-cli") {
    return {
      bin,
      args: ["exec", "--skip-git-repo-check", prompt],
      mode: "text",
    };
  }
  if (stream) {
    return { bin, args: ["chat", "--stream", prompt], mode: "text" };
  }
  return { bin, args: ["chat", prompt], mode: "text" };
}

function fallbackArgs(
  backend: CliBackendId,
  prompt: string,
): { bin: string; args: string[]; mode: "stream-json" | "text" } | null {
  const bin = BIN[backend];
  if (backend === "claude-cli") return { bin, args: ["-p", prompt], mode: "text" };
  if (backend === "codex-cli") return { bin, args: ["exec", prompt], mode: "text" };
  if (backend === "grok-cli") return { bin, args: ["-p", prompt], mode: "text" };
  return null;
}

type QItem =
  | CliStreamChunk
  | { type: "__end__" }
  | { type: "__err__"; error: Error };

function runProcessToQueue(
  bin: string,
  args: string[],
  mode: "stream-json" | "text",
  push: (item: QItem) => void,
  timeoutMs = 180_000,
) {
  let child;
  try {
    child = spawn(bin, args, {
      env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    push({ type: "__err__", error: err instanceof Error ? err : new Error(String(err)) });
    push({ type: "__end__" });
    return;
  }

  let stdout = "";
  let stderr = "";
  let lineBuf = "";
  let assembled = "";
  let sawStreamTokens = false;
  let settled = false;

  const settle = (item?: QItem) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    if (item) push(item);
    push({ type: "__end__" });
  };

  const timer = setTimeout(() => {
    child.kill("SIGTERM");
    settle({
      type: "__err__",
      error: new Error(`${bin} timed out after ${timeoutMs}ms`),
    });
  }, timeoutMs);

  child.stdout?.on("data", (chunk: Buffer) => {
    const s = String(chunk);
    stdout += s;
    if (mode === "stream-json") {
      lineBuf += s;
      const parts = lineBuf.split("\n");
      lineBuf = parts.pop() ?? "";
      for (const line of parts) {
        const token = extractStreamJsonToken(line);
        if (token) {
          sawStreamTokens = true;
          assembled += token;
          push({ type: "token", text: token });
        }
      }
    } else {
      push({ type: "token", text: s });
    }
  });

  child.stderr?.on("data", (chunk: Buffer) => {
    stderr += String(chunk);
  });

  child.on("error", (err) => {
    settle({ type: "__err__", error: err });
  });

  child.on("close", (code) => {
    if (mode === "stream-json" && lineBuf.trim()) {
      const token = extractStreamJsonToken(lineBuf);
      if (token) {
        sawStreamTokens = true;
        assembled += token;
        push({ type: "token", text: token });
      }
    }
    const finalText = (sawStreamTokens ? assembled : stdout).trim();
    if (code !== 0 && !finalText) {
      settle({
        type: "__err__",
        error: new Error(stderr.trim() || `${bin} exited ${code}`),
      });
      return;
    }
    push({ type: "done", text: finalText || stdout.trim() });
    settle();
  });
}

async function* drainQueue(
  start: (push: (item: QItem) => void) => void,
): AsyncGenerator<CliStreamChunk> {
  const queue: QItem[] = [];
  let wake: (() => void) | null = null;
  const push = (item: QItem) => {
    queue.push(item);
    wake?.();
  };
  start(push);

  let finished = false;
  while (!finished) {
    if (queue.length === 0) {
      await new Promise<void>((r) => {
        wake = r;
      });
      wake = null;
    }
    while (queue.length) {
      const item = queue.shift()!;
      if (item.type === "__end__") {
        finished = true;
        break;
      }
      if (item.type === "__err__") {
        yield { type: "error", message: item.error.message };
        finished = true;
        break;
      }
      yield item;
    }
  }
}

export async function* streamCliAgent(
  backend: CliBackendId,
  prompt: string,
  current: AgerGraph,
): AsyncGenerator<CliStreamChunk> {
  const available = await which(BIN[backend]);
  if (!available) {
    yield {
      type: "error",
      message: `${BIN[backend]} not found on PATH. Install the CLI and authenticate (claude login / codex login / grok login).`,
    };
    return;
  }

  const composed = composeCliPrompt(AGER_SYSTEM, buildUserPrompt(prompt, current));
  const primary = buildArgs(backend, composed, true);

  yield { type: "status", message: `Starting ${backend}…` };
  yield {
    type: "status",
    message: `$ ${primary.bin} ${primary.args[0] ?? ""} …`,
  };

  let hadError = false;
  let hadDone = false;
  for await (const chunk of drainQueue((push) =>
    runProcessToQueue(primary.bin, primary.args, primary.mode, push),
  )) {
    if (chunk.type === "error") {
      hadError = true;
      const fb = fallbackArgs(backend, composed);
      if (!fb) {
        yield chunk;
        return;
      }
      yield { type: "status", message: `Primary failed (${chunk.message}). Retrying fallback…` };
      for await (const c2 of drainQueue((push) =>
        runProcessToQueue(fb.bin, fb.args, fb.mode, push),
      )) {
        if (c2.type === "done") hadDone = true;
        yield c2;
      }
      return;
    }
    if (chunk.type === "done") hadDone = true;
    yield chunk;
  }

  if (!hadDone && !hadError) {
    yield { type: "error", message: "CLI produced no output" };
  }
}
