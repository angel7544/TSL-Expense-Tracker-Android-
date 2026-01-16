import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

export interface Budget {
  id?: number;
  category: string;
  amount: number;
  period: 'monthly' | 'yearly';
  month?: string; // "01", "02" etc.
  year: string; // "2024"
}

export interface BudgetSplit {
  id?: number;
  budget_id: number;
  name: string;
  amount: number;
}

export interface Todo {
  id?: number;
  text: string;
  is_completed: boolean;
  due_date?: string; // YYYY-MM-DD
  due_time?: string; // HH:mm
  notification_id?: string;
}

export interface Note {
  id?: number;
  title: string;
  content: string;
  created_at: string;
  image_uri?: string;
  is_important?: boolean;
}

export interface ExpenseRecord {
  id?: number;
  expense_date: string;
  expense_description: string;
  expense_category: string;
  merchant_name: string;
  paid_through: string;
  income_amount: number;
  expense_amount: number;
  report_name?: string;
  bal?: number;
}

export interface Invoice {
  id?: number;
  invoice_number: string;
  client_name: string;
  client_address: string;
  client_phone: string;
  client_gst?: string;
  invoice_date: string;
  due_date?: string;
  items: string; // JSON string of InvoiceItem[]
  total_amount: number;
  subtotal?: number;
  discount?: number;
  tax_rate?: number;
  tax_amount?: number;
  status: 'draft' | 'paid' | 'sent';
}

export interface InvoiceItem {
    name?: string;
    description: string;
    amount: number;
    quantity: number;
}

export interface Settings {
    biometrics_enabled: boolean | undefined;
    lock_enabled: boolean | undefined;
    lock_pin: string;
    quick_load_files: string[];
    admin_name: string;
    admin_role: string;
    admin_signature: string;
    admin_signature_image?: string;
    company_name: string;
    company_logo: string;
    company_contact: string;
    company_gst?: string;
    company_address?: string;
    pdf_page_size: 'A4' | 'A5';
    default_view: 'finance' | 'planner';
    navbar_style?: 'classic' | 'glass';
    theme_name?: 'indigo' | 'emerald' | 'sky' | 'amber';
    theme_mode?: 'light' | 'dark';
    backup_enabled?: boolean;
    backup_frequency?: 'daily' | 'weekly' | 'monthly';
    backup_time?: string;
    backup_last_run?: string;
    primary_db?: string;
    onboarding_completed?: boolean;
}

export interface FilterOptions {
    desc?: string;
    year?: string;
    month?: string;
    category?: string;
    merchant?: string;
}

const defaultSettings: Settings = {
  quick_load_files: ["", "", ""],
  admin_name: "Angel (Mehul) Singh",
  admin_role: "Personal Finance",
  admin_signature: "",
  company_name: "The Space Lab",
  company_logo: "",
  company_contact: "",
  company_gst: "",
  company_address: "",
  pdf_page_size: 'A4',
  biometrics_enabled: false,
  lock_enabled: undefined,
  lock_pin: "",
  default_view: 'finance',
  navbar_style: 'classic',
  theme_name: 'indigo',
  theme_mode: 'light',
  backup_enabled: false,
  backup_frequency: 'monthly',
  backup_time: "00:00",
  backup_last_run: "",
  primary_db: "tsl_expenses.db",
  onboarding_completed: false
};

function toBal(r: ExpenseRecord) {
  return Number(r.income_amount || 0) - Number(r.expense_amount || 0);
}

// In-memory fallback for web
let webRecords: ExpenseRecord[] = [];

// Open database safely
let db: SQLite.SQLiteDatabase | null = null;
if (Platform.OS !== 'web') {
  db = SQLite.openDatabaseSync("tsl_expenses.db");
}

const SETTINGS_FILE = FileSystem.documentDirectory + "settings.json";
const USERS_FILE = FileSystem.documentDirectory + "users.json";
const BACKUP_LOG_FILE = FileSystem.documentDirectory + "backup_log.json";

