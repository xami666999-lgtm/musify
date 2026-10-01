import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { spawn, execFile } from "node:child_process";
import { createWriteStream, readFileSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const DEFAULT_REPO = "xami666999-lgtm/musify";
let updateRepo = DEFAULT_REPO;

function cleanRepo(value) {
  const repo = String(value ?? "").trim();
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo) ? repo : DEFAULT_REPO;
}

function loadRepo() {
  try {
    updateRepo = cleanRepo(JSON.parse(readFileSync(path.join(app.getPath("userData"), "update-repo.json"), "utf8")).repo);
  } catch {
    updateRepo = DEFAULT_REPO;
  }
}

function saveRepo(value) {
  updateRepo = cleanRepo(value);
  writeFileSync(path.join(app.getPath("userData"), "update-repo.json"), JSON.stringify({ repo: updateRepo }));
  return updateRepo;
}

let installerPath = "";
let checking = false;
let updateState = { status: "idle", version: "1.1.0", remote: "", percent: 0, message: "" };

function send(patch) {
  updateState = { ...updateState, ...patch };
  if (win && !win.isDestroyed()) win.webContents.send("musify:update", updateState);
}

function isNewer(remote, local) {
  const parse = (value) => String(value).replace(/^v/, "").split(".").map((part) => Number.parseInt(part, 10) || 0);
  const next = parse(remote);
  const current = parse(local);
  const length = Math.max(next.length, current.length);
  for (let i = 0; i < length; i += 1) {
    if ((next[i] || 0) !== (current[i] || 0)) return (next[i] || 0) > (current[i] || 0);
  }
  return false;
}

async function checkForUpdates() {
  loadRepo();
  if (checking) return updateState;
  updateState = { ...updateState, version: app.getVersion() };
  if (!app.isPackaged) {
    send({ status: "dev", version: app.getVersion() });
    return updateState;
  }
  checking = true;
  send({ status: "checking", message: "" });
  try {
    const response = await fetch(`https://api.github.com/repos/${updateRepo}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "Musify" },
    });
    if (!response.ok) throw new Error("GitHub did not answer.");
    const release = await response.json();
    const remote = String(release.tag_name || "").replace(/^v/, "");
    const asset = (release.assets || []).find((item) => String(item.name).endsWith(".exe"));
    if (!asset || !isNewer(remote, app.getVersion())) {
      send({ status: "current", remote, percent: 0 });
      return updateState;
    }
    send({ status: "downloading", remote, percent: 0 });
    const dir = path.join(app.getPath("temp"), "musify-updates");
    await mkdir(dir, { recursive: true });
    installerPath = path.join(dir, asset.name);
    const download = await fetch(asset.browser_download_url, {
      headers: { Accept: "application/octet-stream", "User-Agent": "Musify" },
    });
    if (!download.ok || !download.body) throw new Error("The update did not download.");
    const total = Number(download.headers.get("content-length") || asset.size || 0);
    const file = createWriteStream(installerPath);
    const reader = download.body.getReader();
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (total) send({ percent: Math.min(99, Math.round((received / total) * 100)) });
      if (!file.write(Buffer.from(value))) await new Promise((resolve) => file.once("drain", resolve));
    }
    await new Promise((resolve, reject) => {
      file.on("error", reject);
      file.end(resolve);
    });
    send({ status: "ready", remote, percent: 100 });
  } catch (error) {
    installerPath = "";
    send({ status: "error", message: error instanceof Error ? error.message : "Update failed." });
  } finally {
    checking = false;
  }
  return updateState;
}

function installUpdate() {
  if (!installerPath) return;
  const child = spawn(installerPath, [], { detached: true, stdio: "ignore" });
  child.unref();
  app.quit();
}

ipcMain.handle("musify:state", () => {
  loadRepo();
  return { ...updateState, version: app.getVersion(), repo: updateRepo };
});
ipcMain.handle("musify:repo", (_event, value) => saveRepo(value));
ipcMain.handle("musify:check", () => checkForUpdates());
ipcMain.handle("musify:install", () => installUpdate());
ipcMain.handle("musify:shortcut", () => {
  ensureDesktopShortcut("Musify");
  return { ok: true, path: path.join(app.getPath("desktop"), "Musify.lnk") };
});

function ensureDesktopShortcut(name) {
  if (process.platform !== "win32") return;
  const desktop = app.getPath("desktop");
  const lnk = path.join(desktop, `${name}.lnk`);
  const exe = process.execPath;
  const work = path.dirname(exe);
  const quote = (value) => value.replace(/'/g, "''");
  const script = [
    "$shell = New-Object -ComObject WScript.Shell",
    `$shortcut = $shell.CreateShortcut('${quote(lnk)}')`,
    `$shortcut.TargetPath = '${quote(exe)}'`,
    `$shortcut.WorkingDirectory = '${quote(work)}'`,
    `$shortcut.IconLocation = '${quote(exe)}'`,
    "$shortcut.Save()",
  ].join("; ");
  execFile("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], { windowsHide: true });
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
      preload: path.join(path.dirname(fileURLToPath(import.meta.url)), "preload.cjs"),
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
    ensureDesktopShortcut("Musify");
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
