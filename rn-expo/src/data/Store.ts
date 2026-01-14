import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

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

export interface Settings {
    quick_load_files: string[];
    admin_name: string;
    admin_role: string;
    admin_signature: string; // Text signature
    admin_signature_image?: string; // Image signature (base64)
    company_name: string;
    company_logo: string;
    company_contact: string;
    pdf_page_size: 'A4' | 'A5';
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
  pdf_page_size: 'A4'
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

export const Store = {
  settings: { ...defaultSettings },
  users: { admin: "admin123" } as Record<string, string>,
  listeners: [] as (() => void)[],

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
    await this.loadUsers();

    if (Platform.OS !== 'web' && db) {
      db.execAsync(
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
      ).catch(err => console.error("DB Init Error", err));
    } else {
      webRecords = [];
    }
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
    try {
        if (Platform.OS !== 'web') {
            await FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify(this.settings));
        }
    } catch (e) { console.log("Failed to save settings", e); }
  },
  
  getSettings(): Settings {
    return this.settings;
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
        ).catch(err => console.error("DB Init Error", err));
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
  }
};