export const Store = {
  settings: { ...defaultSettings },
  users: { admin: "admin123" } as Record<string, string>,
  isAuthenticated: false,
  authModalVisible: false,
  appMode: 'finance' as 'finance' | 'planner',
  currentDbName: "tsl_expenses.db",
  listeners: [] as (() => void)[],

  setAppMode(mode: 'finance' | 'planner') {
    this.appMode = mode;
    this.notify();
  },

  async setAuthenticated(status: boolean) {
      this.isAuthenticated = status;
      this.notify();
      try {
          if (Platform.OS !== 'web') {
              const AUTH_FILE = FileSystem.documentDirectory + "auth_state.json";
              await FileSystem.writeAsStringAsync(AUTH_FILE, JSON.stringify({ isAuthenticated: status }));
          }
      } catch (e) { console.log("Failed to persist auth state", e); }
  },

  setAuthModalVisible(visible: boolean) {
      this.authModalVisible = visible;
      this.notify();
  },

  async loadAuthState() {
      try {
          if (Platform.OS !== 'web') {
              const AUTH_FILE = FileSystem.documentDirectory + "auth_state.json";
              const info = await FileSystem.getInfoAsync(AUTH_FILE);
              if (info.exists) {
                  const content = await FileSystem.readAsStringAsync(AUTH_FILE);
                  const data = JSON.parse(content);
                  this.isAuthenticated = !!data.isAuthenticated;
              }
          }
      } catch (e) { console.log("Failed to load auth state", e); }
  },

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
        this.listeners = this.listeners.filter(l => l !== listener);
    };
  },

  notify() {
    this.listeners.forEach(l => l());
  },
  
  async init() {
    this.settings = { ...defaultSettings };
    await this.loadSettings();
    await this.loadAuthState();
    await this.loadUsers();

    if (this.settings.primary_db && this.settings.primary_db !== "tsl_expenses.db") {
      await this.switchDatabase(this.settings.primary_db);
    }

    if (Platform.OS !== 'web' && db) {
      // Create Expenses Table
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            expense_date TEXT,
            expense_description TEXT,
            expense_category TEXT,
            merchant_name TEXT,
            paid_through TEXT,
            income_amount REAL,
            expense_amount REAL,
            report_name TEXT
        );`
      ).catch(err => console.error("DB Init Error (expenses)", err));

      // Create Budgets Table
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT,
            amount REAL,
            period TEXT,
            month TEXT,
            year TEXT
        );`
      ).catch(err => console.error("DB Init Error (budgets)", err));

      // Create Todos Table
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT,
            is_completed INTEGER,
            due_date TEXT,
            due_time TEXT,
            notification_id TEXT
        );`
      ).catch(err => console.error("DB Init Error (todos)", err));

      // Simple migration for existing todos table (add columns if missing)
      // This is a bit hacky but works for simple apps. 
      // Better way is to version DB.
      try {
        await db.execAsync("ALTER TABLE todos ADD COLUMN due_time TEXT;");
      } catch (e) { /* ignore if exists */ }
      try {
        await db.execAsync("ALTER TABLE todos ADD COLUMN notification_id TEXT;");
      } catch (e) { /* ignore if exists */ }

      // Create Notes Table
      await db.execAsync(
            `CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT,
                content TEXT,
                created_at TEXT,
                image_uri TEXT,
                is_important INTEGER
            );`
        ).catch(err => console.error("DB Init Error (notes)", err));

      // Migrations for Notes
      try {
        await db.execAsync("ALTER TABLE notes ADD COLUMN image_uri TEXT;");
      } catch (e) { /* ignore */ }
      try {
        await db.execAsync("ALTER TABLE notes ADD COLUMN is_important INTEGER;");
      } catch (e) { /* ignore */ }

      // Create Invoices Table
      await db.execAsync(
         `CREATE TABLE IF NOT EXISTS invoices (
             id INTEGER PRIMARY KEY AUTOINCREMENT,
             invoice_number TEXT,
             client_name TEXT,
             client_address TEXT,
             client_phone TEXT,
             client_gst TEXT,
             invoice_date TEXT,
             due_date TEXT,
             items TEXT,
             total_amount REAL,
             subtotal REAL,
             discount REAL,
             tax_rate REAL,
             tax_amount REAL,
             status TEXT
         );`
       ).catch(err => console.error("DB Init Error (invoices)", err));

       // Migrations for Invoices
       try { await db.execAsync("ALTER TABLE invoices ADD COLUMN client_gst TEXT;"); } catch (e) { /* ignore */ }
       try { await db.execAsync("ALTER TABLE invoices ADD COLUMN subtotal REAL;"); } catch (e) { /* ignore */ }
       try { await db.execAsync("ALTER TABLE invoices ADD COLUMN discount REAL;"); } catch (e) { /* ignore */ }
       try { await db.execAsync("ALTER TABLE invoices ADD COLUMN tax_rate REAL;"); } catch (e) { /* ignore */ }
       try { await db.execAsync("ALTER TABLE invoices ADD COLUMN tax_amount REAL;"); } catch (e) { /* ignore */ }
 
     } else {
      webRecords = [];
    }
    this.notify();
  },

  async loadSettings() {
    try {
      if (Platform.OS !== 'web') {
          const info = await FileSystem.getInfoAsync(SETTINGS_FILE);
          if (info.exists) {
            const content = await FileSystem.readAsStringAsync(SETTINGS_FILE);
            const saved = JSON.parse(content);
            this.settings = { ...this.settings, ...saved };
          }
      }
    } catch (e) { console.log("Failed to load settings", e); }
 },

 async loadUsers() {
    try {
      if (Platform.OS !== 'web') {
          const info = await FileSystem.getInfoAsync(USERS_FILE);
          if (info.exists) {
            const content = await FileSystem.readAsStringAsync(USERS_FILE);
            const saved = JSON.parse(content);
            this.users = { ...this.users, ...saved };
          }
      }
    } catch (e) { console.log("Failed to load users", e); }
 },

 async setUser(username: string, password: string) {
     this.users[username] = password;
     try {
        if (Platform.OS !== 'web') {
            await FileSystem.writeAsStringAsync(USERS_FILE, JSON.stringify(this.users));
        }
     } catch (e) { console.log("Failed to save users", e); }
 },


  get records(): ExpenseRecord[] {
    return Platform.OS === 'web' ? webRecords : []; 
  },

  async setSettings(s: Partial<Settings>) {
    this.settings = { ...this.settings, ...s };
    this.notify();
    try {
        if (Platform.OS !== 'web') {
            await FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify(this.settings));
        }
    } catch (e) { console.log("Failed to save settings", e); }
  },
  
  getSettings(): Settings {
    return this.settings;
  },

  async createJsonBackup(name: string) {
    if (Platform.OS === 'web') return;
    try {
      const records = await this.list({});
      const json = JSON.stringify(records, null, 2);
      const safeName = name.replace(/[^a-z0-9]/gi, '_') || 'backup';
      const dbName = this.currentDbName || "tsl_expenses.db";
      const safeDbName = dbName.replace(/[^a-z0-9]/gi, '_');
      const filename = `backup_${safeDbName}_${safeName}_${Date.now()}.json`;
      const uri = FileSystem.documentDirectory + filename;

      await FileSystem.writeAsStringAsync(uri, json);

      let logs: any[] = [];
      const info = await FileSystem.getInfoAsync(BACKUP_LOG_FILE);
      if (info.exists) {
        const content = await FileSystem.readAsStringAsync(BACKUP_LOG_FILE);
        logs = JSON.parse(content);
      }

      const newLog = {
        id: Date.now().toString(),
        name,
        filename,
        date: new Date().toISOString(),
        recordCount: records.length,
        uri,
        dbName
      };

      logs.unshift(newLog);
      await FileSystem.writeAsStringAsync(BACKUP_LOG_FILE, JSON.stringify(logs));
    } catch (e) {
      console.error("createJsonBackup", e);
    }
  },

  async runScheduledBackupIfDue() {
    if (Platform.OS === 'web') return;
    const currentSettings = this.getSettings();
    if (!currentSettings.backup_enabled) {
        console.log("AutoBackup: Disabled in settings");
        return;
    }

    const now = new Date();
    const lastRun = currentSettings.backup_last_run ? new Date(currentSettings.backup_last_run) : null;
    const frequency = currentSettings.backup_frequency || 'daily';
    const backupTime = currentSettings.backup_time || "00:00";

    const [th, tm] = backupTime.split(':').map(Number);
    
    let shouldRun = false;

    console.log(`AutoBackup Check: Now=${now.toISOString()}, LastRun=${lastRun?.toISOString()}, Freq=${frequency}, Time=${backupTime}`);

    if (!lastRun) {
        // First run: only if we are past the scheduled time today
        const targetTimeToday = new Date(now);
        targetTimeToday.setHours(th, tm, 0, 0);
        console.log(`AutoBackup: First run check. Target=${targetTimeToday.toISOString()}`);
        if (now >= targetTimeToday) {
            shouldRun = true;
            console.log("AutoBackup: Triggering first run (past target time)");
        }
    } else {
        // Calculate next scheduled run based on last run
        const nextRun = new Date(lastRun);
        // Important: Ensure we respect the user's preferred time for the next run
        // We set the time on the *next* date, not the last run date
        nextRun.setHours(th, tm, 0, 0); 
        
        if (frequency === 'daily') {
            nextRun.setDate(nextRun.getDate() + 1);
        } else if (frequency === 'weekly') {
            nextRun.setDate(nextRun.getDate() + 7);
        } else {
            // monthly
            nextRun.setMonth(nextRun.getMonth() + 1);
        }
        
        console.log(`AutoBackup: Next scheduled run is ${nextRun.toISOString()}`);

        // If we are past the next scheduled run, do it
        if (now >= nextRun) {
            shouldRun = true;
            console.log("AutoBackup: Triggering scheduled run (overdue)");
        }
    }

    if (!shouldRun) {
        console.log("AutoBackup: Not due yet");
        return;
    }

    console.log("AutoBackup: Starting backup loop...");
    await this._executeBackupLoop(`Auto ${frequency}`);
    await this.setSettings({ backup_last_run: now.toISOString() });
    console.log("AutoBackup: Backup loop completed and settings updated");
  },

  async runManualBackupNow() {
    if (Platform.OS === 'web') return { created: 0, failed: 0 };
    return await this._executeBackupLoop('Manual');
  },

  async _executeBackupLoop(tagPrefix: string) {
    const now = new Date();
    const dateLabel = now.toISOString().split('T')[0];
    const originalDb = this.currentDbName || "tsl_expenses.db";

    const allDbs: { name: string; dbName: string }[] = [
      { name: "Default", dbName: "tsl_expenses.db" }
    ];

    try {
      const recent = await this.getRecentDatabases();
      for (const r of recent) {
        if (!allDbs.find(x => x.dbName === r.dbName)) {
          allDbs.push({ name: r.name || r.dbName, dbName: r.dbName });
        }
      }
    } catch (e) {
      console.error("Failed to load recent DBs for backup loop", e);
    }

    let created = 0;
    let failed = 0;

    for (const entry of allDbs) {
      try {
        if (entry.dbName !== this.currentDbName) {
          await this.switchDatabase(entry.dbName);
        }
        const dbLabel = entry.name || entry.dbName;
        const name = `${dbLabel} | ${tagPrefix} ${dateLabel}`;
        await this.createJsonBackup(name);
        created++;
      } catch (e) {
        console.error(`Backup failed for ${entry.dbName}`, e);
        failed++;
      }
    }

    if (originalDb !== this.currentDbName) {
      try {
        await this.switchDatabase(originalDb);
      } catch (e) {
        console.error("Failed to restore original DB after backup loop", e);
      }
    }
    
    return { created, failed };
  },

  async addRecentDatabase(name: string, dbName: string) {
    if (Platform.OS === 'web') return;
    try {
        const path = FileSystem.documentDirectory + "recent_files.json";
        let current: any[] = [];
        const info = await FileSystem.getInfoAsync(path);
        if (info.exists) {
            const content = await FileSystem.readAsStringAsync(path);
            current = JSON.parse(content);
        }
        // Remove duplicates
        current = current.filter(x => x.dbName !== dbName);
        // Add to top
        current.unshift({ name, dbName, uri: "" }); // uri not really needed for internal DBs
        // Limit to 10
        current = current.slice(0, 10);
        
        await FileSystem.writeAsStringAsync(path, JSON.stringify(current));
        this.notify();
    } catch (e) { console.error("Failed to save recent DB", e); }
  },

  async getRecentDatabases() {
      if (Platform.OS === 'web') return [];
      try {
          const path = FileSystem.documentDirectory + "recent_files.json";
          const info = await FileSystem.getInfoAsync(path);
          if (info.exists) {
              const content = await FileSystem.readAsStringAsync(path);
              return JSON.parse(content);
          }
      } catch (e) { console.error(e); }
      return [];
  },

  async removeRecentDatabase(dbName: string) {
    if (Platform.OS === 'web') return;
    try {
        const path = FileSystem.documentDirectory + "recent_files.json";
        const info = await FileSystem.getInfoAsync(path);
        if (info.exists) {
            const content = await FileSystem.readAsStringAsync(path);
            let current: any[] = JSON.parse(content);
            current = current.filter(x => x.dbName !== dbName);
            await FileSystem.writeAsStringAsync(path, JSON.stringify(current));
            this.notify();
        }
    } catch (e) { console.error("Failed to remove recent DB", e); }
  },

  async switchDatabase(dbName: string) {
    if (Platform.OS === 'web') return;
    try {
        if (db) {
            try {
                await db.closeAsync();
            } catch (e) { console.log("Error closing old DB", e); }
        }
        db = await SQLite.openDatabaseAsync(dbName);
        this.currentDbName = dbName;
        await this.initDB();
        this.notify();
    } catch (e) {
        console.error("Failed to switch DB", e);
    }
  },

  async initDB() {
      if (Platform.OS !== 'web' && db) {
        await db.execAsync(
          `CREATE TABLE IF NOT EXISTS expenses (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              expense_date TEXT,
              expense_description TEXT,
              expense_category TEXT,
              merchant_name TEXT,
              paid_through TEXT,
              income_amount REAL,
              expense_amount REAL,
              report_name TEXT
          );`
        ).catch(err => console.error("DB Init Error (expenses)", err));

        await db.execAsync(
            `CREATE TABLE IF NOT EXISTS budgets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT,
                amount REAL,
                period TEXT,
                month TEXT,
                year TEXT
            );`
        ).catch(err => console.error("DB Init Error (budgets)", err));
        
        await db.execAsync(
            `CREATE TABLE IF NOT EXISTS budget_splits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                budget_id INTEGER,
                name TEXT,
                amount REAL
            );`
        ).catch(err => console.error("DB Init Error (budget_splits)", err));
    
        await db.execAsync(
            `CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT,
                is_completed INTEGER,
                due_date TEXT,
                due_time TEXT,
                notification_id TEXT
            );`
        ).catch(err => console.error("DB Init Error (todos)", err));
    
        await db.execAsync(
            `CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT,
                content TEXT,
                created_at TEXT
            );`
        ).catch(err => console.error("DB Init Error (notes)", err));
      }
  },

  async list(filters: FilterOptions): Promise<ExpenseRecord[]> {
    return new Promise(async (resolve, reject) => {
      if (Platform.OS === 'web') {
        let d = [...webRecords];
        if (filters?.desc) d = d.filter(x => String(x.expense_description || "").toLowerCase().includes(String(filters.desc).toLowerCase()));
        if (filters?.year && filters.year !== "All") d = d.filter(x => x.expense_date.startsWith(filters.year!));
        if (filters?.month && filters.month !== "All") {
             d = d.filter(x => x.expense_date.split("-")[1] === filters.month);
        }
        if (filters?.category && filters.category !== "All") d = d.filter(x => x.expense_category === filters.category);
        if (filters?.merchant && filters.merchant !== "All") d = d.filter(x => x.merchant_name === filters.merchant);
        
        d = d.map(x => ({ ...x, bal: toBal(x) })).sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
        resolve(d);
      } else {
        if (!db) { console.warn("DB not ready"); resolve([]); return; }
        let query = "SELECT * FROM expenses WHERE 1=1";
        const args: (string | number)[] = [];
        
        if (filters?.desc) {
          query += " AND expense_description LIKE ?";
          args.push(`%${filters.desc}%`);
        }
        if (filters?.year && filters.year !== "All") {
          query += " AND strftime('%Y', expense_date) = ?";
          args.push(filters.year!);
        }
        if (filters?.month && filters.month !== "All") {
          query += " AND strftime('%m', expense_date) = ?";
          args.push(filters.month!);
        }
        if (filters?.category && filters.category !== "All") {
           query += " AND expense_category = ?";
           args.push(filters.category!);
        }
        if (filters?.merchant && filters.merchant !== "All") {
           query += " AND merchant_name = ?";
           args.push(filters.merchant!);
        }
        
        query += " ORDER BY expense_date DESC";

        try {
            const rows = await db.getAllAsync<ExpenseRecord>(query, args);
            const data = rows.map((x) => ({ ...x, bal: toBal(x) }));
            resolve(data);
        } catch (err) {
            console.error("List Error", err);
            resolve([]);
        }
      }
    });
  },

  async getCategoryTotals(year: string, month: string, type: 'expense' | 'income' = 'expense'): Promise<{category: string, amount: number}[]> {
    const records = await this.list({ year, month });
    const totals: Record<string, number> = {};
    
    records.forEach(r => {
        const amount = type === 'expense' ? Number(r.expense_amount || 0) : Number(r.income_amount || 0);
        if (amount > 0) {
            const cat = r.expense_category || "Uncategorized";
            totals[cat] = (totals[cat] || 0) + amount;
        }
    });

    return Object.entries(totals)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);
  },

  getFilterOptions(): Promise<{years: string[], categories: string[], merchants: string[]}> {
    return new Promise(async (resolve) => {
      if (Platform.OS === 'web') {
        const years = [...new Set(webRecords.map(r => r.expense_date.slice(0, 4)))].sort().reverse();
        const cats = [...new Set(webRecords.map(r => r.expense_category).filter(Boolean))].sort();
        const merchs = [...new Set(webRecords.map(r => r.merchant_name).filter(Boolean))].sort();
        resolve({ years, categories: cats, merchants: merchs });
      } else {
         if (!db) { resolve({ years: [], categories: [], merchants: [] }); return; }
         try {
           const yearsRes = await db.getAllAsync<{y: string}>("SELECT DISTINCT strftime('%Y', expense_date) as y FROM expenses ORDER BY y DESC");
           const catsRes = await db.getAllAsync<{c: string}>("SELECT DISTINCT expense_category as c FROM expenses ORDER BY c ASC");
           const merchsRes = await db.getAllAsync<{m: string}>("SELECT DISTINCT merchant_name as m FROM expenses ORDER BY m ASC");
           
           resolve({
             years: yearsRes.map(x => x.y).filter(Boolean),
             categories: catsRes.map(x => x.c).filter(Boolean),
             merchants: merchsRes.map(x => x.m).filter(Boolean)
           });
         } catch (err) {
            console.error(err);
            resolve({ years: [], categories: [], merchants: [] });
         }
      }
    });
  },

  getUniqueValues(field: 'paid_through' | 'expense_category' | 'merchant_name'): Promise<string[]> {
    return new Promise(async (resolve) => {
        if (Platform.OS === 'web') {
            const vals = [...new Set(webRecords.map(r => r[field]).filter(Boolean))].sort();
            resolve(vals);
        } else {
            if (!db) { resolve([]); return; }
            try {
                const res = await db.getAllAsync<{val: string}>(`SELECT DISTINCT ${field} as val FROM expenses ORDER BY val ASC`);
                resolve(res.map(x => x.val).filter(Boolean));
            } catch (err) {
                console.error("getUniqueValues error", err);
                resolve([]);
            }
        }
    });
  },

  async summaryAsync(filters: FilterOptions) {
    const d = await this.list(filters);
    const inc = d.reduce((s, x) => s + Number(x.income_amount || 0), 0);
    const exp = d.reduce((s, x) => s + Number(x.expense_amount || 0), 0);
    const total = inc - exp;
    return { count: d.length, inc, exp, total, records: d };
  },

  summary(filters: FilterOptions) {
    return { count: 0, inc: 0, exp: 0, total: 0 };
  },

  async add(record: ExpenseRecord, shouldNotify = true) {
    if (Platform.OS === 'web') {
        const newRecord = { ...record, id: Date.now() };
        webRecords.unshift(newRecord);
        if (shouldNotify) this.notify();
    } else {
        if (!db) return;
        try {
            await db.runAsync(
                `INSERT INTO expenses (expense_date, expense_description, expense_category, merchant_name, paid_through, income_amount, expense_amount, report_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    record.expense_date,
                    record.expense_description,
                    record.expense_category,
                    record.merchant_name,
                    record.paid_through,
                    record.income_amount,
                    record.expense_amount,
                    record.report_name || ""
                ]
            );
            if (shouldNotify) this.notify();
        } catch (e) {
            console.error("Add Error", e);
        }
    }
  },

  async update(record: ExpenseRecord) {
    if (Platform.OS === 'web') {
        const index = webRecords.findIndex(r => r.id === record.id);
        if (index !== -1) {
            webRecords[index] = record;
            this.notify();
        }
    } else {
        if (!db) return;
        try {
            await db.runAsync(
                `UPDATE expenses SET expense_date = ?, expense_description = ?, expense_category = ?, merchant_name = ?, paid_through = ?, income_amount = ?, expense_amount = ?, report_name = ? WHERE id = ?`,
                [
                    record.expense_date,
                    record.expense_description,
                    record.expense_category,
                    record.merchant_name,
                    record.paid_through,
                    record.income_amount,
                    record.expense_amount,
                    record.report_name || "",
                    record.id!
                ]
            );
            this.notify();
        } catch (e) {
            console.error("Update Error", e);
        }
    }
  },

  remove(id: number): Promise<void> {
    return new Promise(async (resolve) => {
      if (Platform.OS === 'web') {
        const i = webRecords.findIndex(x => x.id === id);
        if (i >= 0) webRecords.splice(i, 1);
        this.notify();
        resolve();
      } else {
        try {
            await db!.runAsync("DELETE FROM expenses WHERE id = ?", [id]);
            this.notify();
            resolve();
        } catch (err) {
            resolve();
        }
      }
    });
  },

  async isDuplicate(record: ExpenseRecord): Promise<boolean> {
      if (Platform.OS === 'web') {
          return webRecords.some(r => 
              r.expense_date === record.expense_date &&
              r.expense_description === record.expense_description &&
              r.expense_category === record.expense_category &&
              r.merchant_name === record.merchant_name &&
              r.income_amount === record.income_amount &&
              r.expense_amount === record.expense_amount
          );
      } else {
          if (!db) return false;
          try {
               const query = `
                  SELECT id FROM expenses 
                  WHERE expense_date = ? 
                  AND expense_description = ? 
                  AND expense_category = ? 
                  AND merchant_name = ? 
                  AND abs(income_amount - ?) < 0.001 
                  AND abs(expense_amount - ?) < 0.001
                  LIMIT 1
               `;
               const rows = await db.getAllAsync(query, [
                   record.expense_date, 
                   record.expense_description, 
                   record.expense_category,
                   record.merchant_name,
                   record.income_amount,
                   record.expense_amount
               ]);
               return rows.length > 0;
          } catch (e) {
              console.error("Duplicate check error", e);
              return false;
          }
      }
  },

  async importCSV(rows: ExpenseRecord[], reportName: string, checkDuplicates: boolean = false) {
    const name = reportName || "Manual";
    let addedCount = 0;
    for (const r of rows) {
      if (checkDuplicates) {
        const isDup = await this.isDuplicate(r);
        if (isDup) continue;
      }
      await this.add({ ...r, report_name: name }, false);
      addedCount++;
    }
    this.notify();
    return addedCount;
  },

  exportCSV(records: ExpenseRecord[]) {
    const cols = [
      "Expense Date", "Expense Description", "Expense Category", "Merchant Name",
      "Paid Through", "Income Amount", "Expense Amount", "Report Name"
    ];
    const header = cols.join(",") + "\n";
    const rows = records.map(r => 
      [
        r.expense_date,
        `"${(r.expense_description || "").replace(/"/g, '""')}"`,
        `"${(r.expense_category || "").replace(/"/g, '""')}"`,
        `"${(r.merchant_name || "").replace(/"/g, '""')}"`,
        `"${(r.paid_through || "").replace(/"/g, '""')}"`,
        r.income_amount,
        r.expense_amount,
        `"${(r.report_name || "").replace(/"/g, '""')}"`
      ].join(",")
    ).join("\n");
    return header + rows;
  },

  // --- Budgets ---
  async getBudgets(year: string, month: string): Promise<Budget[]> {
      if (Platform.OS === 'web' || !db) return [];
      try {
          return await db.getAllAsync<Budget>(
              "SELECT * FROM budgets WHERE year = ? AND (period = 'yearly' OR (period = 'monthly' AND month = ?))",
              [year, month]
          );
      } catch (e) { console.error("getBudgets", e); return []; }
  },

  async saveBudget(budget: Budget) {
      if (Platform.OS === 'web' || !db) return;
      try {
          if (budget.id) {
              await db.runAsync(
                  "UPDATE budgets SET category = ?, amount = ?, period = ?, month = ?, year = ? WHERE id = ?",
                  [budget.category, budget.amount, budget.period, budget.month || "", budget.year, budget.id]
              );
          } else {
              await db.runAsync(
                  "INSERT INTO budgets (category, amount, period, month, year) VALUES (?, ?, ?, ?, ?)",
                  [budget.category, budget.amount, budget.period, budget.month || "", budget.year]
              );
          }
          this.notify();
      } catch (e) { console.error("saveBudget", e); }
  },

  async deleteBudget(id: number) {
      if (Platform.OS === 'web' || !db) return;
      try {
          await db.runAsync("DELETE FROM budget_splits WHERE budget_id = ?", [id]);
          await db.runAsync("DELETE FROM budgets WHERE id = ?", [id]);
          this.notify();
      } catch (e) { console.error("deleteBudget", e); }
  },

  async getBudgetSplits(budgetId: number): Promise<BudgetSplit[]> {
      if (Platform.OS === 'web' || !db) return [];
      try {
          return await db.getAllAsync<BudgetSplit>(
              "SELECT * FROM budget_splits WHERE budget_id = ? ORDER BY id ASC",
              [budgetId]
          );
      } catch (e) { console.error("getBudgetSplits", e); return []; }
  },

  async saveBudgetSplit(split: BudgetSplit) {
      if (Platform.OS === 'web' || !db) return;
      try {
          if (split.id) {
              await db.runAsync(
                  "UPDATE budget_splits SET budget_id = ?, name = ?, amount = ? WHERE id = ?",
                  [split.budget_id, split.name, split.amount, split.id]
              );
          } else {
              await db.runAsync(
                  "INSERT INTO budget_splits (budget_id, name, amount) VALUES (?, ?, ?)",
                  [split.budget_id, split.name, split.amount]
              );
          }
          this.notify();
      } catch (e) { console.error("saveBudgetSplit", e); }
  },

  async deleteBudgetSplit(id: number) {
      if (Platform.OS === 'web' || !db) return;
      try {
          await db.runAsync("DELETE FROM budget_splits WHERE id = ?", [id]);
          this.notify();
      } catch (e) { console.error("deleteBudgetSplit", e); }
  },

  async replaceBudgetSplits(budgetId: number, splits: { name: string; amount: number }[]) {
      if (Platform.OS === 'web' || !db) return;
      try {
          await db.runAsync("DELETE FROM budget_splits WHERE budget_id = ?", [budgetId]);
          for (const s of splits) {
              await db.runAsync(
                  "INSERT INTO budget_splits (budget_id, name, amount) VALUES (?, ?, ?)",
                  [budgetId, s.name, s.amount]
              );
          }
          this.notify();
      } catch (e) { console.error("replaceBudgetSplits", e); }
  },

  // --- Todos ---
  async getTodos(): Promise<Todo[]> {
      if (Platform.OS === 'web' || !db) return [];
      try {
          return await db.getAllAsync<Todo>("SELECT * FROM todos ORDER BY is_completed ASC, id DESC");
      } catch (e) { console.error("getTodos", e); return []; }
  },

  async saveTodo(todo: Todo) {
      if (Platform.OS === 'web' || !db) return;
      try {
          if (todo.id) {
              await db.runAsync(
                  "UPDATE todos SET text = ?, is_completed = ?, due_date = ?, due_time = ?, notification_id = ? WHERE id = ?",
                  [todo.text, todo.is_completed ? 1 : 0, todo.due_date || "", todo.due_time || "", todo.notification_id || "", todo.id]
              );
          } else {
              await db.runAsync(
                  "INSERT INTO todos (text, is_completed, due_date, due_time, notification_id) VALUES (?, ?, ?, ?, ?)",
                  [todo.text, todo.is_completed ? 1 : 0, todo.due_date || "", todo.due_time || "", todo.notification_id || ""]
              );
          }
          this.notify();
      } catch (e) { console.error("saveTodo", e); }
  },

  async deleteTodo(id: number) {
      if (Platform.OS === 'web' || !db) return;
      try {
          await db.runAsync("DELETE FROM todos WHERE id = ?", [id]);
          this.notify();
      } catch (e) { console.error("deleteTodo", e); }
  },

  // --- Notes ---
  async getNotes(): Promise<Note[]> {
      if (Platform.OS === 'web' || !db) return [];
      try {
          return await db.getAllAsync<Note>("SELECT * FROM notes ORDER BY created_at DESC");
      } catch (e) { console.error("getNotes", e); return []; }
  },

  async saveNote(note: Note) {
      if (Platform.OS === 'web' || !db) return;
      try {
          if (note.id) {
              await db.runAsync(
                  "UPDATE notes SET title = ?, content = ?, created_at = ?, image_uri = ?, is_important = ? WHERE id = ?",
                  [note.title, note.content, note.created_at, note.image_uri || "", note.is_important ? 1 : 0, note.id]
              );
          } else {
              await db.runAsync(
                  "INSERT INTO notes (title, content, created_at, image_uri, is_important) VALUES (?, ?, ?, ?, ?)",
                  [note.title, note.content, note.created_at, note.image_uri || "", note.is_important ? 1 : 0]
              );
          }
          this.notify();
      } catch (e) { console.error("saveNote", e); }
  },

  async deleteNote(id: number) {
      if (Platform.OS === 'web' || !db) return;
      try {
          await db.runAsync("DELETE FROM notes WHERE id = ?", [id]);
          this.notify();
      } catch (e) { console.error("deleteNote", e); }
  },

  // --- Invoices ---
  async getInvoices(): Promise<Invoice[]> {
    if (Platform.OS === 'web' || !db) return [];
    try {
        const result = await db.getAllAsync<Invoice>(`SELECT * FROM invoices ORDER BY id DESC`);
        return result;
    } catch (e) {
        console.error("Failed to get invoices", e);
        return [];
    }
  },

  async addInvoice(inv: Invoice) {
    if (Platform.OS === 'web') return;
    if (!db) return;
    try {
      await db.runAsync(
        `INSERT INTO invoices (invoice_number, client_name, client_address, client_phone, client_gst, invoice_date, due_date, items, total_amount, subtotal, discount, tax_rate, tax_amount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            inv.invoice_number,
            inv.client_name,
            inv.client_address,
            inv.client_phone,
            inv.client_gst || "",
            inv.invoice_date,
            inv.due_date || "",
            inv.items,
            inv.total_amount,
            inv.subtotal || 0,
            inv.discount || 0,
            inv.tax_rate || 0,
            inv.tax_amount || 0,
            inv.status
        ]
      );
      this.notify();
    } catch (e) {
      console.error("Failed to add invoice", e);
      throw e;
    }
  },

  async deleteInvoice(id: number) {
    if (Platform.OS === 'web') return;
    if (!db) return;
    try {
        await db.runAsync("DELETE FROM invoices WHERE id = ?", [id]);
        this.notify();
    } catch (e) {
        console.error("Failed to delete invoice", e);
    }
  }
};
