export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export interface DesktopInfo {
  isTauri: boolean;
  platform: string;
}

export async function getDesktopInfo(): Promise<DesktopInfo | null> {
  if (!isTauri()) return null;
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<DesktopInfo>("desktop_info");
}
