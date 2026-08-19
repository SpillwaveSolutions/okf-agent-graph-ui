# Screen: App chrome (shell)

## Goal
Persistent workbench chrome so the user always knows which graph is open, which view is active, and whether the bundle is dirty.

## Layout

```
+------------------------------------------------------------------+
| AGER  graph title          Graph  Source  Publish   Sign in      |
+--------+------------------------------------------+--------------+
|        |                                          |              |
| Console|              Main (graph / source)       | Inspector    |
|        |                                          |              |
+--------+------------------------------------------+--------------+
| status   N nodes  M edges   valid / N issues   dirty             |
+------------------------------------------------------------------+
```

On ~390px: header + main stack; console and inspector become sheets.

## Key Elements

| Element | Type | Behavior / Notes |
| --- | --- | --- |
| Brand | text | Title AGER. Subtitle Agent Graph Designer. Hidden on smallest width. |
| Graph title | editable | Renames the AgentGraph. data-testid=graph-title |
| View toggle | 3-button group | Graph / Source / Publish. role=group aria-label Designer view. data-testid=view-toggle |
| Sign in | link / UserButton | Guest can design locally. Sign-in optional. |
| Console | region | See designer.md. data-testid=console-panel |
| Inspector | complementary | See inspector.md. data-testid=inspector |
| Status | footer | Node/edge counts, validation, dirty. Desktop badge when running in Tauri. data-testid=app-status |
| Theme | icon button | Light / dark. data-testid=theme-toggle |

## States
- Default: sample research graph loaded, Graph view, inspector empty until a node is selected.
- Dirty: status shows Unsaved after console or inspector edits.
- Narrow (~390px): view toggle stays; console opens as a bottom sheet; inspector as a drawer. No horizontal overflow.

## Acceptance Criteria
- [ ] Header, main, and status are visible on desktop.
- [ ] Exactly one main view is mounted; data-view matches the toggle.
- [ ] Guest can use the designer without signing in.
- [ ] At ~390px primary chrome does not overflow horizontally.
