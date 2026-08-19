# Features — AGER Graph Designer

Workbench for authoring [AGER](https://github.com/SpillwaveSolutions/okf-agent-graph) multi-agent loops as OKF.

## Now

- Natural-language console that streams from Claude Code, Codex, or Grok CLI (Forge Notes argv), Grok API, or local compose
- Clickable node canvas with typed AGER edges
- Inspector: role, tools, permissions, LoopPolicy `on_goal` / `on_exhaust` / controls
- OKF bundle + Mermaid export
- Sample parallel research graph
- Guest-local persistence; optional Google / X sign-in
- Tauri 2 desktop shell (`src-tauri/`) with web preview unchanged

## Next (adapters)

Plugins that compile the same AGER bundle to:

- Claude Code
- Grok Build
- Codex
- LangChain Deep Agents
- LangGraph
- CrewAI
- Claude Managed Agents
- Claude Agent SDK
