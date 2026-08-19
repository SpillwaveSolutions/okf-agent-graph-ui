import {
  AGER_VERSION,
  OKF_VERSION,
  type AgerGraph,
  type AgerNode,
} from "./types";

function perms(
  overrides: Partial<AgerNode["permissions"]> = {},
): AgerNode["permissions"] {
  return {
    canSpawn: false,
    ephemeral: false,
    ownsScratchpad: false,
    timeoutMs: 120000,
    ...overrides,
  };
}

export function sampleResearchGraph(): AgerGraph {
  return {
    id: "sample-research",
    title: "Parallel research graph",
    description:
      "Orchestrator-workers research with judge, synthesizer, and loop controls.",
    ager_version: AGER_VERSION,
    okf_version: OKF_VERSION,
    entry: "lead",
    pattern: "orchestrator-workers",
    updatedAt: "2026-08-04T00:00:00.000Z",
    nodes: [
      {
        id: "trigger",
        path: "/ops/trigger-on-plan.md",
        kind: "Trigger",
        title: "On plan",
        description: "Manual / ticket kickoff for a research run.",
        tools: [],
        permissions: perms({ timeoutMs: 0 }),
      },
      {
        id: "lead",
        path: "/agents/lead-researcher.md",
        kind: "OrchestratorAgent",
        title: "Lead researcher",
        description:
          "Plans research facets, spawns isolated workers, drives the outer loop.",
        role: "lead_researcher",
        tools: [],
        permissions: perms({
          canSpawn: true,
          ownsScratchpad: true,
          timeoutMs: 120000,
        }),
        instructions:
          "Plan facets, spawn workers, re-plan from judge feedback.",
      },
      {
        id: "worker",
        path: "/agents/worker.md",
        kind: "WorkerAgent",
        title: "Specialist worker",
        description: "Isolated doer; appends structured findings to ScratchPad.",
        role: "worker",
        tools: ["web_search"],
        permissions: perms({
          ephemeral: true,
          timeoutMs: 180000,
          maxTurns: 12,
        }),
        instructions: "Return structured findings only.",
      },
      {
        id: "synth",
        path: "/agents/synthesizer.md",
        kind: "SynthesizerAgent",
        title: "Report synthesizer",
        description: "Reduces worker outputs into one draft report.",
        tools: [],
        permissions: perms(),
        instructions: "Merge worker_outputs into best_draft.",
      },
      {
        id: "judge",
        path: "/agents/judge.md",
        kind: "JudgeAgent",
        title: "Quality judge",
        description:
          "Scores candidates against a rubric; drives goal / no_progress.",
        tools: [],
        permissions: perms(),
        instructions: "Emit score, pass, feedback, revise. Threshold 0.72.",
      },
      {
        id: "loop",
        path: "/runtime/loop-policy.md",
        kind: "LoopPolicy",
        title: "Default loop controls",
        description: "Goal, deadline, price, max turns, no-progress.",
        tools: [],
        permissions: perms(),
        loop: {
          on_goal: "return",
          on_exhaust: "return_best",
          controls: [
            {
              type: "goal",
              id: "goal_pass",
              expression: "state.judgment.pass == true",
            },
            {
              type: "deadline",
              id: "wall_clock",
              max_ms: 600000,
              on_hit: "exhaust",
            },
            {
              type: "price_budget",
              id: "cost_cap",
              max: 2.5,
              currency: "USD",
            },
            {
              type: "max_turns",
              id: "outer",
              max: 6,
            },
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
      {
        id: "pad",
        path: "/runtime/scratchpad.md",
        kind: "ScratchPad",
        title: "Run scratchpad",
        description: "Salient KV: plans, worker_outputs, judgments, best_draft.",
        tools: [],
        permissions: perms(),
      },
      {
        id: "search",
        path: "/tools/web-search.md",
        kind: "Tool",
        title: "Web search",
        description: "Example tool with budget and duplicate-block rules.",
        tools: [],
        permissions: perms(),
        rules: [
          {
            id: "block-if-budget",
            when: "run.cost.usd >= run.budget.usd",
            action: "block",
            message: "Price budget exhausted",
          },
          {
            id: "block-dup",
            when: "duplicate query in last 5",
            action: "block",
            message: "Duplicate query",
          },
        ],
      },
      {
        id: "fail",
        path: "/ops/failure-policy.md",
        kind: "FailurePolicy",
        title: "Failure policy",
        description: "Error class to route: retry, compensate, or dead-letter.",
        tools: [],
        permissions: perms(),
      },
    ],
    edges: [
      { id: "e1", from: "trigger", to: "lead", rel: "triggered_by" },
      { id: "e2", from: "lead", to: "worker", rel: "spawns" },
      { id: "e3", from: "lead", to: "judge", rel: "routes_to" },
      { id: "e4", from: "lead", to: "loop", rel: "controlled_by" },
      { id: "e5", from: "lead", to: "pad", rel: "writes_to" },
      { id: "e6", from: "lead", to: "fail", rel: "on_failure" },
      { id: "e7", from: "worker", to: "search", rel: "uses" },
      { id: "e8", from: "worker", to: "pad", rel: "appends_to" },
      { id: "e9", from: "synth", to: "worker", rel: "aggregates_from" },
      { id: "e10", from: "synth", to: "pad", rel: "reads_from" },
      { id: "e11", from: "judge", to: "pad", rel: "appends_to" },
      { id: "e12", from: "worker", to: "synth", rel: "fans_out_to" },
    ],
  };
}

export function emptyGraph(): AgerGraph {
  return {
    id: "draft",
    title: "Untitled graph",
    description: "Describe the loop in the console to draw nodes.",
    ager_version: AGER_VERSION,
    okf_version: OKF_VERSION,
    entry: "orch",
    pattern: "custom",
    updatedAt: new Date().toISOString(),
    nodes: [
      {
        id: "orch",
        path: "/agents/orchestrator.md",
        kind: "OrchestratorAgent",
        title: "Orchestrator",
        description: "Plans, routes, and owns the outer loop.",
        role: "lead",
        tools: [],
        permissions: perms({ canSpawn: true, ownsScratchpad: true }),
      },
    ],
    edges: [],
  };
}
