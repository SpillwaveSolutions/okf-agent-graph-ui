import type { AgerGraph, AgerNode, LoopControl } from "./types";
import { KIND_LABEL } from "./types";

function yamlScalar(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  const s = String(value);
  if (/[:#\n"'{}[\],&*?|]/.test(s) || s.includes(" ")) {
    return JSON.stringify(s);
  }
  return s;
}

function dumpControl(c: LoopControl, indent: string): string[] {
  const lines = [`${indent}- type: ${c.type}`, `${indent}  id: ${yamlScalar(c.id)}`];
  if (c.expression) lines.push(`${indent}  expression: ${yamlScalar(c.expression)}`);
  if (c.max !== undefined) lines.push(`${indent}  max: ${c.max}`);
  if (c.max_ms !== undefined) lines.push(`${indent}  max_ms: ${c.max_ms}`);
  if (c.currency) lines.push(`${indent}  currency: ${c.currency}`);
  if (c.on_hit) lines.push(`${indent}  on_hit: ${c.on_hit}`);
  if (c.metric) lines.push(`${indent}  metric: ${yamlScalar(c.metric)}`);
  if (c.window !== undefined) lines.push(`${indent}  window: ${c.window}`);
  if (c.min_delta !== undefined) lines.push(`${indent}  min_delta: ${c.min_delta}`);
  return lines;
}

function frontmatter(node: AgerNode, graph: AgerGraph): string {
  const lines = [
    "---",
    `type: ${node.kind}`,
    `title: ${yamlScalar(node.title)}`,
    `description: ${yamlScalar(node.description)}`,
    `ager_version: "${graph.ager_version}"`,
    "status: active",
    `timestamp: ${graph.updatedAt}`,
  ];
  if (node.role) lines.push(`role: ${yamlScalar(node.role)}`);
  if (node.kind === "OrchestratorAgent" || node.kind === "WorkerAgent") {
    lines.push(`can_spawn: ${node.permissions.canSpawn}`);
    lines.push(`ephemeral: ${node.permissions.ephemeral}`);
    lines.push(`owns_scratchpad: ${node.permissions.ownsScratchpad}`);
    lines.push(`timeout_ms: ${node.permissions.timeoutMs}`);
    if (node.permissions.maxTurns !== undefined) {
      lines.push(`max_turns: ${node.permissions.maxTurns}`);
    }
  }
  if (node.tools.length) {
    lines.push("tools:");
    for (const t of node.tools) lines.push(`  - ${t}`);
  }
  if (node.loop) {
    lines.push(`on_goal: ${node.loop.on_goal}`);
    lines.push(`on_exhaust: ${node.loop.on_exhaust}`);
    lines.push("priority: [goal, deadline, price, max_turns, no_progress]");
    lines.push("controls:");
    for (const c of node.loop.controls) {
      lines.push(...dumpControl(c, "  "));
    }
  }
  if (node.rules?.length) {
    lines.push("rules:");
    for (const r of node.rules) {
      lines.push(`  - id: ${yamlScalar(r.id)}`);
      lines.push(`    when: ${yamlScalar(r.when)}`);
      lines.push(`    action: ${r.action}`);
      lines.push(`    message: ${yamlScalar(r.message)}`);
    }
  }
  const outgoing = graph.edges.filter((e) => e.from === node.id);
  if (outgoing.length) {
    lines.push("links:");
    for (const e of outgoing) {
      const target = graph.nodes.find((n) => n.id === e.to);
      lines.push(`  - target: ${target?.path ?? e.to}`);
      lines.push(`    rel: ${e.rel}`);
    }
  }
  lines.push("---");
  lines.push("");
  lines.push(`# ${node.title}`);
  lines.push("");
  lines.push(node.instructions || node.description);
  lines.push("");
  return lines.join("\n");
}

function indexFile(graph: AgerGraph): string {
  const lines = [
    "---",
    `okf_version: "${graph.okf_version}"`,
    `ager_version: "${graph.ager_version}"`,
    "type: AgentGraph",
    `title: ${yamlScalar(graph.title)}`,
    `description: ${yamlScalar(graph.description)}`,
    `entry: ${graph.nodes.find((n) => n.id === graph.entry)?.path ?? graph.entry}`,
    "nodes:",
    ...graph.nodes.map((n) => `  - ${n.path}`),
    `pattern: ${yamlScalar(graph.pattern)}`,
    "status: draft",
    `timestamp: ${graph.updatedAt}`,
    "links:",
    ...graph.edges.slice(0, 24).map((e) => {
      const to = graph.nodes.find((n) => n.id === e.to);
      return `  - target: ${to?.path ?? e.to}\n    rel: ${e.rel}`;
    }),
    "---",
    "",
    `# ${graph.title}`,
    "",
    graph.description,
    "",
    "## Nodes",
    "",
    ...graph.nodes.map((n) => `- [${n.title}](${n.path}) — ${KIND_LABEL[n.kind]}`),
    "",
  ];
  return lines.join("\n");
}

export function exportOkfBundle(graph: AgerGraph): string {
  const parts = [`# ${graph.title} — AGER bundle\n`, `## index.md\n\n${indexFile(graph)}`];
  for (const node of graph.nodes) {
    parts.push(`## ${node.path.replace(/^\//, "")}\n\n${frontmatter(node, graph)}`);
  }
  return parts.join("\n---\n\n");
}

export function mermaidId(id: string): string {
  return id.replace(/[^A-Za-z0-9_]/g, "_");
}

export function exportMermaid(graph: AgerGraph): string {
  const lines = [
    "flowchart TD",
    `  %% ${graph.title}`,
  ];
  for (const n of graph.nodes) {
    const label = `${KIND_LABEL[n.kind]}\\n${n.title.replace(/"/g, "'")}`;
    lines.push(`  ${mermaidId(n.id)}["${label}"]`);
  }
  for (const e of graph.edges) {
    lines.push(
      `  ${mermaidId(e.from)} -->|${e.rel}| ${mermaidId(e.to)}`,
    );
  }
  return `${lines.join("\n")}\n`;
}

export function downloadText(filename: string, text: string, mime = "text/markdown") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
