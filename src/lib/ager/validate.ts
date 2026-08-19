import type { AgerGraph } from "./types";

export interface Issue {
  level: "error" | "warn";
  message: string;
}

export function validateGraph(graph: AgerGraph): Issue[] {
  const issues: Issue[] = [];
  if (!graph.nodes.length) {
    issues.push({ level: "error", message: "Graph has no nodes." });
  }
  const ids = new Set(graph.nodes.map((n) => n.id));
  if (graph.entry && !ids.has(graph.entry)) {
    issues.push({ level: "error", message: `Entry "${graph.entry}" is missing.` });
  }
  const orch = graph.nodes.filter((n) => n.kind === "OrchestratorAgent");
  if (orch.length === 0) {
    issues.push({ level: "warn", message: "No OrchestratorAgent." });
  }
  const loops = graph.nodes.filter((n) => n.kind === "LoopPolicy");
  if (loops.length === 0) {
    issues.push({ level: "warn", message: "No LoopPolicy — add exit controls." });
  }
  for (const loop of loops) {
    if (!loop.loop) {
      issues.push({ level: "error", message: `${loop.title} is missing controls.` });
      continue;
    }
    if (!loop.loop.on_goal) {
      issues.push({ level: "error", message: `${loop.title} missing on_goal.` });
    }
    if (!loop.loop.on_exhaust) {
      issues.push({ level: "error", message: `${loop.title} missing on_exhaust.` });
    }
    const types = new Set(loop.loop.controls.map((c) => c.type));
    if (!types.has("goal")) {
      issues.push({ level: "warn", message: `${loop.title} has no goal control.` });
    }
  }
  for (const e of graph.edges) {
    if (!ids.has(e.from) || !ids.has(e.to)) {
      issues.push({
        level: "error",
        message: `Dangling edge ${e.rel} (${e.from} → ${e.to}).`,
      });
    }
  }
  return issues;
}
