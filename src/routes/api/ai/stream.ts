import { createFileRoute } from "@tanstack/react-router";
import { heuristicCompose } from "@/lib/ager/parse";
import type { AgerGraph } from "@/lib/ager/types";
import { isCliBackend, isAiBackend, type AiBackendId } from "@/lib/ai/cli-protocol";
import { streamCliAgent } from "@/lib/ai/cli-backends";
import { streamGrokApi } from "@/lib/ai/grok-api";
import { graphFromModelText } from "@/lib/ai/schema";

export interface ComposeStreamEvent {
  type: "token" | "status" | "done" | "error";
  text?: string;
  message?: string;
  graph?: AgerGraph;
  source?: string;
}

function sse(event: ComposeStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function parseBody(raw: unknown): {
  prompt: string;
  current: AgerGraph;
  backend: AiBackendId;
} {
  const data = raw as {
    prompt?: string;
    current?: AgerGraph;
    backend?: string;
  };
  if (!data?.prompt || typeof data.prompt !== "string") {
    throw new Error("Missing prompt");
  }
  if (!data.current || typeof data.current !== "object" || !Array.isArray(data.current.nodes)) {
    throw new Error("Missing current graph");
  }
  const backend = isAiBackend(data.backend) ? data.backend : "local";
  return {
    prompt: data.prompt.slice(0, 8000),
    current: data.current,
    backend,
  };
}

export const Route = createFileRoute("/api/ai/stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
        }

        let parsed: ReturnType<typeof parseBody>;
        try {
          parsed = parseBody(body);
        } catch (e) {
          return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "Bad request" }),
            { status: 400 },
          );
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const send = (ev: ComposeStreamEvent) => {
              controller.enqueue(encoder.encode(sse(ev)));
            };
            try {
              if (parsed.backend === "local") {
                const graph = heuristicCompose(parsed.prompt, parsed.current);
                send({ type: "status", message: "Local compose" });
                send({ type: "done", text: "", graph, source: "local" });
                return;
              }

              let full = "";
              let failed = false;

              const consume = async (
                iter: AsyncGenerator<{
                  type: "token" | "status" | "done" | "error";
                  text?: string;
                  message?: string;
                }>,
                source: string,
              ) => {
                for await (const chunk of iter) {
                  if (chunk.type === "token" && chunk.text) {
                    full += chunk.text;
                    send({ type: "token", text: chunk.text });
                  } else if (chunk.type === "status") {
                    send({ type: "status", message: chunk.message });
                  } else if (chunk.type === "done") {
                    full = chunk.text || full;
                    const graph = graphFromModelText(full, parsed.current);
                    send({
                      type: "done",
                      text: full,
                      graph: graph ?? undefined,
                      source,
                    });
                  } else if (chunk.type === "error") {
                    failed = true;
                    send({ type: "error", message: chunk.message });
                  }
                }
              };

              if (isCliBackend(parsed.backend)) {
                await consume(
                  streamCliAgent(parsed.backend, parsed.prompt, parsed.current),
                  parsed.backend,
                );
              } else {
                await consume(streamGrokApi(parsed.prompt, parsed.current), "grok-api");
              }

              if (failed && !full.trim()) {
                const graph = heuristicCompose(parsed.prompt, parsed.current);
                send({
                  type: "status",
                  message: "Fell back to local compose",
                });
                send({ type: "done", text: "", graph, source: "local" });
              }
            } catch (err) {
              send({
                type: "error",
                message: err instanceof Error ? err.message : String(err),
              });
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
