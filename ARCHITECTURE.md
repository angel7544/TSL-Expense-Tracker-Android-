# System Architecture

```mermaid
flowchart TD
    A[User] --> B[Settings Screen]
    A --> C[List Screen]
    A --> D[Home Screen]
    B --> E[CSV Import]
    B --> F[XLSX/ODS Import]
    B --> G[Export CSV]
    B --> H[Backup JSON]
    E --> I[ImportExport.parseCSV]
    F --> J[ImportExport.parseWorkbookBase64]
    I --> K[Store.importCSV]
    J --> K
    K --> L[Store.records]
    C --> L
    D --> L
    L --> M[Summary/Filters]
```

```mermaid
flowchart LR
    subgraph MobileApp[Expo React Native]
        Store[(Records, Settings, Users)]
        ImportExport[[CSV/XLSX/ODS Parser]]
        UI_Home[Home: Summary]
        UI_List[List: Add/Delete/Filter]
        UI_Settings[Settings: Admin/Import/Export/Backup]
    end
    Files[(CSV / XLSX / ODS)]
    Files --> ImportExport --> Store
    Store --> UI_Home
    Store --> UI_List
    Store --> UI_Settings
```

## Modules
- Store: holds records and settings; provides list, summary, add, update, remove, import, export, backup
- ImportExport: parses CSV text and SheetJS workbooks (XLSX/ODS)
- Screens: Home (summary), List (CRUD), Settings (admin/import/export)

## Data Model
- Fields: expense_date, expense_description, expense_category, merchant_name, paid_through, income_amount, expense_amount, bal (derived)
- Sorting: date descending
- Filters: description, plus extensible to year/month/category/merchant/paid

## Tech Stack
- Expo React Native
- SheetJS `xlsx` for spreadsheets
- Expo Document Picker and File System

## Future Additions
- SQLite persistence (expo-sqlite)
- Charts and PDF report generation
- Secure settings and file sharing
