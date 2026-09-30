import { app, BrowserWindow, dialog } from "electron";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";

const START_HTML = `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html>
<html><head><meta charset="utf-8"><title>Musify</title></head>
<body style="margin:0;background:#121212;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:grid;height:100vh;place-items:center">
<p style="font-size:15px;letter-spacing:-0.01em">Starting Musify…</p>
</body></html>`)}`;

let server;
let win;
let compact = false;
let normalBounds = null;
let restoring = false;

function setCompact(on) {
  if (!win || compact === on) return;
  compact = on;
  if (on) {
    normalBounds = win.getBounds();
    win.setAlwaysOnTop(true, "floating");
    win.setMinimumSize(680, 210);
    const bounds = win.getBounds();
    win.setBounds({ x: bounds.x, y: bounds.y, width: 720, height: 250 });
    return;
  }
  win.setAlwaysOnTop(false);
  win.setMinimumSize(960, 640);
  const next = normalBounds ?? { x: undefined, y: undefined, width: 1280, height: 800 };
  const bounds = win.getBounds();
  win.setBounds({
    x: next.x ?? bounds.x,
    y: next.y ?? bounds.y,
    width: Math.max(960, next.width || 1280),
    height: Math.max(640, next.height || 800),
  });
  normalBounds = null;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = address && typeof address === "object" ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

async function waitFor(url) {
  const deadline = Date.now() + 40000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // server still booting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Musify did not start.");
}

function startServer(port) {
  const entry = path.join(process.resourcesPath, "server", "server", "index.mjs");
  server = spawn(process.execPath, [entry], {
    cwd: path.join(process.resourcesPath, "server"),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      HOST: "127.0.0.1",
      PORT: String(port),
      NITRO_HOST: "127.0.0.1",
      NITRO_PORT: String(port),
    },
    stdio: "inherit",
  });
  server.on("exit", (code) => {
    if (code && code !== 0 && !win?.isDestroyed()) {
      dialog.showErrorBox("Musify", "The player stopped unexpectedly.");
    }
  });
}

async function openWindow(url) {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: "#121212",
    title: "Musify",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);
  win.on("page-title-updated", (event, title) => {
    event.preventDefault();
    if (title === "Musify Mini") setCompact(true);
    else if (title === "Musify") setCompact(false);
  });
  win.on("minimize", () => {
    if (restoring) return;
    restoring = true;
    if (win.isMinimized()) win.restore();
    win.webContents
      .executeJavaScript("window.__musifyMini?.(true)")
      .finally(() => {
        restoring = false;
      });
  });
  win.once("ready-to-show", () => win?.show());
  await win.loadURL(START_HTML);
  await waitFor(url);
  await win.loadURL(url);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.whenReady().then(async () => {
    try {
      if (process.env.MUSIFY_DESKTOP_URL) {
        await openWindow(process.env.MUSIFY_DESKTOP_URL);
        return;
      }
      const port = await freePort();
      startServer(port);
      await openWindow(`http://127.0.0.1:${port}`);
    } catch (error) {
      dialog.showErrorBox("Musify", error instanceof Error ? error.message : "Could not open Musify.");
      app.quit();
    }
  });

  app.on("window-all-closed", () => {
    server?.kill();
    app.quit();
  });

  app.on("before-quit", () => {
    server?.kill();
  });
}
