import type { ReactNode } from "react";
import { NODE_KINDS, type LoopControlType, type NodeKind } from "@/lib/ager/types";
import { useDesigner } from "@/lib/ager/store";

const CONTROL_TYPES: LoopControlType[] = [
  "goal",
  "deadline",
  "price_budget",
  "max_turns",
  "no_progress",
];

export function Inspector() {
  const graph = useDesigner((s) => s.graph);
  const selectedId = useDesigner((s) => s.selectedId);
  const patchNode = useDesigner((s) => s.patchNode);
  const removeSelected = useDesigner((s) => s.removeSelected);
  const addNode = useDesigner((s) => s.addNode);
  const node = graph.nodes.find((n) => n.id === selectedId);

  if (!node) {
    return (
      <aside
        data-testid="inspector"
        className="flex h-full flex-col border-border bg-surface p-4 text-sm text-muted"
      >
        <p className="text-sm text-muted">Select a node on the graph to configure it.</p>
        <p className="mt-2 text-xs leading-relaxed text-subtle">
          Agents, tools, and loop controls all edit in place. Changes write back into the OKF source.
        </p>
        <label className="mt-4 block text-xs text-subtle">Add node</label>
        <select
          className="field mt-1"
          defaultValue=""
          onChange={(e) => {
            const kind = e.target.value as NodeKind;
            if (kind) addNode(kind);
            e.target.value = "";
          }}
        >
          <option value="">Choose type</option>
          {NODE_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </aside>
    );
  }

  return (
    <aside
      data-testid="inspector"
      className="flex h-full min-h-0 flex-col overflow-auto border-border bg-surface"
    >
      <header className="flex items-start justify-between gap-2 border-b border-border px-3 py-2">
        <div>
          <p className="text-[10px] tracking-wide text-subtle uppercase">{node.kind}</p>
          <h2 className="text-sm font-medium">{node.title}</h2>
        </div>
        <button
          type="button"
          onClick={removeSelected}
          className="text-xs text-muted hover:text-danger"
        >
          Remove
        </button>
      </header>
      <div className="space-y-3 p-3 text-sm">
        <Field label="Kind">
          <select
            value={node.kind}
            onChange={(e) => patchNode(node.id, { kind: e.target.value as NodeKind })}
            className="field"
          >
            {NODE_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Title">
          <input
            value={node.title}
            onChange={(e) => patchNode(node.id, { title: e.target.value })}
            className="field"
          />
        </Field>
        <Field label="Description">
          <textarea
            value={node.description}
            onChange={(e) => patchNode(node.id, { description: e.target.value })}
            rows={3}
            className="field"
          />
        </Field>
        <Field label="Role">
          <input
            value={node.role ?? ""}
            onChange={(e) => patchNode(node.id, { role: e.target.value })}
            className="field"
          />
        </Field>
        <div data-testid="inspector-tools">
          <Field label="Tools (comma separated)">
            <input
              value={node.tools.join(", ")}
              onChange={(e) =>
                patchNode(node.id, {
                  tools: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
              className="field"
            />
          </Field>
        </div>
        <fieldset className="space-y-2 rounded-sm border border-border p-2">
          <legend className="px-1 text-[10px] tracking-wide text-subtle uppercase">
            Permissions
          </legend>
          <Toggle
            label="Can spawn"
            checked={node.permissions.canSpawn}
            onChange={(canSpawn) =>
              patchNode(node.id, {
                permissions: { ...node.permissions, canSpawn },
              })
            }
          />
          <Toggle
            label="Ephemeral"
            checked={node.permissions.ephemeral}
            onChange={(ephemeral) =>
              patchNode(node.id, {
                permissions: { ...node.permissions, ephemeral },
              })
            }
          />
          <Toggle
            label="Owns scratchpad"
            checked={node.permissions.ownsScratchpad}
            onChange={(ownsScratchpad) =>
              patchNode(node.id, {
                permissions: { ...node.permissions, ownsScratchpad },
              })
            }
          />
          <Field label="Timeout (ms)">
            <input
              type="number"
              value={node.permissions.timeoutMs}
              onChange={(e) =>
                patchNode(node.id, {
                  permissions: {
                    ...node.permissions,
                    timeoutMs: Number(e.target.value) || 0,
                  },
                })
              }
              className="field"
            />
          </Field>
          <Field label="Max turns">
            <input
              type="number"
              value={node.permissions.maxTurns ?? ""}
              onChange={(e) =>
                patchNode(node.id, {
                  permissions: {
                    ...node.permissions,
                    maxTurns: e.target.value ? Number(e.target.value) : undefined,
                  },
                })
              }
              className="field"
            />
          </Field>
        </fieldset>
        {node.kind === "LoopPolicy" && (
          <fieldset
            data-testid="loop-fields"
            className="space-y-2 rounded-sm border border-border p-2"
          >
            <legend className="px-1 text-[10px] tracking-wide text-subtle uppercase">
              Loop exit
            </legend>
            <Field label="on_goal">
              <select
                value={node.loop?.on_goal ?? "return"}
                onChange={(e) =>
                  patchNode(node.id, {
                    loop: {
                      on_goal: e.target.value as "return" | "continue",
                      on_exhaust: node.loop?.on_exhaust ?? "return_best",
                      controls: node.loop?.controls ?? [],
                    },
                  })
                }
                className="field"
              >
                <option value="return">return</option>
                <option value="continue">continue</option>
              </select>
            </Field>
            <Field label="on_exhaust">
              <select
                value={node.loop?.on_exhaust ?? "return_best"}
                onChange={(e) =>
                  patchNode(node.id, {
                    loop: {
                      on_goal: node.loop?.on_goal ?? "return",
                      on_exhaust: e.target.value as "return_best" | "fail" | "return",
                      controls: node.loop?.controls ?? [],
                    },
                  })
                }
                className="field"
              >
                <option value="return_best">return_best</option>
                <option value="return">return</option>
                <option value="fail">fail</option>
              </select>
            </Field>
            {(node.loop?.controls ?? []).map((c, i) => (
              <div key={c.id} className="rounded-xs bg-raised p-2">
                <p className="text-xs text-muted">
                  {c.type}
                  {c.expression ? ` · ${c.expression}` : ""}
                  {c.max !== undefined ? ` · max ${c.max}` : ""}
                  {c.max_ms !== undefined ? ` · ${c.max_ms}ms` : ""}
                </p>
                <button
                  type="button"
                  className="mt-1 text-xs text-muted hover:text-danger"
                  onClick={() =>
                    patchNode(node.id, {
                      loop: {
                        on_goal: node.loop?.on_goal ?? "return",
                        on_exhaust: node.loop?.on_exhaust ?? "return_best",
                        controls: (node.loop?.controls ?? []).filter((_, j) => j !== i),
                      },
                    })
                  }
                >
                  Remove control
                </button>
              </div>
            ))}
            <select
              className="field"
              defaultValue=""
              onChange={(e) => {
                const type = e.target.value as LoopControlType;
                if (!type) return;
                patchNode(node.id, {
                  loop: {
                    on_goal: node.loop?.on_goal ?? "return",
                    on_exhaust: node.loop?.on_exhaust ?? "return_best",
                    controls: [
                      ...(node.loop?.controls ?? []),
                      { type, id: `${type}_${(node.loop?.controls.length ?? 0) + 1}` },
                    ],
                  },
                });
                e.target.value = "";
              }}
            >
              <option value="">Add control</option>
              {CONTROL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </fieldset>
        )}
        <Field label="Instructions">
          <textarea
            value={node.instructions ?? ""}
            onChange={(e) => patchNode(node.id, { instructions: e.target.value })}
            rows={4}
            className="field"
          />
        </Field>
      </div>
    </aside>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] tracking-wide text-subtle uppercase">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
