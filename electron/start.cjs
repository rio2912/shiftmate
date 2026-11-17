// Launches Electron with ELECTRON_RUN_AS_NODE removed. VS Code terminals set it,
// which makes Electron run as plain Node (ipcMain/app are undefined).
const { spawn } = require("child_process");
const path = require("path");
const electronPath = require("electron");

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, [path.join(__dirname, "..")], { stdio: "inherit", env });
child.on("close", (code) => process.exit(code ?? 0));
