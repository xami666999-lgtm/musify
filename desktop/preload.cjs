const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("musifyDesktop", {
  state: () => ipcRenderer.invoke("musify:state"),
  check: () => ipcRenderer.invoke("musify:check"),
  setRepo: (repo) => ipcRenderer.invoke("musify:repo", repo),
  install: () => ipcRenderer.invoke("musify:install"),
  shortcut: () => ipcRenderer.invoke("musify:shortcut"),
  onUpdate: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("musify:update", listener);
    return () => ipcRenderer.removeListener("musify:update", listener);
  },
});
