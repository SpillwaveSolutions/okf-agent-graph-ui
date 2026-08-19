# AGER Graph Designer

Visual workbench for [okf-agent-graph](https://github.com/SpillwaveSolutions/okf-agent-graph) (AGER). Describe a multi-agent loop, draw the nodes, click to configure tools and permissions, export OKF + Mermaid.

Compile adapters (later): Claude Code, Grok Build, Codex, LangChain Deep Agents, LangGraph, CrewAI, Claude Managed Agents, Claude Agent SDK.

## This slice

- Console → graph (Grok when available, local compose otherwise)
- Clickable canvas + inspector (including LoopPolicy `on_goal` / `on_exhaust` / controls)
- OKF bundle + Mermaid source
- Sample parallel research graph

Wireframes live in [`wireframes/`](./wireframes/). Update a wireframe before changing the matching UI.

## Next

- Install UI Guard (same plugin as the other Spillwave desktop apps)
- Tauri desktop shell
- Adapter plugins that compile AGER OKF to each runtime
