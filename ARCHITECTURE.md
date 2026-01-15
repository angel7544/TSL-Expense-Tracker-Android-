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

## High‑Level Overview
Android TSL Expense is organised around a clean separation of concerns between data, import/export utilities, UI screens and the native Android layer. At the core sits the Store module, a TypeScript abstraction over a local SQLite database. It centralises all financial records, planner entities (budgets, todos, notes) and app settings (admin credentials, PDF options, recent databases, etc.). Every screen reads from and writes to the Store instead of talking to SQLite directly, which keeps persistence logic in one place and allows features like global refresh and cross‑screen updates.

The ImportExport module forms the bridge between external files and the Store. It uses SheetJS (`xlsx`) to parse XLSX, XLS and ODS spreadsheets and a custom CSV parser for pasted text. It normalises column names to the internal data model (date, description, category, merchant, paid through, income, expense) and returns a list of records ready to be imported. Settings and backup operations also route through this layer to produce CSV, Excel or JSON strings that can be saved or shared using Expo File System and Sharing.

On the UI side, the Expo React Native app is composed of several main screens: Home, List, Charts, Report, Settings and a Planner navigator. Home shows a dashboard view with current balance, quick stats and recent transactions. List provides full CRUD with advanced filters (year, month, category, merchant, paid through) and a global Add dialog that is accessible from the custom bottom tab bar. Settings hosts admin login, import/export/backup tools, logo configuration, PDF options (page size, signatures) and database management such as switching between recent files.

The Charts screen focuses on analytics. It queries the Store for a specific month/year and constructs two visualisations using `react-native-chart-kit`. The first is an Income vs Expense bar chart, showing high‑level cash flow. The second is a category‑wise donut/pie chart that breaks expenses down by category with colours, transaction counts and compact totals. Under the chart, a detailed list displays each category with an icon, number of transactions and formatted amount. Users can swipe months forward or backward and generate a PDF report of the analytics section using `expo-print` and `expo-sharing`, which renders HTML tables and summary metrics to a shareable document.

The Report screen focuses on tabular and printable summaries rather than interactive charts. It also integrates with PDF generation, allowing a more detailed, text‑oriented financial report across the selected period. Both Charts and Report rely on the same underlying Store queries, ensuring consistency between visual and textual analytics.

Planner mode introduces three additional entities: budgets, todos and notes. Budgets allow planning expected income and expenses per category; todos can have due times and native notifications via `expo-notifications`; notes can embed images stored as base64. These planner tables live in the same SQLite database but are accessed through dedicated planner screens grouped in a top‑tab navigator. This keeps financial tracking and daily planning in one app while still preserving a clear separation at the UI and data layer.

Navigation is powered by React Navigation with a custom bottom tab bar. A floating central button opens the AddRecordModal from anywhere, wired via a lightweight UI context so that screens do not need to manage modal state themselves. This design encourages quick capture of expenses or income without navigating back to a specific screen.

On the native side, the `rn-expo/android` Gradle project wraps the Java/Kotlin host app and bundles the React Native JS bundle using the Expo CLI (`@expo/cli`). Build scripts (`gradlew.bat assembleDebug` / `assembleRelease`) use configuration values from the top‑level Gradle files, including a pinned NDK version for compatibility with Expo modules such as SQLite and notifications. The Expo layer (managed from `rn-expo`) handles Metro bundling, Expo Go development, and native “run:android” builds. Together, the architecture balances ease of iteration via Expo with a stable, Gradle‑based production build pipeline.

## Modules
- Store: central data access for records, planner tables and settings (SQLite backed)
- ImportExport: parses CSV and spreadsheets (XLSX/XLS/ODS) and generates CSV/Excel/JSON
- Screens:
  - Home: dashboard and quick stats
  - List: CRUD + advanced filtering
  - Charts: bar and pie/donut charts with PDF export
  - Report: printable summaries and reports
  - Settings: admin, import/export/backup, logos, PDF and DB options
  - Planner: Budgets, Todos and Notes tabs

## Data Model
- Core fields: expense_date, expense_description, expense_category, merchant_name, paid_through, income_amount, expense_amount
- Derived: bal (running balance) and monthly totals
- Sorting: date descending by default
- Filters: description, year, month, category, merchant, paid_through

## Tech Stack
- Expo React Native with TypeScript
- SQLite persistence via `expo-sqlite`
- Charts using `react-native-chart-kit` and `react-native-svg`
- PDF and sharing via `expo-print` and `expo-sharing`
- File import via `expo-document-picker` and `expo-file-system`
- Notifications via `expo-notifications`

## Navigation Diagram

