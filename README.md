# ShiftMate (React + Vite + Electron)

Shows when your work day ends, with a live countdown, a reminder before the end time,
and a desktop notification, chime and pop-up when time is up.

## Features
- **Start** button (top bar): one click starts tracking from the current time
- **Pop out** button: opens a small always-on-top window with the countdown that stays above every other app (Chrome / Edge)
- **Reminders**: tea break 11:00 AM, lunch 1:00 PM and tea break 4:00 PM are set by default. Add, turn off or delete any reminder, with any time and message. They repeat every working day while the app is open.
- Reminder before leaving, desktop notifications, chime, dark/light mode

## Rules
- Monday–Friday: 8 hours · Saturday: 6 hours 30 minutes · Sunday: off
- Earliest start: 9:00 AM
- End time = start time + work hours + break

## Run it
```bash
cd C:\xampp\htdocs\work-time-calculator
npm install
npm run dev
```
It opens at http://localhost:5174. Desktop notifications work there because `localhost` counts as a secure origin.

## Build for XAMPP
```bash
npm run build
```
Then open http://localhost/work-time-calculator/dist/ while Apache is running.

## Project structure
```
src/
  App.jsx                    page layout, session state, reminders
  App.css                    styles
  main.jsx                   React entry point
  components/
    TimeForm.jsx             date / start / break / reminder inputs
    ResultPanel.jsx          end time, countdown, progress, details
    Toasts.jsx               small pop-up messages
    TimeUpModal.jsx          full-screen "Time's up!" alert
    RemindersCard.jsx        add / toggle / delete reminders
    MiniWidget.jsx           countdown shown in the pop-out window
    Icons.jsx                inline SVG icons
  hooks/
    useNow.js                ticking clock (every second)
    useNotifications.js      desktop notifications + chime
    useReminders.js          daily reminders (tea, lunch, custom)
    usePip.js                always-on-top mini window
  utils/
    time.js                  work rules, validation and time formatting
```

Change the work rules in `src/utils/time.js` (`EARLIEST_START`, `WORK_MINUTES`, `MAX_BREAK`).
