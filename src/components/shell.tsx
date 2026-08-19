import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Moon, Sun, PanelLeft, SlidersHorizontal } from "lucide-react";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useDesigner, useIssues, type MainView } from "@/lib/ager/store";
import { ConsolePanel } from "./console-panel";
import { GraphCanvas } from "./graph-canvas";
import { Inspector } from "./inspector";
import { PublishPanel } from "./publish-panel";
import { SourcePanel } from "./source-panel";
import { DesktopBadge } from "./desktop-badge";
import { cn } from "@/lib/utils";

const VIEWS: { id: MainView; label: string }[] = [
  { id: "graph", label: "Graph" },
  { id: "source", label: "Source" },
  { id: "publish", label: "Publish" },
];

export function Shell() {
  const graph = useDesigner((s) => s.graph);
  const view = useDesigner((s) => s.view);
  const setView = useDesigner((s) => s.setView);
  const setTitle = useDesigner((s) => s.setTitle);
  const theme = useDesigner((s) => s.theme);
  const setTheme = useDesigner((s) => s.setTheme);
  const generating = useDesigner((s) => s.generating);
  const mobilePanel = useDesigner((s) => s.mobilePanel);
  const setMobilePanel = useDesigner((s) => s.setMobilePanel);
  const issues = useIssues();
  const errors = issues.filter((i) => i.level === "error").length;
  const { user, isPending } = useCurrentUserState();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="flex h-dvh flex-col bg-bg text-fg">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-3">
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.2em] text-subtle uppercase">AGER</p>
          <p className="hidden text-[11px] text-muted sm:block">Agent Graph Designer</p>
        </div>
        <input
          data-testid="graph-title"
          value={graph.title}
          onChange={(e) => setTitle(e.target.value)}
          className="min-w-0 flex-1 truncate border-0 bg-transparent text-sm font-medium focus:outline-none"
          aria-label="Graph title"
        />
        <div
          data-testid="view-toggle"
          role="group"
          aria-label="Designer view"
          className="flex rounded-sm border border-border"
        >
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={cn(
                "px-2.5 py-1 text-xs",
                view === v.id ? "bg-raised text-fg" : "text-muted hover:text-fg",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="rounded-sm p-2 text-muted hover:bg-raised hover:text-fg md:hidden"
          aria-label="Open console"
          onClick={() =>
            setMobilePanel(mobilePanel === "console" ? "none" : "console")
          }
        >
          <PanelLeft className="size-4" />
        </button>
        <button
          type="button"
          className="rounded-sm p-2 text-muted hover:bg-raised hover:text-fg md:hidden"
          aria-label="Open inspector"
          onClick={() =>
            setMobilePanel(mobilePanel === "inspector" ? "none" : "inspector")
          }
        >
          <SlidersHorizontal className="size-4" />
        </button>
        <button
          type="button"
          data-testid="theme-toggle"
          aria-label={theme === "dark" ? "Switch to light" : "Switch to dark"}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-sm p-2 text-muted hover:bg-raised hover:text-fg"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
        {isPending ? (
          <div className="h-8 w-8 animate-pulse rounded-full bg-raised" />
        ) : user ? (
          <SignedIn>
            <div className="max-w-36 truncate text-xs [&_span.text-sm]:hidden lg:[&_span.text-sm]:inline">
              <UserButton />
            </div>
          </SignedIn>
        ) : (
          <SignedOut>
            <Link
              to="/login"
              className="text-xs text-muted underline-offset-4 hover:text-fg hover:underline"
            >
              Sign in
            </Link>
          </SignedOut>
        )}
      </header>

      <div className="app-body">
        <div className="app-console">
          <ConsolePanel />
        </div>
        <main
          data-testid="app-main"
          data-view={view}
          className="min-w-0 overflow-hidden"
        >
          {view === "graph" && <GraphCanvas />}
          {view === "source" && <SourcePanel />}
          {view === "publish" && <PublishPanel />}
        </main>
        <div className="app-inspector">
          <Inspector />
        </div>

        {mobilePanel === "console" && (
          <div className="absolute inset-0 z-20 bg-bg md:hidden">
            <ConsolePanel />
          </div>
        )}
        {mobilePanel === "inspector" && (
          <div className="absolute inset-0 z-20 bg-bg lg:hidden">
            <Inspector />
          </div>
        )}
      </div>

      <footer
        data-testid="app-status"
        className="flex h-8 shrink-0 items-center gap-3 overflow-hidden border-t border-border px-3 text-[11px] text-muted"
      >
        <span>
          {graph.nodes.length} nodes · {graph.edges.length} edges
        </span>
        <span className={errors ? "text-danger" : "text-ok"}>
          {errors ? `${errors} error${errors === 1 ? "" : "s"}` : "valid"}
        </span>
        {generating && <span>Drawing</span>}
        <span className="truncate">{graph.pattern}</span>
        <DesktopBadge />
      </footer>
    </div>
  );
}
