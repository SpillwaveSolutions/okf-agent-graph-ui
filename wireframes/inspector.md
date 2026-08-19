# Screen: Node inspector

## Goal
Configure a selected node’s role, tools, permissions, and (for LoopPolicy) exit controls and goals. Edits write back into the AGER graph.

## Layout

```
+---------------------------+
| Kind badge   Title        |
| Description               |
| Role                      |
| Tools  [web_search] [+]   |
| Permissions               |
|   can spawn   ephemeral   |
|   timeout     max turns   |
| Loop (LoopPolicy only)    |
|   on_goal / on_exhaust    |
|   controls list           |
| Instructions              |
+---------------------------+
```

## Key Elements

| Element | Type | Behavior / Notes |
| --- | --- | --- |
| Empty | copy | Select a node on the graph. |
| Kind | select | One of AGER node types. Changing kind remaps path. |
| Title / description | text | Persist on change. |
| Tools | chips + add | Tool ids this agent may call. data-testid=inspector-tools |
| Permissions | switches / numbers | canSpawn, ephemeral, ownsScratchpad, timeoutMs, maxTurns. |
| Loop fields | shown when kind=LoopPolicy | on_goal, on_exhaust, controls (goal, deadline, price_budget, max_turns, no_progress). data-testid=loop-fields |
| Instructions | textarea | Written into the OKF body. |

## States
- No selection: empty copy.
- Agent selected: tools + permissions.
- LoopPolicy selected: exit controls + goals.
- Tool selected: rules list.

## Acceptance Criteria
- [ ] Editing title updates the node card immediately.
- [ ] LoopPolicy exposes on_goal, on_exhaust, and at least the five control types.
- [ ] Changes mark the graph dirty and refresh OKF / Mermaid source.
