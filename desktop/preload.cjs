const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("musifyDesktop", {
  state: () => ipcRenderer.invoke("musify:state"),
  check: () => ipcRenderer.invoke("musify:check"),
  install: () => ipcRenderer.invoke("musify:install"),
  onUpdate: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("musify:update", listener);
    return () => ipcRenderer.removeListener("musify:update", listener);
  },
});
