# Android TSL Expense (Expo React Native)

Personal finance expense analyzer for Android built with Expo React Native. It ports the core features from the original Python Tkinter app.

## Features
- Import data from CSV, XLSX, and ODS
- Filters and summary (Inc/Exp/Net balance)
- Add and delete records
- Export CSV and backup JSON
- Admin login (stub: `admin` / `admin123`)
- Uses TSL and BR31 logos when available

## Quick Start
- Requirements: Node.js 18+, npm, Android emulator or device, Expo CLI
- Install
  - `cd rn-expo`
  - `npm install`
- Run
  - `npm start` (starts Metro)
  - Press `a` for Android
  - Or `npm run tunnel` to use a tunnel if your device and PC are on different networks

## View in Expo Go (Live)
- Install the Expo Go app from the Play Store
- Start the project:
  - `npm start` or `npm run tunnel`
- Scan the QR code shown in the terminal with Expo Go
- Changes hot-reload live in the app

## Import Data
- CSV
  - Settings → Paste CSV text → Import
- XLSX / ODS
  - Settings → Import XLSX/ODS → choose spreadsheet
  - The first sheet is read; columns auto-detected:
    - Expense Date, Expense Description, Expense Category, Merchant Name, Paid Through, Income Amount, Expense Amount
    - Alternate keys: Date, Description, Category, Merchant, Paid, Income, Expense

## Export / Backup
- Settings → Export CSV: produces CSV string
- Settings → Backup JSON: produces JSON string
- In a next step these will save to files via Expo FileSystem and Sharing

## Logos
- Place the logos in repository root (already present):
  - `d:\IMS\AndroidTSLEpxense\tsl_icon.png`
  - `d:\IMS\AndroidTSLEpxense\br31logo.png`
- The app attempts to load them at runtime

## Credits
- Developed by Angel (Mehul) Singh
- The Space Lab (TSL) and BR31Technologies

## Roadmap
- Persistent offline DB using `expo-sqlite`
- Charts using `react-native-svg` and `victory-native`
- PDF report via `expo-print`
- Secure settings via `expo-secure-store`
