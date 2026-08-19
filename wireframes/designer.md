# Screen: Designer (console + graph)

## Goal
Describe a multi-agent loop in natural language; the graph redraws. Keep describing to refine, or click a node to inspect.

## Layout

```
+----------------------+---------------------------+--------------+
| Describe the loop    |      [Trigger]            | Inspector    |
| [textarea]           |          |                |              |
| [Draw graph]         |   [Orchestrator]  [Loop]  |              |
|                      |     /    |    \    [Pad]  |              |
| transcript           |  [W]    [W]    [W] [Tool] |              |
|                      |     \    |    /    [Fail] |              |
|                      |   [Synthesizer]           |              |
|                      |          |                |              |
|                      |       [Judge]             |              |
+----------------------+---------------------------+--------------+
```

Main path is top-down. Ops (loop, scratchpad, tools, failure) sit in a right rail. Primary edges are solid; ops edges are dashed.

## Key Elements

| Element | Type | Behavior / Notes |
| --- | --- | --- |
| Prompt | textarea | Placeholder describes an orchestrator-workers loop. data-testid=console-input. Cmd/Ctrl+Enter submits. |
| Draw graph | primary | User-initiated. Calls compose (Grok when available, else heuristic). Disabled while empty or generating. data-testid=console-submit |
| Transcript | list | User + system turns. data-testid=console-log |
| Load sample | ghost | Restores the AGER sample research graph. data-testid=load-sample |
| New graph | ghost | Clears to an empty orchestrator stub. data-testid=new-graph |
| Graph canvas | region | Clickable nodes, SVG edges labeled with rel. Selected node has a ring. data-testid=graph-canvas |
| Node card | button | Shows kind + title. data-testid=node-{id} |
| Edge | path + label | Typed AGER rel (spawns, judges, uses, controlled_by, …) |

## States
- Empty canvas: copy “Describe a loop to draw nodes.”
- Generating: submit disabled; status Generating.
- AI unavailable: heuristic compose still draws; system note says local compose.
- Error: toast / system line with the error; previous graph kept.

## Acceptance Criteria
- [ ] Submitting a description updates nodes and edges.
- [ ] Clicking a node selects it and opens the inspector.
- [ ] Load sample restores the parallel research graph (lead, worker, synthesizer, judge, loop, tool).
- [ ] Graph remains usable at ~390px (scroll, no overflow of chrome).
