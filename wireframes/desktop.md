# Screen: Desktop shell

## Goal
Run the same designer inside a native Tauri window so it feels like the other Kari apps, not a browser tab.

## Layout

```
+------------------------------------------------------------------+
| AGER Designer                                    [native chrome] |
+------------------------------------------------------------------+
| (same designer: console | graph | inspector)                     |
+------------------------------------------------------------------+
| status …  Desktop · macos                                        |
+------------------------------------------------------------------+
```

Web preview is unchanged. Desktop is the same SPA in a 1320×860 window (min 900×600).

## Key Elements

| Element | Type | Behavior / Notes |
| --- | --- | --- |
| Native window | Tauri 2 | Title AGER Designer. identifier `com.spillwave.ager-designer`. |
| Designer | existing | No separate desktop route. Same `/` shell. |
| Desktop badge | status text | Visible only when `__TAURI_INTERNALS__` is present. data-testid=desktop-badge |
| `desktop_info` | IPC | Returns `{ isTauri, platform }`. |

## States
- Web: no desktop badge.
- Desktop: footer shows `Desktop · <os>`.

## Acceptance Criteria
- [ ] `npm run tauri:dev` opens the designer in a native window pointed at the Vite preview.
- [ ] Web preview still works without Tauri APIs.
- [ ] Desktop badge is absent in the browser, present in the Tauri window.
- [ ] `build:desktop` produces a static `index.html` for the bundle.
