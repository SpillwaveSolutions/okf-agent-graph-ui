const TARGETS = [
  {
    id: "claude-code",
    name: "Claude Code",
    note: "Universal agent / skills plugin from the AGER bundle.",
  },
  {
    id: "grok-build",
    name: "Grok Build",
    note: "Grok plugin + harness adapters.",
  },
  {
    id: "codex",
    name: "Codex",
    note: "Codex exec plugin from the same OKF graph.",
  },
  {
    id: "deep-agents",
    name: "LangChain Deep Agents",
    note: "Skills, MCP, and graph compile.",
  },
  {
    id: "langgraph",
    name: "LangGraph",
    note: "State graph, Send workers, interrupts.",
  },
  {
    id: "crewai",
    name: "CrewAI",
    note: "Crew, manager agent, tasks.",
  },
  {
    id: "claude-managed",
    name: "Claude Managed Agents",
    note: "Hosted managed-agent project export.",
  },
  {
    id: "claude-sdk",
    name: "Claude Agent SDK",
    note: "SDK project files from AGER types.",
  },
];

export function PublishPanel() {
  return (
    <section
      data-testid="publish-targets"
      className="h-full overflow-auto bg-bg p-5"
    >
      <h2 className="text-lg font-medium tracking-tight">Compile targets</h2>
      <p className="mt-1 max-w-xl text-sm text-muted">
        This slice writes AGER OKF. Adapters that emit framework code come next —
        one plugin per target.
      </p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {TARGETS.map((t) => (
          <li
            key={t.id}
            className="rounded-md border border-border bg-surface p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">{t.name}</h3>
              <span className="text-[10px] tracking-wide text-subtle uppercase">
                Planned
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">{t.note}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
