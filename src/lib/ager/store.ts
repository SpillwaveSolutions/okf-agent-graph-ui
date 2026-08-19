import { create } from "zustand";
import { persist } from "zustand/middleware";
import { exportOkfBundle, exportMermaid } from "./export";
import { applyNodePatch, heuristicCompose } from "./parse";
import { emptyGraph, sampleResearchGraph } from "./sample";
import { validateGraph, type Issue } from "./validate";
import type { AgerGraph, AgerNode, ConsoleMessage, NodeKind } from "./types";
import { nid } from "./types";

export type MainView = "graph" | "source" | "publish";

interface DesignerState {
  graph: AgerGraph;
  selectedId: string | null;
  view: MainView;
  sourceTab: "okf" | "mermaid";
  messages: ConsoleMessage[];
  generating: boolean;
  lastError: string | null;
  theme: "dark" | "light";
  mobilePanel: "none" | "console" | "inspector";
  setView: (view: MainView) => void;
  setSourceTab: (tab: "okf" | "mermaid") => void;
  select: (id: string | null) => void;
  setTitle: (title: string) => void;
  setTheme: (theme: "dark" | "light") => void;
  setMobilePanel: (panel: DesignerState["mobilePanel"]) => void;
  loadSample: () => void;
  newGraph: () => void;
  patchNode: (id: string, patch: Partial<AgerNode>) => void;
  addNode: (kind: NodeKind) => void;
  removeSelected: () => void;
  compose: (prompt: string) => Promise<void>;
}

function stamp(text: string, role: ConsoleMessage["role"]): ConsoleMessage {
  return { id: nid("m"), role, text, at: new Date().toISOString() };
}

export const useDesigner = create<DesignerState>()(
  persist(
    (set, get) => ({
      graph: sampleResearchGraph(),
      selectedId: null,
      view: "graph",
      sourceTab: "okf",
      messages: [
        stamp(
          "Sample research graph loaded. Describe a change, or click a node.",
          "system",
        ),
      ],
      generating: false,
      lastError: null,
      theme: "dark",
      mobilePanel: "none",
      setView: (view) => set({ view }),
      setSourceTab: (sourceTab) => set({ sourceTab }),
      select: (selectedId) =>
        set({
          selectedId,
          mobilePanel: selectedId ? "inspector" : get().mobilePanel,
        }),
      setTitle: (title) =>
        set({ graph: { ...get().graph, title, updatedAt: new Date().toISOString() } }),
      setTheme: (theme) => set({ theme }),
      setMobilePanel: (mobilePanel) => set({ mobilePanel }),
      loadSample: () =>
        set({
          graph: sampleResearchGraph(),
          selectedId: null,
          lastError: null,
          messages: [
            ...get().messages,
            stamp("Restored the AGER sample research graph.", "system"),
          ],
        }),
      newGraph: () =>
        set({
          graph: emptyGraph(),
          selectedId: "orch",
          lastError: null,
          messages: [...get().messages, stamp("Started an empty graph.", "system")],
        }),
      patchNode: (id, patch) =>
        set({ graph: applyNodePatch(get().graph, id, patch) }),
      addNode: (kind) => {
        const id = nid(kind.slice(0, 3).toLowerCase());
        const title = kind.replace(/Agent$/, "").replace(/([A-Z])/g, " $1").trim();
        const node: AgerNode = {
          id,
          path: `/agents/${id}.md`,
          kind,
          title,
          description: "",
          tools: [],
          permissions: {
            canSpawn: kind === "OrchestratorAgent",
            ephemeral: kind === "WorkerAgent",
            ownsScratchpad: false,
            timeoutMs: 120000,
          },
        };
        const graph = get().graph;
        set({
          graph: {
            ...graph,
            nodes: [...graph.nodes, node],
            updatedAt: new Date().toISOString(),
          },
          selectedId: id,
        });
      },
      removeSelected: () => {
        const { graph, selectedId } = get();
        if (!selectedId) return;
        set({
          selectedId: null,
          graph: {
            ...graph,
            nodes: graph.nodes.filter((n) => n.id !== selectedId),
            edges: graph.edges.filter(
              (e) => e.from !== selectedId && e.to !== selectedId,
            ),
            updatedAt: new Date().toISOString(),
          },
        });
      },
      compose: async (prompt) => {
        const trimmed = prompt.trim();
        if (!trimmed || get().generating) return;
        set({
          generating: true,
          lastError: null,
          messages: [...get().messages, stamp(trimmed, "user")],
        });
        try {
          const { composeGraph } = await import("@/lib/ai/compose");
          const result = await composeGraph({
            data: { prompt: trimmed, current: get().graph },
          });
          if (result.ok) {
            set({
              graph: result.graph,
              generating: false,
              messages: [
                ...get().messages,
                stamp(
                  result.source === "ai"
                    ? `Drew ${result.graph.nodes.length} nodes with Grok.`
                    : `Drew ${result.graph.nodes.length} nodes locally.`,
                  "system",
                ),
              ],
            });
            return;
          }
          const graph = heuristicCompose(trimmed, get().graph);
          set({
            graph,
            generating: false,
            lastError: result.error,
            messages: [
              ...get().messages,
              stamp(
                `Drew ${graph.nodes.length} nodes locally${result.error ? ` (${result.error})` : ""}.`,
                "system",
              ),
            ],
          });
        } catch (err) {
          const graph = heuristicCompose(trimmed, get().graph);
          set({
            graph,
            generating: false,
            lastError: err instanceof Error ? err.message : "Compose failed",
            messages: [
              ...get().messages,
              stamp(`Drew ${graph.nodes.length} nodes locally.`, "system"),
            ],
          });
        }
      },
    }),
    {
      name: "ager-designer",
      partialize: (s) => ({
        graph: s.graph,
        theme: s.theme,
        view: s.view,
        sourceTab: s.sourceTab,
      }),
    },
  ),
);

export function useIssues(): Issue[] {
  return validateGraph(useDesigner((s) => s.graph));
}

export function useSources() {
  const graph = useDesigner((s) => s.graph);
  return {
    okf: exportOkfBundle(graph),
    mermaid: exportMermaid(graph),
  };
}
