import { useMemo } from "react";
import { centerOf, layoutGraph, port, type LaidNode } from "@/lib/ager/layout";
import { KIND_LABEL, REL_LABEL, type EdgeRel, type NodeKind } from "@/lib/ager/types";
import { useDesigner } from "@/lib/ager/store";
import { cn } from "@/lib/utils";

const PRIMARY: EdgeRel[] = [
  "triggered_by",
  "spawns",
  "routes_to",
  "fans_out_to",
  "aggregates_from",
  "judges",
  "handoffs_to",
  "guards",
];

const KIND_MARK: Record<NodeKind, string> = {
  OrchestratorAgent: "var(--color-accent)",
  WorkerAgent: "var(--color-muted)",
  JudgeAgent: "var(--color-warn)",
  SynthesizerAgent: "var(--color-ok)",
  RouterAgent: "var(--color-accent)",
  GuardrailAgent: "var(--color-warn)",
  HumanGate: "var(--color-warn)",
  Tool: "var(--color-muted)",
  LoopPolicy: "var(--color-accent)",
  ScratchPad: "var(--color-muted)",
  FailurePolicy: "var(--color-danger)",
  Trigger: "var(--color-subtle)",
};

function edgePath(a: LaidNode, b: LaidNode): string {
  if (a.band === "flow" && b.band === "flow") {
    const p = port(a, "bottom");
    const q = port(b, "top");
    const mid = (p.y + q.y) / 2;
    return `M ${p.x} ${p.y} C ${p.x} ${mid}, ${q.x} ${mid}, ${q.x} ${q.y}`;
  }
  const fromRight = a.band === "flow";
  const p = port(a, fromRight ? "right" : "left");
  const q = port(b, fromRight ? "left" : "right");
  const mid = (p.x + q.x) / 2;
  return `M ${p.x} ${p.y} C ${mid} ${p.y}, ${mid} ${q.y}, ${q.x} ${q.y}`;
}

function labelPoint(a: LaidNode, b: LaidNode): { x: number; y: number } {
  const p = centerOf(a);
  const q = centerOf(b);
  return { x: p.x * 0.35 + q.x * 0.65, y: p.y * 0.35 + q.y * 0.65 };
}

export function GraphCanvas() {
  const graph = useDesigner((s) => s.graph);
  const selectedId = useDesigner((s) => s.selectedId);
  const select = useDesigner((s) => s.select);
  const laid = useMemo(() => layoutGraph(graph), [graph]);
  const byId = useMemo(
    () => new Map(laid.nodes.map((n) => [n.node.id, n])),
    [laid.nodes],
  );

  if (!graph.nodes.length) {
    return (
      <div
        data-testid="graph-canvas"
        className="graph-stage grid h-full min-h-64 place-items-center px-6 text-center text-sm text-muted"
      >
        Describe a loop to draw nodes.
      </div>
    );
  }

  return (
    <div
      data-testid="graph-canvas"
      className="graph-stage h-full min-h-64 overflow-auto"
      role="region"
      aria-label="Agent graph"
      onClick={() => select(null)}
    >
      <svg
        width={Math.max(laid.width, 520)}
        height={Math.max(laid.height, 420)}
        className="block"
      >
        <defs>
          <marker
            id="ager-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--color-subtle)" />
          </marker>
        </defs>
        {graph.edges
          .filter((e) => {
            if (e.rel !== "aggregates_from") return true;
            return !graph.edges.some(
              (o) =>
                o.rel === "fans_out_to" && o.from === e.to && o.to === e.from,
            );
          })
          .map((e) => {
          const a = byId.get(e.from);
          const b = byId.get(e.to);
          if (!a || !b) return null;
          const primary = PRIMARY.includes(e.rel);
          const hot = selectedId === e.from || selectedId === e.to;
          const label = REL_LABEL[e.rel] ?? e.rel;
          const lp = labelPoint(a, b);
          return (
            <g key={e.id} opacity={selectedId && !hot ? 0.28 : 1}>
              <path
                d={edgePath(a, b)}
                fill="none"
                stroke={hot ? "var(--color-accent)" : "var(--color-line)"}
                strokeWidth={primary ? 1.5 : 1}
                strokeDasharray={primary ? undefined : "4 4"}
                markerEnd="url(#ager-arrow)"
              />
              {primary && (
                <text
                  x={lp.x}
                  y={lp.y}
                  textAnchor="middle"
                  fontSize={9}
                  className="fill-subtle"
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}
        {laid.nodes.map((item) => {
          const { node, x, y, w, h } = item;
          const selected = node.id === selectedId;
          const mark = KIND_MARK[node.kind];
          return (
            <g key={node.id} transform={`translate(${x} ${y})`}>
              <rect
                width={w}
                height={h}
                rx={10}
                fill={selected ? "var(--color-raised)" : "var(--color-surface)"}
                stroke={selected ? "var(--color-accent)" : "var(--color-border)"}
                strokeWidth={selected ? 2 : 1}
              />
              <rect x={1} y={10} width={3} height={h - 20} rx={1.5} fill={mark} />
              <foreignObject width={w} height={h}>
                <button
                  type="button"
                  data-testid={`node-${node.id}`}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    select(node.id);
                  }}
                  className={cn(
                    "flex h-full w-full flex-col items-start justify-center gap-0.5 py-2 pr-3 pl-4 text-left",
                  )}
                >
                  <span className="text-[10px] tracking-wide text-subtle uppercase">
                    {KIND_LABEL[node.kind]}
                  </span>
                  <span className="line-clamp-2 text-sm font-medium text-fg">
                    {node.title}
                  </span>
                </button>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
