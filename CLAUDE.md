# AGER Graph Designer

Visual workbench for [okf-agent-graph](https://github.com/SpillwaveSolutions/okf-agent-graph).

## Spillwave UI Guard

This repo vendors [spillwave-ui-guard](https://github.com/SpillwaveSolutions/spillwave-ui-guard).

- Wireframe first: update `wireframes/` (goal, layout, elements, states, acceptance) before any non-trivial UI change.
- Adversarial review after implementation. Builder ≠ critic.
- CI: `.github/workflows/ui-guard.yml` runs `scripts/check-ui-guard.sh`.
- Skip intentionally with `[skip-ui-guard]` in the commit or PR title.

See `.claude/UI_GUARD.md` and `.spillwave/ui-guard/skills/`.

## Desktop

Tauri 2 shell in `src-tauri/`. See [DESKTOP.md](./DESKTOP.md).
