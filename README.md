# Android TSL Expense (Expo React Native)

Android TSL Expense is a personal finance and planner app built with Expo React Native. It ports and extends the original Python/Tkinter desktop tool into a modern mobile experience, adding charts, PDF reports, planner mode (budgets, todos, notes) and offline storage using SQLite.

## Core Features
- Import data from CSV, XLSX, XLS and ODS
- Filters and summary (income, expense, net balance)
- Add, edit and delete records from any screen via global FAB
- Export CSV and Excel, backup/restore JSON
- Admin login (default: `admin` / `admin123`)
- TSL and BR31 logos on the home dashboard
- Planner mode with Budgets, Todos (with reminders) and Notes (with images)
- Analytics screen with charts and PDF report

## Charting & Reports
- Income vs Expense bar chart (monthly)
- Category-wise expense donut/pie chart with per-category totals and counts
- Category list with coloured icons and transaction counts
- Month/year navigation for historical analytics
- PDF export of the analytics view (summary + category table) using `expo-print` and `expo-sharing`

## Project Layout
- Root project metadata (this folder) with minimal package.json and `app.json`
- React Native / Expo app in `rn-expo`
  - Business logic and SQLite store
  - Screens for Home, List, Charts, Report, Settings and Planner
  - Android Gradle project under `rn-expo/android` (native build)

## Quick Start (Expo)
- Requirements: Node.js 18+, npm, Android emulator or device, Expo CLI
- Install dependencies:
  - `cd rn-expo`
  - `npm install`
- Run in development:
  - `npm start` (same as `npx expo start`)
  - Press `a` in the Expo CLI to open Android emulator/device
  - Or `npm run tunnel` to use a tunnel if your device and PC are on different networks

### View in Expo Go
- Install the Expo Go app from the Play Store
- Start the project:
  - `npm start` or `npm run tunnel`
- Scan the QR code from the terminal with Expo Go
- Changes will hot‑reload automatically

## Import / Export / Backup
- CSV
  - Settings → Paste CSV text → Import
- XLSX / XLS / ODS
  - Settings → Import XLSX/ODS → choose spreadsheet
  - First sheet is read; columns auto‑detected:
    - Expense Date, Expense Description, Expense Category, Merchant Name, Paid Through, Income Amount, Expense Amount
    - Alternate keys: Date, Description, Category, Merchant, Paid, Income, Expense
- Export / Backup
  - Settings or App Header → Export CSV / Export Excel
  - Settings → Backup JSON / Restore JSON

## Gradle (Android) Commands
From Windows, inside `rn-expo/android`:
- Build debug APK:
  - `gradlew.bat assembleDebug`
- Build release APK (signed with debug keystore by default here):
  - `gradlew.bat assembleRelease`
- Install debug build to a connected device/emulator:
  - `gradlew.bat installDebug`
- Clean Android build:
  - `gradlew.bat clean`

## Expo CLI Commands
From `rn-expo`:
- Start Metro bundler:
  - `npm start` or `npx expo start`
- Run on Android (native build):
  - `npm run android` or `npx expo run:android`
- Run with tunnel (for devices on different networks):
  - `npm run tunnel` or `expo start --tunnel`
- Run on web:
  - `npm run web` or `expo start --web`

## Logos & Branding
- Place the logos in project root (already present):
  - `d:\IMS\AndroidTSLEpxense\tsl_icon.png`
  - `d:\IMS\AndroidTSLEpxense\br31logo.png`
- The app loads them dynamically on the dashboard and header where available

## Credits
- Developed by Angel (Mehul) Singh
- The Space Lab (TSL) and BR31Technologies
