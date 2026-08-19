import { emptyGraph, sampleResearchGraph } from "./sample";
import {
  AGER_VERSION,
  OKF_VERSION,
  defaultPermissions,
  nid,
  pathFor,
  slugify,
  type AgerEdge,
  type AgerGraph,
  type AgerNode,
  type EdgeRel,
  type NodeKind,
} from "./types";

const TOOL_ALIASES: Record<string, string> = {
  search: "web_search",
  web: "web_search",
  google: "web_search",
  browse: "browser",
  browser: "browser",
  code: "code_exec",
  python: "code_exec",
  shell: "shell",
  terminal: "shell",
  file: "fs",
  files: "fs",
  github: "github",
};

function detectTools(text: string): string[] {
  const found = new Set<string>();
  for (const [alias, id] of Object.entries(TOOL_ALIASES)) {
    if (new RegExp(`\\b${alias}\\b`, "i").test(text)) found.add(id);
  }
  return [...found];
}

function countWorkers(text: string): number {
  const m = text.match(
    /(\d+)\s+(workers?|researchers?|specialists?|agents?)/i,
  );
  if (m) return Math.min(6, Math.max(1, Number(m[1])));
  if (/\bthree\b/i.test(text)) return 3;
  if (/\btwo\b/i.test(text)) return 2;
  if (/\bfour\b/i.test(text)) return 4;
  return 1;
}

function maxTurns(text: string): number | undefined {
  const m = text.match(/(\d+)\s+turns?/i);
  if (m) return Number(m[1]);
  return undefined;
}

function budget(text: string): number | undefined {
  const m = text.match(/\$\s?(\d+(?:\.\d+)?)/);
  if (m) return Number(m[1]);
  return undefined;
}

function goalScore(text: string): string | undefined {
  const m = text.match(/0?\.\d{1,2}|threshold\s+(of\s+)?(\d(?:\.\d+)?)/i);
  if (m) return m[0].replace(/threshold\s+(of\s+)?/i, "");
  return undefined;
}

function node(
  kind: NodeKind,
  title: string,
  description: string,
  extras: Partial<AgerNode> = {},
): AgerNode {
  const id = extras.id ?? slugify(title);
  return {
    id,
    path: extras.path ?? pathFor(kind, title),
    kind,
    title,
    description,
    role: extras.role,
    tools: extras.tools ?? [],
    permissions: extras.permissions ?? defaultPermissions(kind),
    loop: extras.loop,
    rules: extras.rules,
    instructions: extras.instructions ?? description,
  };
}

function edge(from: string, to: string, rel: EdgeRel): AgerEdge {
  return { id: nid("e"), from, to, rel };
}

