import type { AgerGraph, AgerNode, NodeKind } from "./types";

export interface LaidNode {
  node: AgerNode;
  x: number;
  y: number;
  w: number;
  h: number;
  band: "flow" | "ops";
}

const FLOW_ROW: Partial<Record<NodeKind, number>> = {
  Trigger: 0,
  OrchestratorAgent: 1,
  RouterAgent: 1,
  WorkerAgent: 2,
  HumanGate: 2,
  GuardrailAgent: 2,
  SynthesizerAgent: 3,
  JudgeAgent: 4,
};

export const NODE_W = 176;
export const NODE_H = 78;

const ROW_GAP = 96;
const COL_GAP = 28;
const PAD = 36;
const OPS_GAP = 16;
const FLOW_OPS_GAP = 48;

export function isOps(kind: NodeKind): boolean {
  return (
    kind === "LoopPolicy" ||
    kind === "ScratchPad" ||
    kind === "Tool" ||
    kind === "FailurePolicy"
  );
}

export function layoutGraph(graph: AgerGraph): {
  nodes: LaidNode[];
  width: number;
  height: number;
} {
  const flow: AgerNode[] = [];
  const ops: AgerNode[] = [];
  for (const n of graph.nodes) {
    if (isOps(n.kind)) ops.push(n);
    else flow.push(n);
  }

  const rows = new Map<number, AgerNode[]>();
  for (const n of flow) {
    const r = FLOW_ROW[n.kind] ?? 2;
    const list = rows.get(r) ?? [];
    list.push(n);
    rows.set(r, list);
  }
  const rowKeys = [...rows.keys()].sort((a, b) => a - b);

  let flowWidth = NODE_W;
  for (const key of rowKeys) {
    const list = rows.get(key) ?? [];
    flowWidth = Math.max(flowWidth, list.length * NODE_W + (list.length - 1) * COL_GAP);
  }

  const flowHeight =
    rowKeys.length === 0
      ? 0
      : rowKeys.length * NODE_H + (rowKeys.length - 1) * ROW_GAP;
  const opsHeight =
    ops.length === 0 ? 0 : ops.length * NODE_H + (ops.length - 1) * OPS_GAP;

  const laid: LaidNode[] = [];
  rowKeys.forEach((key, ri) => {
    const list = rows.get(key) ?? [];
    const rowW = list.length * NODE_W + (list.length - 1) * COL_GAP;
    const startX = PAD + (flowWidth - rowW) / 2;
    const y = PAD + ri * (NODE_H + ROW_GAP);
    list.forEach((node, i) => {
      laid.push({
        node,
        x: startX + i * (NODE_W + COL_GAP),
        y,
        w: NODE_W,
        h: NODE_H,
        band: "flow",
      });
    });
  });

  const opsX = PAD + flowWidth + (ops.length ? FLOW_OPS_GAP : 0);
  const opsStartY = PAD + Math.max(0, (Math.max(flowHeight, opsHeight) - opsHeight) / 2);
  ops.forEach((node, i) => {
    laid.push({
      node,
      x: opsX,
      y: opsStartY + i * (NODE_H + OPS_GAP),
      w: NODE_W,
      h: NODE_H,
      band: "ops",
    });
  });

  const width =
    PAD + flowWidth + (ops.length ? FLOW_OPS_GAP + NODE_W : 0) + PAD;
  const height = PAD + Math.max(flowHeight, opsHeight, NODE_H) + PAD;

  return { nodes: laid, width, height };
}

export function centerOf(n: LaidNode): { x: number; y: number } {
  return { x: n.x + n.w / 2, y: n.y + n.h / 2 };
}

export function port(
  n: LaidNode,
  side: "top" | "bottom" | "left" | "right",
): { x: number; y: number } {
  if (side === "top") return { x: n.x + n.w / 2, y: n.y };
  if (side === "bottom") return { x: n.x + n.w / 2, y: n.y + n.h };
  if (side === "left") return { x: n.x, y: n.y + n.h / 2 };
  return { x: n.x + n.w, y: n.y + n.h / 2 };
}
