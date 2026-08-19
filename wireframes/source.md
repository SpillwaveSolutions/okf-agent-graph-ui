# Screen: Source and publish

## Goal
Show the graph as an AGER OKF bundle and as Mermaid. List compile targets without pretending they already emit framework code.

## Layout

```
Source view
+--------------------------------------------------+
| OKF   Mermaid                                    |
| [copy]  [download]                               |
| ```yaml / mermaid```                             |
+--------------------------------------------------+

Publish view
+--------------------------------------------------+
| Adapters (later)                                 |
| Claude Code · Grok Build · Codex                 |
| LangChain Deep Agents · LangGraph · CrewAI       |
| Claude Managed Agents · Claude Agent SDK         |
+--------------------------------------------------+
```

## Key Elements

| Element | Type | Behavior / Notes |
| --- | --- | --- |
| Source tabs | tabs | OKF bundle (index + node files) or Mermaid flowchart. data-testid=source-tabs |
| Copy / download | buttons | Clipboard or .md / .mmd file. |
| Adapter cards | list | Status “planned”. Do not emit LangGraph/CrewAI/etc. in this slice. data-testid=publish-targets |

## States
- Default: OKF of the current graph.
- Empty graph: still valid stub index.md.

## Acceptance Criteria
- [ ] OKF frontmatter includes type, ager_version 0.3.0, links with typed rels.
- [ ] LoopPolicy source includes on_goal, on_exhaust, and controls.
- [ ] Mermaid lists every node and every edge.
- [ ] Publish names all eight adapter targets as planned.
