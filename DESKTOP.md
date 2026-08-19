# AGER Designer — Desktop (Tauri)

Same pattern as OKF Forge / Agent Brain / Forge Notes.

| Mode | How | Notes |
| --- | --- | --- |
| **Web / preview** | `npm run dev` | Live designer. Local-first graphs in the browser. |
| **Desktop (Tauri)** | `npm run tauri:dev` · `npm run tauri:build` | Native window wrapping the same UI. |

## Commands

```bash
npm install
npm run dev              # web preview
npm run typecheck
npm run tauri:dev        # desktop window → vite on :8080
npm run build:desktop    # SPA frontend for the bundle
npm run tauri:build      # native binary + installers
```

## Prerequisites

- Node 22+
- Rust 1.77+
- Tauri 2 system deps — see [prerequisites](https://v2.tauri.app/start/prerequisites/)
  - Linux: `pkg-config`, WebKitGTK, GTK 3
  - Windows: WebView2
  - macOS: Xcode CLT

This sandbox often lacks GTK/WebKit, so `tauri build` may fail here even when the sources are correct. Build installers on a desktop host.

## Layout

```
src-tauri/
  tauri.conf.json     product name, window, bundle
  Cargo.toml
  capabilities/       shell + dialog
  src/lib.rs          desktop_info command
  icons/
src/lib/tauri.ts      isTauri() + getDesktopInfo()
```

After `npm run tauri:build`:

```
src-tauri/target/release/bundle/
  dmg/  msi/  appimage/  deb/
```
