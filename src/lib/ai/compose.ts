import { createServerFn } from "@tanstack/react-start";
import { heuristicCompose } from "@/lib/ager/parse";
import type { AgerGraph } from "@/lib/ager/types";
import { graphFromModelText } from "@/lib/ai/schema";
import { streamGrokApi } from "@/lib/ai/grok-api";

/** One-shot fallback used by older callers. Prefer POST /api/ai/stream. */
export const composeGraph = createServerFn({ method: "POST" })
  .validator((input: { prompt: string; current: AgerGraph }) => input)
  .handler(async ({ data }) => {
    if (!process.env.XAI_API_KEY) {
      return {
        ok: true as const,
        source: "local" as const,
        graph: heuristicCompose(data.prompt, data.current),
      };
    }
    try {
      let full = "";
      for await (const chunk of streamGrokApi(data.prompt, data.current)) {
        if (chunk.type === "token" && chunk.text) full += chunk.text;
        if (chunk.type === "done" && chunk.text) full = chunk.text;
        if (chunk.type === "error") {
          return { ok: false as const, error: chunk.message ?? "Compose failed" };
        }
      }
      const graph = graphFromModelText(full, data.current);
      if (!graph) {
        return {
          ok: true as const,
          source: "local" as const,
          graph: heuristicCompose(data.prompt, data.current),
        };
      }
      return { ok: true as const, source: "ai" as const, graph };
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : "Compose failed",
      };
    }
  });
