// Safe bridge between the React app and the desktop app
const { contextBridge, ipcRenderer } = require("electron");

function listen(channel, cb) {
  const handler = (_e, ...args) => cb(...args);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

contextBridge.exposeInMainWorld("workTime", {
  isDesktop: true,
  openMain: () => ipcRenderer.send("open-main"),
  toggleWidget: () => ipcRenderer.send("toggle-widget"),
  hideWidget: () => ipcRenderer.send("hide-widget"),
  quickStart: () => ipcRenderer.send("quick-start"),
  widgetVisible: () => ipcRenderer.invoke("widget-visible"),
  setWidgetSize: (width, height) => ipcRenderer.send("widget-size", { width, height }),
  onQuickStart: (cb) => listen("quick-start", cb),
  onWidgetState: (cb) => listen("widget-state", cb),
});
