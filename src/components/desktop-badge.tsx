import { useEffect, useState } from "react";
import { getDesktopInfo, isTauri } from "@/lib/tauri";

export function DesktopBadge() {
  const [label, setLabel] = useState<string | null>(isTauri() ? "Desktop" : null);

  useEffect(() => {
    if (!isTauri()) return;
    void getDesktopInfo().then((info) => {
      if (info?.platform) setLabel(`Desktop · ${info.platform}`);
    });
  }, []);

  if (!label) return null;
  return (
    <span data-testid="desktop-badge" className="truncate">
      {label}
    </span>
  );
}
