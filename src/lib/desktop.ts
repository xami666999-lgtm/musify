export type UpdateState = {
  status: "idle" | "dev" | "checking" | "current" | "downloading" | "ready" | "error";
  version: string;
  remote: string;
  percent: number;
  message: string;
};

export type DesktopBridge = {
  state: () => Promise<UpdateState>;
  check: () => Promise<UpdateState>;
  install: () => Promise<void>;
  shortcut?: () => Promise<{ ok: boolean; path: string }>;
  onUpdate: (callback: (state: UpdateState) => void) => () => void;
};

export function getDesktop(): DesktopBridge | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as Window & { musifyDesktop?: DesktopBridge }).musifyDesktop;
  return bridge ?? null;
}

export function autoUpdateEnabled() {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem("musify-auto-update") !== "0";
}

export function setAutoUpdateEnabled(on: boolean) {
  localStorage.setItem("musify-auto-update", on ? "1" : "0");
}