export function heuristicCompose(
  prompt: string,
  current?: AgerGraph,
): AgerGraph {
  const text = prompt.trim();
  const lower = text.toLowerCase();

  if (!text) return current ?? emptyGraph();

  if (
    /sample|research graph|default loop|ager sample/.test(lower) &&
    text.length < 80
  ) {
    return { ...sampleResearchGraph(), updatedAt: new Date().toISOString() };
  }

  const adversarial = /adversarial|critic|reviewer|red.?team/.test(lower);
  const human = /human|approval|gate|reviewer signs/.test(lower);
  const sequential = /pipeline|sequential|then\b|step-by-step/.test(lower);
  const tools = detectTools(lower);
  const workersN = countWorkers(lower);
  const turns = maxTurns(lower) ?? (adversarial ? 8 : 6);
  const price = budget(lower);
  const score = goalScore(lower);

  const nodes: AgerNode[] = [];
  const edges: AgerEdge[] = [];

  const trigger = node("Trigger", "Manual start", "Kick off a run.", {
    id: "trigger",
  });
  const orch = node(
    "OrchestratorAgent",
    adversarial ? "Implementer lead" : "Orchestrator",
    adversarial
      ? "Owns the loop, routes drafts to the critic, re-plans on reject."
      : "Plans work, spawns workers, drives the outer loop.",
    { id: "orch", role: "lead" },
  );
  nodes.push(trigger, orch);
  edges.push(edge("trigger", "orch", "triggered_by"));

  if (adversarial) {
    const critic = node(
      "JudgeAgent",
      "Adversarial critic",
      "Rejects weak drafts; writes revise notes.",
      { id: "critic" },
    );
    nodes.push(critic);
    edges.push(edge("orch", "critic", "judges"));
  } else {
    for (let i = 0; i < workersN; i += 1) {
      const id = workersN === 1 ? "worker" : `worker-${i + 1}`;
      const w = node(
        "WorkerAgent",
        workersN === 1 ? "Worker" : `Worker ${i + 1}`,
        "Isolated doer. Writes structured output to the scratchpad.",
        {
          id,
          tools: tools.length ? tools : ["web_search"],
        },
      );
      nodes.push(w);
      edges.push(edge("orch", w.id, "spawns"));
    }
    if (!sequential) {
      const synth = node(
        "SynthesizerAgent",
        "Synthesizer",
        "Fans in worker outputs into one draft.",
        { id: "synth" },
      );
      nodes.push(synth);
      for (const w of nodes.filter((n) => n.kind === "WorkerAgent")) {
        edges.push(edge(w.id, "synth", "fans_out_to"));
        edges.push(edge("synth", w.id, "aggregates_from"));
      }
    }
    if (/judge|rubric|score|quality/.test(lower) || score) {
      const judge = node(
        "JudgeAgent",
        "Quality judge",
        `Scores drafts. ${score ? `Threshold ${score}.` : "Drives the goal control."}`,
        { id: "judge" },
      );
      nodes.push(judge);
      edges.push(edge("orch", "judge", "routes_to"));
    }
  }

  if (human) {
    const gate = node(
      "HumanGate",
      "Human approval",
      "Interrupt until a person approves the handoff.",
      { id: "human" },
    );
    nodes.push(gate);
    edges.push(edge("orch", "human", "guards"));
  }

  const loop = node(
    "LoopPolicy",
    "Loop controls",
    "Exit on goal or exhaust. Check goal, deadline, price, max turns, no-progress.",
    {
      id: "loop",
      loop: {
        on_goal: "return",
        on_exhaust: "return_best",
        controls: [
          {
            type: "goal",
            id: "goal_pass",
            expression: score
              ? `state.judgment.score >= ${score}`
              : "state.judgment.pass == true",
          },
          { type: "max_turns", id: "outer", max: turns },
          ...(price
            ? [
                {
                  type: "price_budget" as const,
                  id: "cost_cap",
                  max: price,
                  currency: "USD",
                },
              ]
            : []),
          {
            type: "no_progress",
            id: "plateau",
            metric: "state.judgment.score",
            window: 3,
            min_delta: 0.02,
          },
        ],
      },
    },
  );
  nodes.push(loop);
  edges.push(edge("orch", "loop", "controlled_by"));

  const pad = node(
    "ScratchPad",
    "Scratchpad",
    "Salient KV for plans and agent outputs.",
    { id: "pad" },
  );
  nodes.push(pad);
  edges.push(edge("orch", "pad", "writes_to"));

  const usedTools = new Set(
    nodes.flatMap((n) => n.tools).concat(tools),
  );
  for (const t of usedTools) {
    const tool = node("Tool", t.replace(/_/g, " "), `Tool ${t}.`, {
      id: `tool-${t}`,
      path: `/tools/${t}.md`,
    });
    nodes.push(tool);
    for (const w of nodes.filter((n) => n.tools.includes(t))) {
      edges.push(edge(w.id, tool.id, "uses"));
    }
  }

  const title = adversarial
    ? "Adversarial review loop"
    : sequential
      ? "Sequential pipeline"
      : "Orchestrator-workers loop";

  return {
    id: current?.id ?? "draft",
    title,
    description: text.slice(0, 240),
    ager_version: AGER_VERSION,
    okf_version: OKF_VERSION,
    entry: "orch",
    pattern: adversarial
      ? "adversarial-critic"
      : sequential
        ? "sequential"
        : "orchestrator-workers",
    nodes,
    edges,
    updatedAt: new Date().toISOString(),
  };
}

export function applyNodePatch(
  graph: AgerGraph,
  id: string,
  patch: Partial<AgerNode>,
): AgerGraph {
  return {
    ...graph,
    updatedAt: new Date().toISOString(),
    nodes: graph.nodes.map((n) => {
      if (n.id !== id) return n;
      const next = { ...n, ...patch };
      if (patch.kind && patch.kind !== n.kind) {
        next.path = pathFor(patch.kind, next.title);
        next.permissions = {
          ...defaultPermissions(patch.kind),
          ...next.permissions,
        };
      }
      if (patch.title && patch.title !== n.title) {
        next.path = pathFor(next.kind, patch.title);
      }
      return next;
    }),
  };
}
