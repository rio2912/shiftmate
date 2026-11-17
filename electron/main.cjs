// ShiftMate — desktop app (Electron main process)
const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, shell } = require("electron");
const path = require("path");
const fs = require("fs");

// Keep using the old "Work Time" data folder so saved reminders and the session carry over
const OLD_DATA = path.join(app.getPath("appData"), "Work Time");
if (fs.existsSync(OLD_DATA)) app.setPath("userData", OLD_DATA);

const APP_ID = "com.rijaybabu.shiftmate";
const DEV_URL = process.env.VITE_DEV_SERVER_URL; // set when running against `vite`
const ICON = path.join(__dirname, "icon.png");
const TRAY_ICON = path.join(__dirname, "tray.png");
const PRELOAD = path.join(__dirname, "preload.cjs");
const WIDGET_SIZE = 150;

let mainWin = null;
let widgetWin = null;
let tray = null;
let quitting = false;

// ---------- Small settings file (widget position / visibility) ----------
const settingsFile = () => path.join(app.getPath("userData"), "settings.json");
function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsFile(), "utf8"));
  } catch {
    return {};
  }
}
function saveSettings(patch) {
  try {
    fs.writeFileSync(settingsFile(), JSON.stringify({ ...readSettings(), ...patch }, null, 2));
  } catch {
    /* ignore */
  }
}

function load(win, hash) {
  if (DEV_URL) win.loadURL(DEV_URL + (hash ? `#${hash}` : ""));
  else win.loadFile(path.join(__dirname, "..", "dist", "index.html"), hash ? { hash } : undefined);
}

// ---------- Main window ----------
function createMain(startHidden) {
  mainWin = new BrowserWindow({
    width: 1120,
    height: 840,
    minWidth: 420,
    minHeight: 600,
    title: "ShiftMate",
    icon: ICON,
    backgroundColor: "#161a2e",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: PRELOAD,
      backgroundThrottling: false, // keep reminders on time while hidden
    },
  });
  load(mainWin);
  mainWin.once("ready-to-show", () => {
    if (!startHidden) mainWin.show();
  });
  // Closing the window keeps the app running in the tray (like ChatGPT / Teams)
  mainWin.on("close", (e) => {
    if (!quitting) {
      e.preventDefault();
      mainWin.hide();
    }
  });
  mainWin.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

function showMain() {
  if (!mainWin) return;
  if (mainWin.isMinimized()) mainWin.restore();
  mainWin.show();
  mainWin.focus();
}

// ---------- Round floating widget ----------
function createWidget() {
  const { workArea } = screen.getPrimaryDisplay();
  const { widgetPos: saved, widgetSize } = readSettings();
  const width = widgetSize?.width ?? WIDGET_SIZE;
  const height = widgetSize?.height ?? WIDGET_SIZE;
  const x = saved?.x ?? workArea.x + workArea.width - width - 24;
  const y = saved?.y ?? workArea.y + workArea.height - height - 24;

  widgetWin = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    transparent: true, // lets the window be truly round
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    show: false,
    webPreferences: { preload: PRELOAD },
  });
  widgetWin.setAlwaysOnTop(true, "screen-saver");
  widgetWin.setVisibleOnAllWorkspaces(true);
  load(widgetWin, "widget");
  widgetWin.once("ready-to-show", () => widgetWin.showInactive());
  widgetWin.on("moved", () => {
    const [wx, wy] = widgetWin.getPosition();
    saveSettings({ widgetPos: { x: wx, y: wy } });
  });
  widgetWin.on("closed", () => {
    widgetWin = null;
    updateTray();
  });
  saveSettings({ widgetVisible: true });
  updateTray();
}

// The widget asks for a new size when its shape/size setting changes
function resizeWidget(width, height) {
  if (!widgetWin || widgetWin.isDestroyed()) return;
  const w = Math.round(Math.max(80, Math.min(600, Number(width) || WIDGET_SIZE)));
  const h = Math.round(Math.max(60, Math.min(600, Number(height) || WIDGET_SIZE)));
  const [cw, ch] = widgetWin.getSize();
  if (cw === w && ch === h) return;
  // Keep the centre where it was, but stay fully on the screen it is on
  const b = widgetWin.getBounds();
  const { workArea: wa } = screen.getDisplayMatching(b);
  const x = Math.round(Math.min(Math.max(b.x + (b.width - w) / 2, wa.x), wa.x + wa.width - w));
  const y = Math.round(Math.min(Math.max(b.y + (b.height - h) / 2, wa.y), wa.y + wa.height - h));
  widgetWin.setResizable(true);
  widgetWin.setBounds({ x, y, width: w, height: h });
  widgetWin.setResizable(false);
  saveSettings({ widgetSize: { width: w, height: h }, widgetPos: { x, y } });
}

function hideWidget() {
  if (widgetWin) widgetWin.close();
  saveSettings({ widgetVisible: false });
  updateTray();
}

function toggleWidget() {
  if (widgetWin) hideWidget();
  else createWidget();
}

// ---------- Tray ----------
function updateTray() {
  if (!tray) return;
  const login = app.getLoginItemSettings().openAtLogin;
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Open ShiftMate", click: showMain },
      { label: "Floating timer", type: "checkbox", checked: !!widgetWin, click: toggleWidget },
      { type: "separator" },
      {
        label: "Start with Windows",
        type: "checkbox",
        checked: login,
        click: (item) => {
          app.setLoginItemSettings({ openAtLogin: item.checked, args: ["--hidden"] });
          updateTray();
        },
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          quitting = true;
          app.quit();
        },
      },
    ])
  );
  // Let the React app show the right button state
  for (const w of [mainWin, widgetWin]) {
    if (w && !w.isDestroyed()) w.webContents.send("widget-state", !!widgetWin);
  }
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(TRAY_ICON));
  tray.setToolTip("ShiftMate");
  tray.on("click", showMain);
  updateTray();
}

// ---------- IPC from the React app ----------
ipcMain.on("open-main", showMain);
ipcMain.on("toggle-widget", toggleWidget);
ipcMain.on("hide-widget", hideWidget);
ipcMain.on("quick-start", () => mainWin?.webContents.send("quick-start"));
ipcMain.handle("widget-visible", () => !!widgetWin);
ipcMain.on("widget-size", (_e, size) => resizeWidget(size?.width, size?.height));

// ---------- App lifecycle ----------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", showMain);

  app.whenReady().then(() => {
    app.setAppUserModelId(APP_ID); // needed for Windows notifications
    const startHidden = process.argv.includes("--hidden");
    createMain(startHidden);
    createTray();
    if (readSettings().widgetVisible !== false) createWidget();
  });

  app.on("before-quit", () => {
    quitting = true;
  });
  app.on("window-all-closed", (e) => e.preventDefault()); // stay in tray
}