```mermaid
flowchart LR
    subgraph Root[Root Navigator]
        AppTabs[[Bottom Tabs]]
        PlannerTabs[[Planner Top Tabs]]
    end

    AppTabs --> HomeScreen[Home]
    AppTabs --> ListScreen[List]
    AppTabs --> ChartsScreen[Charts]
    AppTabs --> ReportScreen[Report]
    AppTabs --> SettingsScreen[Settings]

    AppTabs --> PlannerTabs
    PlannerTabs --> BudgetsScreen[Budgets]
    PlannerTabs --> TodosScreen[Todos]
    PlannerTabs --> NotesScreen[Notes]

    HomeScreen -.uses.-> AddRecordModal[(AddRecordModal)]
    ListScreen -.uses.-> AddRecordModal
    ChartsScreen -.uses.-> AddRecordModal
    ReportScreen -.uses.-> AddRecordModal
    SettingsScreen -.uses.-> AddRecordModal

    classDef screen fill:#f0f9ff,stroke:#0f5fff,stroke-width:1px;
    classDef modal fill:#fff7ed,stroke:#ea580c,stroke-width:1px;
    class HomeScreen,ListScreen,ChartsScreen,ReportScreen,SettingsScreen,BudgetsScreen,TodosScreen,NotesScreen screen;
    class AddRecordModal modal;
```

## Data Model Diagram

```mermaid
erDiagram
    EXPENSE_RECORD {
        string id
        date expense_date
        string expense_description
        string expense_category
        string merchant_name
        string paid_through
        number income_amount
        number expense_amount
    }

    BUDGET {
        string id
        string category
        number planned_amount
        number actual_amount
        string period_key
    }

    TODO {
        string id
        string title
        string description
        datetime due_time
        boolean is_done
        string notification_id
    }

    NOTE {
        string id
        string title
        string body
        string image_uri
        boolean is_important
    }

    SETTINGS {
        string id
        string key
        string value
    }

    DATABASE ||--o{ EXPENSE_RECORD : stores
    DATABASE ||--o{ BUDGET        : stores
    DATABASE ||--o{ TODO          : stores
    DATABASE ||--o{ NOTE          : stores
    DATABASE ||--o{ SETTINGS      : stores
```

## Import XLSX Sequence

```mermaid
sequenceDiagram
    actor U as User
    participant S as Settings Screen
    participant DP as Expo DocumentPicker
    participant IE as ImportExport
    participant ST as Store
    participant DB as SQLite

    U->>S: Tap "Import XLSX/ODS"
    S->>DP: launchDocumentPicker()
    DP-->>S: file URI + metadata
    S->>IE: parseWorkbookBase64(file)
    IE->>IE: read XLSX/ODS<br/>normalise columns
    IE-->>S: list<ExpenseRecord>
    S->>ST: importRecords(records)
    ST->>DB: INSERT rows
    DB-->>ST: success
    ST-->>S: updated summary
    S-->>U: Show "Import successful" + refreshed counts
```

## Charts & PDF Sequence

```mermaid
sequenceDiagram
    actor U as User
    participant C as Charts Screen
    participant ST as Store
    participant DB as SQLite
    participant PR as expo-print
    participant SH as expo-sharing

    U->>C: Open Charts (month/year)
    C->>ST: list({ year, month })
    ST->>DB: SELECT records
    DB-->>ST: rows
    ST-->>C: list<ExpenseRecord>
    C->>C: aggregate totals<br/>build bar + pie data
    C-->>U: Render charts

    U->>C: Tap "PDF"
    C->>C: build HTML summary + table
    C->>PR: printToFileAsync(html)
    PR-->>C: { uri }
    C->>SH: shareAsync(uri)
    SH-->>U: OS share dialog
```

## Record State Diagram

```mermaid
stateDiagram-v2
    [*] --> New
    New --> Saved: User taps Save
    Saved --> Updated: Edit record
    Updated --> Saved: Save changes
    Saved --> Deleted: Delete from List / Home
    Updated --> Deleted: Delete from List / Home
    Deleted --> [*]
```

## Deployment Overview

```mermaid
flowchart LR
    subgraph DevMachine[Developer / Power User PC]
        Metro[Expo Metro Bundler]
        GradleCLI[Gradle Wrapper]
    end

    subgraph Android[Android Device / Emulator]
        App[Android TSL Expense APK]
        RNJS[React Native Bundle]
        SQLite[(SQLite DB)]
        FS[(File System)]
    end

    Metro --> App
    GradleCLI --> App
    App --> RNJS
    App --> SQLite
    App --> FS
```
