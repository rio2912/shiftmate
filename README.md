# ShiftMate

A Windows desktop app that tells you when your work day ends. Pick your start time and break, and ShiftMate shows a live countdown and a floating always-on-top timer, and reminds you before it's time to leave.

Built with React, Vite and Electron.

## Features

- **Leave time and live countdown**: start time + the day's work hours + break, with a progress ring and a Start → Break → Leave timeline.
- **One-click Start**: starts today from the current time, from the top bar or from the floating timer.
- **Floating timer**: a small always-on-top timer you can drag anywhere. Choose a **circle**, **rounded square** or **pill** shape and a size from 110 to 220px. Double-click it to open the main window.
- **Reminders**: daily reminders (tea, lunch, meetings, water or anything custom) that go off on working days. Add, edit, turn off or delete them.
- **Alerts**: a Windows notification, an on-screen pop-up and a chime before and when your day ends.
- **Settings (company policy)**: your name and company, work hours for each weekday (any day can be a day off), earliest start time, default and maximum break, and the default "remind me before leaving".
- **Runs in the tray**: closing the window keeps ShiftMate running. It can start with Windows.
- **Light and dark mode.**

### Default work policy

These are only defaults. Change them under **⚙ Settings**.

| | |
|---|---|
| Monday – Friday | 8 hours |
| Saturday | 6 hours 30 minutes |
| Sunday | Off |
| Earliest start | 9:30 AM |
| Break | 30 minutes (maximum 240) |
| Reminder before leaving | 15 minutes |

## Getting started

Requires [Node.js](https://nodejs.org/) 18 or newer.

```bash
npm install
npm run app     # build and open the desktop app
```

### Build the Windows installer

```bash
npm run dist
```

This creates `release/ShiftMate Setup <version>.exe`. The installer lets you choose the install folder and adds desktop and Start menu shortcuts. It isn't code-signed, so Windows SmartScreen may show "Windows protected your PC". Click **More info → Run anyway**.

### Run in the browser

```bash
npm run dev     # http://localhost:5174
```

The browser version has everything except the desktop floating timer. In Chrome or Edge it uses a picture-in-picture pop-out window instead.

## Troubleshooting

- **"Electron failed to install correctly"**: delete `node_modules/electron` and run `npm install` again. If `node_modules/electron/dist/electron.exe` is still missing, check that your antivirus didn't remove it.
- **App crashes with `ipcMain` undefined**: the `ELECTRON_RUN_AS_NODE` environment variable is set (VS Code terminals set it). `npm run app` clears it for you through `electron/start.cjs`. Avoid running `electron .` directly.
- **`npm run dist` fails with "Cannot create symbolic link"**: electron-builder's signing tools contain macOS links that need admin rights or Windows Developer Mode. Turn on Developer Mode, or run the terminal as administrator once.
- **The window doesn't open**: only one copy of ShiftMate can run at a time. Look for it in the system tray, or end `electron.exe` / `ShiftMate.exe` in Task Manager.

## Project structure

```
electron/
  main.cjs              main process: windows, tray, floating timer, IPC
  preload.cjs           safe bridge between the app and Electron (window.workTime)
  start.cjs             starts Electron with ELECTRON_RUN_AS_NODE removed
src/
  App.jsx               main window: session, layout, settings view
  WidgetApp.jsx         the floating timer window (index.html#widget)
  App.css               all styles and the light/dark theme tokens
  components/
    TimeForm.jsx        "Plan your day" form and rules strip
    ResultPanel.jsx     leave time, countdown ring, timeline, stats
    SettingsPage.jsx    settings: profile, schedule, reminders, floating timer, rules
    RemindersCard.jsx   add / edit / toggle / delete reminders
    Pickers.jsx         custom date and time pickers
    WelcomeModal.jsx    first-run "what's your name?" pop-up
    TimeUpModal.jsx     "Time's up!" pop-up
    MiniWidget.jsx      countdown for the browser pop-out window
    Toasts.jsx, Icons.jsx
  hooks/
    useSettings.js      settings state, saved and synced between windows
    useReminders.js     daily reminders
    useNotifications.js desktop notifications and chime
    useNow.js, usePip.js
  utils/
    settings.js         default policy, validation, floating timer sizes
    time.js             leave-time calculation and time formatting
```

Settings, reminders and the current day are saved in the app's local storage, so they survive restarts.
