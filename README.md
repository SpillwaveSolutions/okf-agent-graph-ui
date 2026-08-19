# AGER Graph Designer

Visual workbench for [okf-agent-graph](https://github.com/SpillwaveSolutions/okf-agent-graph) (AGER). Describe a multi-agent loop, draw the nodes, click to configure tools and permissions, export OKF + Mermaid.

Compile adapters (later, separate build): Claude Code, Grok Build, Codex, LangChain Deep Agents, LangGraph, CrewAI, Claude Managed Agents, Claude Agent SDK.

## This slice

- Console → graph (Grok when available, local compose otherwise)
- Clickable canvas + inspector (LoopPolicy `on_goal` / `on_exhaust` / controls)
- OKF bundle + Mermaid source
- Sample parallel research graph
- **Tauri desktop shell** (`src-tauri/`) — same pattern as the other Kari apps

## UI Guard

This repo uses [Spillwave UI Guard](https://github.com/SpillwaveSolutions/spillwave-ui-guard) — the same plugin as Forge Notes, OKF Forge, and Agent Brain.

- Wireframes live in [`wireframes/`](./wireframes/). Update a wireframe **before** changing the matching UI.
- CI runs [`scripts/check-ui-guard.sh`](./scripts/check-ui-guard.sh).
- Soft pre-commit: [`hooks/pre-commit-ui-guard.sh`](./hooks/pre-commit-ui-guard.sh).

## Run

```bash
npm install
npm run dev              # web
npm run tauri:dev        # desktop window
npm run tauri:build      # installers
```

See [DESKTOP.md](./DESKTOP.md) for the Tauri shell.
