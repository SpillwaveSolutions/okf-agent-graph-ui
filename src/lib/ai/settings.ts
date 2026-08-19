import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isAiBackend, type AiBackendId } from "@/lib/ai/cli-protocol";

export interface AiSettingsState {
  backend: AiBackendId;
  preferStreaming: boolean;
  setBackend: (backend: AiBackendId) => void;
  setPreferStreaming: (preferStreaming: boolean) => void;
}

export const useAiSettings = create<AiSettingsState>()(
  persist(
    (set) => ({
      backend: "grok-cli",
      preferStreaming: true,
      setBackend: (backend) => set({ backend }),
      setPreferStreaming: (preferStreaming) => set({ preferStreaming }),
    }),
    {
      name: "ager-ai-settings",
      partialize: (s) => ({
        backend: isAiBackend(s.backend) ? s.backend : "grok-cli",
        preferStreaming: s.preferStreaming !== false,
      }),
    },
  ),
);
