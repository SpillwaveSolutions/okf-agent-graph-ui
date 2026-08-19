import { createServerFn } from "@tanstack/react-start";
import { heuristicCompose } from "@/lib/ager/parse";
import {
  AGER_VERSION,
  OKF_VERSION,
  type AgerGraph,
  type AgerNode,
  type AgerEdge,
  NODE_KINDS,
  EDGE_RELS,
} from "@/lib/ager/types";

const SYSTEM = `You design AGER (OKF Agent Graph Engineering Runtime) multi-agent loops.
Return ONLY compact JSON matching:
{
  "title": string,
  "description": string,
  "pattern": string,
  "entry": string,
  "nodes": [{
    "id": string, "kind": one of ${NODE_KINDS.join("|")},
    "title": string, "description": string, "role": string?,
    "tools": string[], "instructions": string?,
    "permissions": { "canSpawn": bool, "ephemeral": bool, "ownsScratchpad": bool, "timeoutMs": number, "maxTurns": number? },
    "loop": { "on_goal": "return"|"continue", "on_exhaust": "return_best"|"fail"|"return",
      "controls": [{ "type": "goal"|"deadline"|"price_budget"|"max_turns"|"no_progress", "id": string, "expression"?: string, "max"?: number, "max_ms"?: number, "currency"?: string, "metric"?: string, "window"?: number, "min_delta"?: number }]
    }?,
    "rules": [{ "id": string, "when": string, "action": "block"|"allow"|"require_human"|"rewrite_args", "message": string }]?
  }],
  "edges": [{ "from": string, "to": string, "rel": one of ${EDGE_RELS.join("|")} }]
}
Rules:
- Always include one OrchestratorAgent, one LoopPolicy (with on_goal, on_exhaust, and at least goal + max_turns), and a ScratchPad.
- Typed edges only. LoopPolicy is targeted by controlled_by.
- Tools the workers use must exist as Tool nodes with uses edges.
- Keep 4–12 nodes. ids are slug-like.
- If the user refines an existing graph, preserve ids when possible and apply the change.`;

function coerceGraph(raw: unknown, fallback: AgerGraph): AgerGraph | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const nodesIn = Array.isArray(o.nodes) ? o.nodes : null;
  const edgesIn = Array.isArray(o.edges) ? o.edges : null;
  if (!nodesIn?.length) return null;
  const nodes: AgerNode[] = [];
  for (const item of nodesIn) {
    if (!item || typeof item !== "object") continue;
    const n = item as Record<string, unknown>;
    const kind = NODE_KINDS.includes(n.kind as AgerNode["kind"])
      ? (n.kind as AgerNode["kind"])
      : "WorkerAgent";
    const id = String(n.id || "").trim() || `n${nodes.length}`;
    const title = String(n.title || id);
    const perms = (n.permissions && typeof n.permissions === "object"
      ? n.permissions
      : {}) as Record<string, unknown>;
    nodes.push({
      id,
      path: String(n.path || `/agents/${id}.md`),
      kind,
      title,
      description: String(n.description || ""),
      role: n.role ? String(n.role) : undefined,
      tools: Array.isArray(n.tools) ? n.tools.map(String) : [],
      permissions: {
        canSpawn: Boolean(perms.canSpawn),
        ephemeral: Boolean(perms.ephemeral),
        ownsScratchpad: Boolean(perms.ownsScratchpad),
        timeoutMs: Number(perms.timeoutMs) || 120000,
        maxTurns: perms.maxTurns !== undefined ? Number(perms.maxTurns) : undefined,
      },
      loop: n.loop && typeof n.loop === "object" ? (n.loop as AgerNode["loop"]) : undefined,
      rules: Array.isArray(n.rules) ? (n.rules as AgerNode["rules"]) : undefined,
      instructions: n.instructions ? String(n.instructions) : undefined,
    });
  }
  if (!nodes.length) return null;
  const ids = new Set(nodes.map((n) => n.id));
  const edges: AgerEdge[] = [];
  for (const item of edgesIn ?? []) {
    if (!item || typeof item !== "object") continue;
    const e = item as Record<string, unknown>;
    const from = String(e.from || "");
    const to = String(e.to || "");
    const rel = EDGE_RELS.includes(e.rel as AgerEdge["rel"])
      ? (e.rel as AgerEdge["rel"])
      : "related_to" as never;
    if (!ids.has(from) || !ids.has(to)) continue;
    if (!EDGE_RELS.includes(rel)) continue;
    edges.push({ id: `e${edges.length + 1}`, from, to, rel });
  }
  const entry = String(o.entry || nodes[0].id);
  return {
    id: fallback.id,
    title: String(o.title || fallback.title),
    description: String(o.description || fallback.description),
    ager_version: AGER_VERSION,
    okf_version: OKF_VERSION,
    entry: ids.has(entry) ? entry : nodes[0].id,
    pattern: String(o.pattern || "custom"),
    nodes,
    edges,
    updatedAt: new Date().toISOString(),
  };
}

export const composeGraph = createServerFn({ method: "POST" })
  .validator((input: { prompt: string; current: AgerGraph }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return {
        ok: true as const,
        source: "local" as const,
        graph: heuristicCompose(data.prompt, data.current),
      };
    }
    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-4.5",
          temperature: 0.2,
          max_tokens: 2400,
          messages: [
            { role: "system", content: SYSTEM },
            {
              role: "user",
              content: `Current graph JSON:\n${JSON.stringify({
                title: data.current.title,
                pattern: data.current.pattern,
                entry: data.current.entry,
                nodes: data.current.nodes.map((n) => ({
                  id: n.id,
                  kind: n.kind,
                  title: n.title,
                  tools: n.tools,
                })),
                edges: data.current.edges.map((e) => ({
                  from: e.from,
                  to: e.to,
                  rel: e.rel,
                })),
              })}\n\nUser request:\n${data.prompt}`,
            },
          ],
        }),
      });
      if (!res.ok) {
        return {
          ok: false as const,
          error: `xAI API error ${res.status}`,
        };
      }
      const body = (await res.json()) as {
        choices: { message: { content: string } }[];
      };
      const text = body.choices[0]?.message.content ?? "";
      const match = text.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : null;
      const graph = coerceGraph(parsed, data.current);
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
