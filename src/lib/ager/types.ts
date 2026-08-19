export const AGER_VERSION = "0.3.0";
export const OKF_VERSION = "0.2";

export const NODE_KINDS = [
  "OrchestratorAgent",
  "WorkerAgent",
  "JudgeAgent",
  "SynthesizerAgent",
  "RouterAgent",
  "GuardrailAgent",
  "HumanGate",
  "Tool",
  "LoopPolicy",
  "ScratchPad",
  "FailurePolicy",
  "Trigger",
] as const;

export type NodeKind = (typeof NODE_KINDS)[number];

export const EDGE_RELS = [
  "routes_to",
  "spawns",
  "judges",
  "fans_out_to",
  "aggregates_from",
  "handoffs_to",
  "guards",
  "uses",
  "controlled_by",
  "writes_to",
  "reads_from",
  "appends_to",
  "on_failure",
  "triggered_by",
  "implements",
] as const;

export type EdgeRel = (typeof EDGE_RELS)[number];

export type LoopControlType =
  | "goal"
  | "deadline"
  | "price_budget"
  | "max_turns"
  | "no_progress";

export interface LoopControl {
  type: LoopControlType;
  id: string;
  expression?: string;
  max?: number;
  max_ms?: number;
  currency?: string;
  on_hit?: string;
  metric?: string;
  window?: number;
  min_delta?: number;
}

export interface ToolRule {
  id: string;
  when: string;
  action: "block" | "allow" | "require_human" | "rewrite_args";
  message: string;
}

export interface NodePermissions {
  canSpawn: boolean;
  ephemeral: boolean;
  ownsScratchpad: boolean;
  timeoutMs: number;
  maxTurns?: number;
}

export interface LoopPolicyFields {
  on_goal: "return" | "continue";
  on_exhaust: "return_best" | "fail" | "return";
  controls: LoopControl[];
}

export interface AgerNode {
  id: string;
  path: string;
  kind: NodeKind;
  title: string;
  description: string;
  role?: string;
  tools: string[];
  permissions: NodePermissions;
  loop?: LoopPolicyFields;
  rules?: ToolRule[];
  instructions?: string;
}

export interface AgerEdge {
  id: string;
  from: string;
  to: string;
  rel: EdgeRel;
}

export interface AgerGraph {
  id: string;
  title: string;
  description: string;
  ager_version: typeof AGER_VERSION;
  okf_version: typeof OKF_VERSION;
  entry: string;
  pattern: string;
  nodes: AgerNode[];
  edges: AgerEdge[];
  updatedAt: string;
}

export interface ConsoleMessage {
  id: string;
  role: "user" | "system";
  text: string;
  at: string;
}

export const KIND_LABEL: Record<NodeKind, string> = {
  OrchestratorAgent: "Orchestrator",
  WorkerAgent: "Worker",
  JudgeAgent: "Judge",
  SynthesizerAgent: "Synthesizer",
  RouterAgent: "Router",
  GuardrailAgent: "Guardrail",
  HumanGate: "Human gate",
  Tool: "Tool",
  LoopPolicy: "Loop policy",
  ScratchPad: "Scratchpad",
  FailurePolicy: "Failure",
  Trigger: "Trigger",
};

export const REL_LABEL: Record<EdgeRel, string> = {
  routes_to: "routes",
  spawns: "spawns",
  judges: "judges",
  fans_out_to: "fans out",
  aggregates_from: "aggregates",
  handoffs_to: "handoff",
  guards: "guards",
  uses: "uses",
  controlled_by: "controlled by",
  writes_to: "writes",
  reads_from: "reads",
  appends_to: "appends",
  on_failure: "on failure",
  triggered_by: "triggered",
  implements: "implements",
};

export function slugify(value: string): string {
  const s = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return s || "node";
}

export function nid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultPermissions(kind: NodeKind): NodePermissions {
  return {
    canSpawn: kind === "OrchestratorAgent",
    ephemeral: kind === "WorkerAgent",
    ownsScratchpad: kind === "OrchestratorAgent",
    timeoutMs: kind === "WorkerAgent" ? 180000 : 120000,
    maxTurns: kind === "WorkerAgent" ? 12 : undefined,
  };
}

export function pathFor(kind: NodeKind, title: string): string {
  const slug = slugify(title);
  if (kind === "Tool") return `/tools/${slug}.md`;
  if (kind === "LoopPolicy") return `/runtime/loop-policy.md`;
  if (kind === "ScratchPad") return `/runtime/scratchpad.md`;
  if (kind === "FailurePolicy") return `/ops/failure-policy.md`;
  if (kind === "Trigger") return `/ops/trigger-${slug}.md`;
  return `/agents/${slug}.md`;
}
