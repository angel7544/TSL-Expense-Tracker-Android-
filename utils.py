import pandas as pd
import tkinter as tk
from tkinter import ttk, messagebox, filedialog, scrolledtext, simpledialog
from datetime import datetime
import os
import sys
import json
import shutil
import webbrowser
import glob
from security_manager import SecurityManager
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.graphics.shapes import Drawing, Line
from io import BytesIO

""" 
 Expense Analysis Tool - GUI Application 
 
 
 Overview: 
 This is a graphical user interface (GUI) application built with Tkinter for analyzing expense and income reports. 
 It supports loading data from CSV or ODS (OpenDocument Spreadsheet) files. 
 - For CSV: Header is on row 1 (0-indexed: header=0, default). 
 - For ODS: Header is on row 4 (0-indexed: header=3). 
 Empty rows before/after header are handled by pandas (NaN rows filtered out in unique values). 
 The application provides filtering options via dropdown combos for specific columns, a text search for descriptions, 
 and displays a summary along with raw data in a sortable table. 
 
 
 Key Features: 
 - File Selection: User selects a CSV or ODS file via file dialog (ODS default). 
 - Quick Load: Load up to 3 pre-defined files configured in Settings. 
 - Data Loading: Automatically detects file type and loads using pandas (CSV: read_csv with header=0; ODS: read_excel with engine='odf' and header=3). 
   Note: For ODS support, install odfpy: pip install odfpy (not handled in app). 
 - Column Exclusion: 'Total' column is automatically dropped if present. 
 - Filters: 
   - Dropdowns (Comboboxes) for: Report Name (Col A), Year/Month (from Col C), Expense Category (Col F), 
     Merchant Name (Col H), Paid Through (Col G). 
   - Text entry for searching Expense Description (Col E) - case-insensitive partial match. 
 - Analysis: Applies all selected filters cumulatively. 
 - Sorting: Results sorted by Expense Date in descending order (newest first). 
 - Output: 
   - Summary: Total records, total income/expense/net balance, and breakdown by Category and Merchant (count, inc, exp, net). 
   - Raw Data: Tabular view with pagination-like scrolling, full descriptions displayed, Inc/Exp/Bal columns. 
 - Export: Save filtered raw data to CSV file. 
 - Application icon: Displays TSL logo (PNG format supported). 
 - All filters default to "All" (no filter applied). 
 - Date Handling: Supports string (YYYY-MM-DD) or date formats for 'Expense Date'. 
 
 
 Applicable Dates: 
 The tool handles dates in YYYY-MM-DD format. Sample data covers December 2025 (e.g., 2025-12-04 to 2025-12-05). 
 
 
 Assumptions: 
 - Data columns follow the structure: Report Name, Total, Expense Date, Expense Amount, Expense Description, 
   Expense Category, Paid Through, Merchant Name, Income Amount (exact names not enforced, but combos built dynamically). 
 - Dates in 'Expense Date' column are convertible to datetime for sorting. 
 - Amounts in 'Expense Amount' and 'Income Amount' are numeric. 
 - Handles empty results with user message. 
 - Empty rows (e.g., before data) are included as NaN but filtered out in dropdowns and analysis. 
 
 
 Usage: 
 1. Save the TSL logo as "tsl_icon.png" in the same folder as this script. 
 2. Run the script: python UtilsExp0116.py 
 3. Click "Load File" to select ODS or CSV. 
 4. Select filters as needed (defaults show all data). 
 5. Click "Analyse" to view summary and table. 
 6. Use "Export to CSV" to save the displayed raw data. 
 7. Re-load file or adjust filters for new analysis. 
 
 
 Dependencies: 
 - Python 3.6+ (tested with 3.12) 
 - pandas (for data handling) 
 - tkinter (standard library for GUI) 
 - odfpy (for ODS reading; install separately if needed) 
 
 
 Error Handling: 
 - Invalid file: Message box with error. 
 - No data: Informative message. 
 - Non-numeric amounts: Pandas will coerce to NaN; sums ignore NaNs. 
 - Missing columns: Validation error on load. 
 
 
 Future Enhancements: 
 - Export results to CSV/Excel. 
 - Advanced search (regex). 
 - Chart visualizations (e.g., pie chart for categories). 
 - Auto-skip empty rows option. 
 
 
 Guided by Uday Kumar for The Space Lab 
 Initially developed for The Space Lab using Grok (v1 - v1.16)
 Updated and extensively upgraded by Angel (Mehul) Singh
 Developed at Br31Technologies with Lite and Robust version
 Updated on: 2026-01-07 
 Author: Angel (Mehul) Singh & Grok 
 Version: 1.17 (Settings, Quick Load, PNG Icon) 
 Change Log: 
 - v1.12: Added comma-separated formatting (e.g., 1,000.00) for display of amounts in labels and tables; Reordered 'Paid Through' after 'Merchant' in Filters and Raw Data sections; Updated documentation date. 
 - v1.13: Added busy cursor during file load; Reset Summary/Raw Data on file load complete; Implemented cascading dropdown filters (selection in one updates available options in others); Ensured key input is considered in dropdowns (ttk.Combobox readonly supports typing to jump/select). 
 - v1.14: Added initial application window icon support using PNG format. 
 - v1.15: Updated icon support to ICO format using iconbitmap for better Windows compatibility; Requires tsl_icon.ico in script directory. 
 - v1.16: Added runtime path handling for tsl_icon.ico in frozen (PyInstaller) mode to ensure icon works in bundled EXE. 
 - v1.17: Added Settings dialog to configure quick load paths; Added 3 Quick Load buttons; Switched to PNG icon support. 
 """

class ExpenseAnalyzer:
    def __init__(self, root):
        self.root = root
        self.root.title("The Space Lab - Expense Analysis Tool v0.3.2")
        self.root.geometry("1200x850")
        
        # UI Styling - Modern Color Palette
        self.bg_color = "#f0f0f0"  # Professional standard grey
        self.accent_color = "#007bff" # Primary blue
        self.text_color = "#333333"
        self.root.configure(bg=self.bg_color)
        
        # App Path and Backups Directory
        if getattr(sys, 'frozen', False):
            self.app_path = os.path.dirname(sys.executable)
        else:
            self.app_path = os.path.dirname(os.path.abspath(__file__))
            
        self.backups_dir = os.path.join(self.app_path, "backups")
        if not os.path.exists(self.backups_dir):
            os.makedirs(self.backups_dir)
        
        self.setup_styles()
        
        # Security Manager
        self.security = SecurityManager()
        
        # Load settings
        self.settings_file = "settings.json"
        self.settings = self.load_settings()

        # Icon setup
        self.setup_icon()
        
        # Data holders
        self.df = None
        self.filtered_df = None
        self.current_file_path = None
        self.tooltip = None
        self.updating_combos = False
        self.edit_mode = False
        self.is_admin_authenticated = False
        
        # UI Components
        self.create_widgets()
        self.update_ui_for_no_data()

    def load_users(self):
        users_file = "users.json"
        default_users = {"admin": "admin123"}
        return self.security.load_json_encrypted(users_file, default_users)

    def save_users(self, users):
        users_file = "users.json"
        try:
            self.security.save_json_encrypted(users, users_file)
            return True
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save users: {e}")
            return False

    def show_login_dialog(self, success_callback=None):
        # If already authenticated, skip login
        if self.is_admin_authenticated:
            if success_callback:
                success_callback()
            else:
                self.toggle_edit_mode()
            return

        login_win = tk.Toplevel(self.root)
        login_win.title("Admin Login")
        login_win.geometry("300x200")
        login_win.configure(bg=self.bg_color)
        self.center_window(login_win)
        
        ttk.Label(login_win, text="User ID:", background=self.bg_color).pack(pady=5)
        user_entry = ttk.Entry(login_win)
        user_entry.pack(pady=5)
        
        ttk.Label(login_win, text="Password:", background=self.bg_color).pack(pady=5)
        pass_entry = ttk.Entry(login_win, show="*")
        pass_entry.pack(pady=5)
        
        def validate():
            username = user_entry.get().strip()
            password = pass_entry.get().strip()
            users = self.load_users()
            
            if username in users and users[username] == password:
                self.is_admin_authenticated = True
                if success_callback:
                    success_callback()
                else:
                    self.toggle_edit_mode()
                login_win.destroy()
            else:
                messagebox.showerror("Error", "Invalid Credentials")

        ttk.Button(login_win, text="Login", command=validate).pack(pady=10)

    def toggle_edit_mode(self):
        if self.edit_mode:
            # Disable Edit Mode
            self.edit_mode = False
            self.status_label.config(text="Edit Mode Disabled", foreground="black")
            self.btn_edit.config(text="Enable Edit Mode")
            self.btn_save.pack_forget()
            
            # Disable actions
            self.btn_add.config(state="disabled")
            self.btn_delete.config(state="disabled")
            
            # Disable Charts/Report
            self.btn_charts.config(state="disabled")
            self.btn_report.config(state="disabled")
            
            messagebox.showinfo("Info", "Edit Mode Disabled.")
        else:
            # Enable Edit Mode
            self.enable_edit_mode()

    def enable_edit_mode(self):
        self.edit_mode = True
        self.status_label.config(text="EDIT MODE ENABLED", foreground="green")
        self.btn_edit.config(text="Disable Edit Mode")
        self.btn_save.pack(side=tk.LEFT, padx=5)
        
        # Enable actions
        self.btn_add.config(state="normal")
        self.btn_delete.config(state="normal")
        self.btn_settings.config(state="normal")
        
        # Enable Charts/Report
        if self.df is not None:
            self.btn_charts.config(state="normal")
            self.btn_report.config(state="normal")
        
        messagebox.showinfo("Edit Mode", "Double-click any row in 'Raw Data' to edit.\nClick 'Save Changes' to commit.")

    def save_changes(self):
        if not self.current_file_path or self.df is None: return
        
        try:
            # Version Control - Backup
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            base = os.path.splitext(os.path.basename(self.current_file_path))[0]
            ext = os.path.splitext(self.current_file_path)[1]
            backup_path = os.path.join(self.backups_dir, f"{base}_backup_{timestamp}{ext}")
            
            import shutil
            shutil.copy2(self.current_file_path, backup_path)
            
            # Prepare data for saving
            df_save = self.df.copy()
            if 'Expense Date' in df_save.columns:
                # Ensure date is string YYYY-MM-DD to avoid Excel serial numbers (e.g. 46029)
                # Convert to string format, handling NaT/NaN
                df_save['Expense Date'] = df_save['Expense Date'].apply(lambda x: x.strftime('%Y-%m-%d') if pd.notnull(x) and hasattr(x, 'strftime') else x)

            # Save File
            if ext.lower() == '.csv':
                df_save.drop(columns=['original_index'], errors='ignore').to_csv(self.current_file_path, index=False)
            elif ext.lower() == '.ods':
                # For ODS, we need to respect the header row (row 4 -> index 3)
                # This is tricky with pandas to_excel directly if we want to preserve layout
                # But for now, we will save as standard ODS
                df_save.drop(columns=['original_index'], errors='ignore').to_excel(self.current_file_path, engine='odf', index=False)
            elif ext.lower() == '.xlsx':
                df_save.drop(columns=['original_index'], errors='ignore').to_excel(self.current_file_path, engine='openpyxl', index=False)
            
            messagebox.showinfo("Success", f"Changes saved successfully.\nBackup created: {os.path.basename(backup_path)}")
            self.refresh_backups_display()
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save: {e}")
    
    def setup_styles(self):
        style = ttk.Style()
        style.theme_use('clam')
        
        # Global styles
        style.configure('.', background=self.bg_color, foreground=self.text_color, font=('Segoe UI', 10))
        style.configure('TFrame', background=self.bg_color)
        style.configure('TLabel', background=self.bg_color, foreground=self.text_color)
        style.configure('TButton', background='#e1e4e8', font=('Segoe UI', 9, 'bold'))
        style.map('TButton', background=[('active', '#d0d7de')])
        style.configure('TLabelframe', background=self.bg_color, foreground=self.text_color)
        style.configure('TLabelframe.Label', background=self.bg_color, foreground=self.text_color)
        
        # Treeview styles
        style.configure("Treeview", background="white", fieldbackground="white", rowheight=25)
        style.configure("Treeview.Heading", background="#e9ecef", foreground="#495057", font=('Segoe UI', 9, 'bold'))
        style.map("Treeview.Heading", background=[('active', '#dee2e6')])
        
    def setup_icon(self):
        if getattr(sys, 'frozen', False):
            base_path = sys._MEIPASS
        else:
            base_path = os.path.dirname(__file__)
        
        # Main Icon
        icon_path = os.path.join(base_path, "tsl_icon.png")
        if os.path.exists(icon_path):
            try:
                self.icon_img = tk.PhotoImage(file=icon_path)
                self.root.iconphoto(True, self.icon_img)
            except Exception as e:
                print(f"Warning: Could not load window icon: {e}")

        # Secondary Logo (BR31Tech)
        logo2_path = os.path.join(base_path, "br31logo.png")
        if os.path.exists(logo2_path):
            try:
                self.logo2_img = tk.PhotoImage(file=logo2_path)
            except Exception as e:
                print(f"Warning: Could not load secondary logo: {e}")
                self.logo2_img = None
        else:
            self.logo2_img = None

    def load_settings(self):
        default = {
            "quick_load_files": ["", "", ""],
            "admin_name": "Angel (Mehul) Singh",
            "admin_role": "Personal Finance",
            "admin_signature": "",
            "company_name": "The Space Lab",
            "company_logo": "",
            "company_contact": "+91-xxxx | info@..."
        }
        return self.security.load_json_encrypted(self.settings_file, default)

    def save_settings(self):
        try:
            self.security.save_json_encrypted(self.settings, self.settings_file)
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save settings: {e}")

    def open_settings(self):
        self.show_login_dialog(success_callback=self._open_settings_window)

    def _open_settings_window(self):
        win = tk.Toplevel(self.root)
        win.title("Settings")
        win.geometry("600x600")
        win.configure(bg=self.bg_color)
        win.transient(self.root)
        win.grab_set()
        self.center_window(win)
        
        notebook = ttk.Notebook(win)
        notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # --- Tab 1: General (Quick Load) ---
        tab_general = ttk.Frame(notebook, style='TFrame')
        notebook.add(tab_general, text="General")
        
        ttk.Label(tab_general, text="Configure Quick Load Files", font=('Segoe UI', 11, 'bold'), background=self.bg_color).pack(pady=10)
        
        entries = []
        current_paths = self.settings.get("quick_load_files", ["", "", ""])
        
        def browse(idx):
            path = filedialog.askopenfilename(filetypes=[("Excel/ODS/CSV", "*.xlsx *.ods *.csv")])
            if path:
                entries[idx].delete(0, tk.END)
                entries[idx].insert(0, path)

        for i in range(3):
            f = ttk.Frame(tab_general, style='TFrame')
            f.pack(fill=tk.X, padx=20, pady=5)
            ttk.Label(f, text=f"File {i+1}:", width=8, background=self.bg_color).pack(side=tk.LEFT)
            e = ttk.Entry(f)
            e.insert(0, current_paths[i] if i < len(current_paths) else "")
            e.pack(side=tk.LEFT, padx=5, expand=True, fill=tk.X)
            entries.append(e)
            ttk.Button(f, text="Browse...", command=lambda x=i: browse(x)).pack(side=tk.LEFT)

        def save_general():
            self.settings["quick_load_files"] = [e.get().strip() for e in entries]
            self.save_settings()
            
            # Update Quick Load buttons
            paths = self.settings.get("quick_load_files", ["", "", ""])
            if hasattr(self, 'quick_btns'):
                for i, btn in enumerate(self.quick_btns):
                    if i < len(paths):
                        path = paths[i]
                        name = os.path.basename(path) if path else f"File {i+1}"
                        if len(name) > 15: name = name[:12] + "..."
                        btn.config(text=name)

            messagebox.showinfo("Settings", "General settings saved.")

        ttk.Button(tab_general, text="Save General Settings", command=save_general).pack(pady=20)
        
        # --- Tab 2: Company & Admin Profile ---
        tab_profile = ttk.Frame(notebook, style='TFrame')
        notebook.add(tab_profile, text="Company & Admin Profile")
        
        p_frame = ttk.Frame(tab_profile, style='TFrame', padding=15)
        p_frame.pack(fill=tk.BOTH, expand=True)
        
        # Variables
        vars_profile = {
            'company_name': tk.StringVar(value=self.settings.get('company_name', 'The Space Lab')),
            'company_logo': tk.StringVar(value=self.settings.get('company_logo', '')),
            'admin_name': tk.StringVar(value=self.settings.get('admin_name', 'Angel (Mehul) Singh')),
            'admin_role': tk.StringVar(value=self.settings.get('admin_role', 'Personal Finance')),
            'admin_signature': tk.StringVar(value=self.settings.get('admin_signature', '')),
            'company_contact': tk.StringVar(value=self.settings.get('company_contact', '+91-xxxx | info@...'))
        }
        
        def browse_img(var_name):
            path = filedialog.askopenfilename(filetypes=[("Images", "*.png *.jpg *.jpeg")])
            if path:
                vars_profile[var_name].set(path)
        
        # Company Info
        ttk.Label(p_frame, text="[ Company Information ]", font=('Segoe UI', 10, 'bold'), background=self.bg_color).grid(row=0, column=0, columnspan=3, sticky="w", pady=(0, 10))
        
        ttk.Label(p_frame, text="Company Name:", background=self.bg_color).grid(row=1, column=0, sticky="w", pady=5)
        ttk.Entry(p_frame, textvariable=vars_profile['company_name'], width=40).grid(row=1, column=1, columnspan=2, sticky="w", pady=5)
        
        ttk.Label(p_frame, text="Company Logo:", background=self.bg_color).grid(row=2, column=0, sticky="w", pady=5)
        ttk.Entry(p_frame, textvariable=vars_profile['company_logo'], width=30).grid(row=2, column=1, sticky="w", pady=5)
        ttk.Button(p_frame, text="Browse...", command=lambda: browse_img('company_logo')).grid(row=2, column=2, sticky="w", padx=5)
        
        # Admin Info
        ttk.Label(p_frame, text="[ Admin / Report Identity ]", font=('Segoe UI', 10, 'bold'), background=self.bg_color).grid(row=3, column=0, columnspan=3, sticky="w", pady=(20, 10))
        
        ttk.Label(p_frame, text="Admin Name:", background=self.bg_color).grid(row=4, column=0, sticky="w", pady=5)
        ttk.Entry(p_frame, textvariable=vars_profile['admin_name'], width=40).grid(row=4, column=1, columnspan=2, sticky="w", pady=5)
        
        ttk.Label(p_frame, text="Role / Title:", background=self.bg_color).grid(row=5, column=0, sticky="w", pady=5)
        ttk.Entry(p_frame, textvariable=vars_profile['admin_role'], width=40).grid(row=5, column=1, columnspan=2, sticky="w", pady=5)
        
        ttk.Label(p_frame, text="Signature Image:", background=self.bg_color).grid(row=6, column=0, sticky="w", pady=5)
        ttk.Entry(p_frame, textvariable=vars_profile['admin_signature'], width=30).grid(row=6, column=1, sticky="w", pady=5)
        ttk.Button(p_frame, text="Browse...", command=lambda: browse_img('admin_signature')).grid(row=6, column=2, sticky="w", padx=5)
        
        ttk.Label(p_frame, text="Contact Info:", background=self.bg_color).grid(row=7, column=0, sticky="w", pady=5)
        ttk.Entry(p_frame, textvariable=vars_profile['company_contact'], width=40).grid(row=7, column=1, columnspan=2, sticky="w", pady=5)
        
        def save_profile():
            for k, v in vars_profile.items():
                self.settings[k] = v.get().strip()
            self.save_settings()
            messagebox.showinfo("Success", "Profile settings saved.")
            
        ttk.Button(p_frame, text="Save Profile Settings", command=save_profile).grid(row=8, column=0, columnspan=3, pady=20)
        
        # --- Tab 3: Security ---
        tab_security = ttk.Frame(notebook, style='TFrame')
        notebook.add(tab_security, text="Security")

        # Password Change Section
        ttk.Label(tab_security, text="Change Admin Password", font=('Segoe UI', 11, 'bold'), background=self.bg_color).pack(pady=20)
        
        f_old = ttk.Frame(tab_security, style='TFrame')
        f_old.pack(pady=5)
        ttk.Label(f_old, text="Old Password:", width=15, background=self.bg_color).pack(side=tk.LEFT)
        entry_old = ttk.Entry(f_old, show="*")
        entry_old.pack(side=tk.LEFT)
        
        f_new = ttk.Frame(tab_security, style='TFrame')
        f_new.pack(pady=5)
        ttk.Label(f_new, text="New Password:", width=15, background=self.bg_color).pack(side=tk.LEFT)
        entry_new = ttk.Entry(f_new, show="*")
        entry_new.pack(side=tk.LEFT)
        
        f_confirm = ttk.Frame(tab_security, style='TFrame')
        f_confirm.pack(pady=5)
        ttk.Label(f_confirm, text="Confirm Password:", width=15, background=self.bg_color).pack(side=tk.LEFT)
        entry_confirm = ttk.Entry(f_confirm, show="*")
        entry_confirm.pack(side=tk.LEFT)
        
        def save_password():
            old_pass = entry_old.get().strip()
            new_pass = entry_new.get().strip()
            confirm_pass = entry_confirm.get().strip()
            
            try:
                users = self.load_users()
                current_admin_pass = users.get("admin", "admin123")
                
                if old_pass != current_admin_pass:
                    messagebox.showerror("Error", "Incorrect old password.")
                    return
                
                if not new_pass:
                    messagebox.showerror("Error", "New password cannot be empty.")
                    return
                    
                if new_pass != confirm_pass:
                    messagebox.showerror("Error", "New passwords do not match.")
                    return
                    
                users["admin"] = new_pass
                if self.save_users(users):
                    messagebox.showinfo("Success", "Password updated successfully.")
                    entry_old.delete(0, tk.END)
                    entry_new.delete(0, tk.END)
                    entry_confirm.delete(0, tk.END)
            except Exception as e:
                messagebox.showerror("Error", f"Failed to change password: {e}")
        
        ttk.Button(tab_security, text="Update Password", command=save_password).pack(pady=20)
    
    def center_window(self, win):
        win.update_idletasks()
        w, h = win.winfo_width(), win.winfo_height()
        x = (win.winfo_screenwidth() // 2) - (w // 2)
        y = (win.winfo_screenheight() // 2) - (h // 2)
        win.geometry(f'{w}x{h}+{x}+{y}')

    def quick_load(self, index):
        paths = self.settings.get("quick_load_files", ["", "", ""])
        if index < len(paths) and paths[index]:
            if os.path.exists(paths[index]):
                self.load_file(paths[index])
            else:
                messagebox.showwarning("Error", f"File not found:\n{paths[index]}")
        else:
            messagebox.showwarning("Not Configured", f"Quick Load {index+1} is not configured.")

    def create_new_file(self):
        # Allow user to create a new empty CSV or ODS or XLSX
        path = filedialog.asksaveasfilename(
            defaultextension=".ods",
            filetypes=[("ODS Spreadsheet", "*.ods"), ("Excel File", "*.xlsx"), ("CSV File", "*.csv")]
        )
        if not path: return
        
        # Create empty DataFrame with required columns
        cols = ['Report Name', 'Total', 'Expense Date', 'Expense Amount', 
                'Expense Description', 'Expense Category', 'Paid Through', 
                'Merchant Name', 'Income Amount']
        df_new = pd.DataFrame(columns=cols)
        
        try:
            if path.lower().endswith('.csv'):
                df_new.to_csv(path, index=False)
            elif path.lower().endswith('.xlsx'):
                df_new.to_excel(path, engine='openpyxl', index=False)
            else:
                # ODS requires header on row 4 (index 3), so we need empty rows
                # Create a writer
                with pd.ExcelWriter(path, engine='odf') as writer:
                     # Write header at row 3 (0-indexed)
                     df_new.to_excel(writer, startrow=3, index=False)
            
            messagebox.showinfo("Success", f"New file created:\n{path}")
            # Load it
            self.load_file(path)
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to create file: {e}")

    def create_widgets(self):
        # Main layout
        main = ttk.Frame(self.root, padding="10", style='TFrame')
        main.grid(row=0, column=0, sticky="nsew")
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main.columnconfigure(0, weight=1) # Filters
        main.columnconfigure(1, weight=1) # Summary
        main.rowconfigure(2, weight=1)    # Table
        
        # Helper for container styling
        def create_container(parent, text, row, col, rowspan=1, colspan=1, padx=0):
            frame = tk.LabelFrame(parent, text=text, padx=10, pady=10, 
                                bg=self.bg_color, fg=self.text_color,
                                highlightbackground=self.accent_color, highlightthickness=1, bd=0,
                                font=('Segoe UI', 10, 'bold'))
            frame.grid(row=row, column=col, rowspan=rowspan, columnspan=colspan, sticky="nsew", pady=(0, 10), padx=padx)
            return frame

        # 1. File Load Section
        file_frame = create_container(main, "Load Data File", 0, 0, colspan=2)
        
        ttk.Button(file_frame, text="Load File (ODS/CSV)", command=lambda: self.load_file()).pack(side=tk.LEFT, padx=5)
        ttk.Button(file_frame, text="New File", command=self.create_new_file).pack(side=tk.LEFT, padx=5)
        
        self.btn_settings = ttk.Button(file_frame, text="Settings", command=self.open_settings)
        self.btn_settings.pack(side=tk.LEFT, padx=5)
        
        self.btn_edit = ttk.Button(file_frame, text="Enable Edit Mode", command=self.show_login_dialog, state="disabled")
        self.btn_edit.pack(side=tk.LEFT, padx=5)

        ttk.Button(file_frame, text="About", command=self.show_about).pack(side=tk.LEFT, padx=5)
        
        self.btn_save = ttk.Button(file_frame, text="Save Changes", command=self.save_changes)
        # self.btn_save.pack(side=tk.LEFT, padx=5) # Hidden initially
        
        self.status_label = ttk.Label(file_frame, text="No file loaded", foreground="red", background=self.bg_color)
        self.status_label.pack(side=tk.LEFT, padx=15)
        
        quick_frame = ttk.Frame(file_frame, style='TFrame')
        quick_frame.pack(side=tk.LEFT, padx=20)
        ttk.Label(quick_frame, text="Quick Load:", background=self.bg_color).pack(side=tk.LEFT, padx=5)
        
        self.quick_btns = []
        paths = self.settings.get("quick_load_files", ["", "", ""])
        
        for i in range(3):
            path = paths[i] if i < len(paths) else ""
            name = os.path.basename(path) if path else f"File {i+1}"
            # Truncate if too long
            if len(name) > 15: name = name[:12] + "..."
            
            btn = ttk.Button(quick_frame, text=name, width=15, command=lambda x=i: self.quick_load(x))
            btn.pack(side=tk.LEFT, padx=2)
            self.quick_btns.append(btn)

        # 2. Filters Section
        self.select_frame = create_container(main, "Filters", 1, 0)
        self.select_frame.columnconfigure(1, weight=1)
        
        # 3. Summary Section
        self.summary_frame = create_container(main, "Summary", 1, 1, padx=(10, 0))
        self.summary_frame.columnconfigure(0, weight=1)
        self.summary_frame.rowconfigure(1, weight=1)
        
        # Summary Totals
        totals = ttk.Frame(self.summary_frame, style='TFrame')
        totals.grid(row=0, column=0, sticky="ew", pady=(0, 10))
        self.lbl_records = ttk.Label(totals, text="Total Records: 0", font=('Segoe UI', 10, 'bold'), background=self.bg_color)
        self.lbl_inc = ttk.Label(totals, text="Total Income: 0.00", font=('Segoe UI', 10, 'bold'), background=self.bg_color)
        self.lbl_exp = ttk.Label(totals, text="Total Expense: 0.00", font=('Segoe UI', 10, 'bold'), background=self.bg_color)
        self.lbl_bal = ttk.Label(totals, text="Net Balance: 0.00", font=('Segoe UI', 10, 'bold'), background=self.bg_color)
        for i, lbl in enumerate([self.lbl_records, self.lbl_inc, self.lbl_exp, self.lbl_bal]):
            lbl.grid(row=i, column=0, sticky="w")
            
        # Summary Tree
        cols_sum = ('Category', 'Merchant', 'Count', 'Inc', 'Exp', 'Total')
        self.sum_tree = self.create_treeview(self.summary_frame, cols_sum, 1, 0, height=8)
        self.sum_tree.column('Category', width=120)
        self.sum_tree.column('Merchant', width=120)
        
        # 4. Raw Data Section
        self.table_frame = create_container(main, "Raw Data", 2, 0, colspan=2)
        self.table_frame.rowconfigure(0, weight=1)
        self.table_frame.columnconfigure(0, weight=1)
        
        cols_raw = ('Date', 'Inc', 'Exp', 'Bal', 'Description', 'Category', 'Merchant', 'Paid Through', 'ID')
        self.tree = self.create_treeview(self.table_frame, cols_raw, 0, 0, height=15)
        self.tree.column('Description', width=300)
        self.tree.column('ID', width=0, stretch=tk.NO) # Hidden ID column
        self.tree.heading('ID', text='ID')
        
        self.tree.bind("<Motion>", self.show_tooltip)
        self.tree.bind("<Leave>", self.hide_tooltip)
        self.tree.bind("<Double-1>", self.on_tree_double_click)
        
        # Action Buttons (initially hidden/disabled, placed in Filters)
        self.btn_frame = ttk.Frame(self.select_frame, style='TFrame')
        self.btn_frame.grid(row=10, column=0, columnspan=2, sticky="w", pady=10)
        
        self.analyze_btn = ttk.Button(self.btn_frame, text="Analyse", command=self.analyze, state="disabled")
        self.analyze_btn.pack(side=tk.LEFT, padx=(0, 10))
        
        self.export_btn = ttk.Button(self.btn_frame, text="Export CSV", command=self.export_csv, state="disabled")
        self.export_btn.pack(side=tk.LEFT, padx=(0, 10))

        self.btn_charts = ttk.Button(self.btn_frame, text="Charts", command=self.show_charts, state="disabled")
        self.btn_charts.pack(side=tk.LEFT, padx=(0, 10))

        self.btn_report = ttk.Button(self.btn_frame, text="Gen Report (PDF)", command=self.generate_report, state="disabled")
        self.btn_report.pack(side=tk.LEFT, padx=(0, 10))
        
        self.btn_add = ttk.Button(self.btn_frame, text="Add Record", command=self.add_record, state="disabled")
        self.btn_add.pack(side=tk.LEFT, padx=(0, 10))
        
        self.btn_delete = ttk.Button(self.btn_frame, text="Delete Record", command=self.delete_record, state="disabled")
        self.btn_delete.pack(side=tk.LEFT, padx=(0, 10))
        
        # Toggle Tools Button
        self.show_tools = True
        self.btn_toggle_tools = ttk.Button(self.btn_frame, text="Hide Backups", command=self.toggle_tools)
        self.btn_toggle_tools.pack(side=tk.LEFT)

        # Recent Backups Section (Below Filters)
        self.backup_frame_main = ttk.LabelFrame(self.select_frame, text="Recent Backups", padding=5)
        self.backup_frame_main.grid(row=11, column=0, columnspan=2, sticky="ew", pady=(10, 0))
        
        self.refresh_backups_display()

    def toggle_tools(self):
        self.show_tools = not self.show_tools
        if self.show_tools:
            self.btn_toggle_tools.config(text="Hide Backups")
            if hasattr(self, 'backup_frame_main'): self.backup_frame_main.grid(row=21, column=0, columnspan=2, sticky="ew", pady=(10, 0))
        else:
            self.btn_toggle_tools.config(text="Show Backups")
            if hasattr(self, 'backup_frame_main'): self.backup_frame_main.grid_remove()

    def refresh_backups_display(self):
        if not hasattr(self, 'backup_frame_main'): return
        
        # Clear existing
        for widget in self.backup_frame_main.winfo_children():
            widget.destroy()
            
        try:
            # Find backups in backups directory
            backups = glob.glob(os.path.join(self.backups_dir, "*_backup_*.*"))
            # Sort by modification time, newest first
            backups.sort(key=os.path.getmtime, reverse=True)
            recent = backups[:3] # Show top 3
            
            if recent:
                for f in recent:
                    ts = datetime.fromtimestamp(os.path.getmtime(f)).strftime('%Y-%m-%d %H:%M:%S')
                    fname = os.path.basename(f)
                    # Truncate filename if needed
                    if len(fname) > 30: fname = fname[:27] + "..."
                    
                    lbl = ttk.Label(self.backup_frame_main, text=f"• {fname}\n   {ts}", 
                              font=('Segoe UI', 8), background=self.bg_color, cursor="hand2")
                    lbl.pack(anchor='w', pady=2)
                    
                    # Make clickable to load
                    lbl.bind("<Button-1>", lambda e, path=f: self.load_file(path))
            else:
                ttk.Label(self.backup_frame_main, text="No backups found.", 
                         font=('Segoe UI', 8, 'italic'), background=self.bg_color).pack(anchor='w', pady=2)
                         
            # Open Backups Folder Link
            link = ttk.Label(self.backup_frame_main, text="Open Backups Folder", 
                             foreground="blue", cursor="hand2", font=('Segoe UI', 8, 'underline', 'bold'), background=self.bg_color)
            link.pack(anchor='w', pady=(10, 5))
            link.bind("<Button-1>", lambda e: os.startfile(self.backups_dir))
            
        except Exception as e:
            print(f"Error refreshing backups: {e}")
            pass

    def create_treeview(self, parent, columns, row, col, height=10):
        frame = ttk.Frame(parent, style='TFrame')
        frame.grid(row=row, column=col, sticky="nsew")
        parent.rowconfigure(row, weight=1)
        parent.columnconfigure(col, weight=1)
        
        tree = ttk.Treeview(frame, columns=columns, show='headings', height=height)
        for c in columns:
            tree.heading(c, text=c)
            tree.column(c, width=80 if c in ['Inc', 'Exp', 'Bal', 'Count'] else 100)
        
        vsb = ttk.Scrollbar(frame, orient="vertical", command=tree.yview)
        tree.configure(yscrollcommand=vsb.set)
        
        tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        vsb.pack(side=tk.RIGHT, fill=tk.Y)
        
        tree.tag_configure('odd', background='#f8f9fa')
        tree.tag_configure('even', background='white')
        return tree

    def create_filter_widgets(self):
        # Clear old widgets
        for widget in self.select_frame.winfo_children():
            if widget not in [self.btn_frame, getattr(self, 'backup_frame_main', None)]: 
                widget.destroy()
            
        # Define filters: (Label, VariableName, Attribute)
        self.filters = {} # Store vars and combos
        filter_defs = [
            ("Report Name:", "report", "Report Name"),
            ("Year:", "year", None),   # Special handling
            ("Month:", "month", None), # Special handling
            ("Category:", "category", "Expense Category"),
            ("Merchant:", "merchant", "Merchant Name"),
            ("Paid Through:", "paid", "Paid Through")
        ]
        
        row = 0
        for label_text, key, col_name in filter_defs:
            if key == "year": # Handle Year/Month on same row
                f_frame = ttk.Frame(self.select_frame, style='TFrame')
                f_frame.grid(row=row, column=0, columnspan=2, sticky="ew", pady=2)
                
                ttk.Label(f_frame, text="Year:", background=self.bg_color).pack(side=tk.LEFT)
                self.filters['year_var'] = tk.StringVar(value="All")
                self.filters['year_combo'] = ttk.Combobox(f_frame, textvariable=self.filters['year_var'], state="readonly", width=10)
                self.filters['year_combo'].pack(side=tk.LEFT, padx=5)
                
                ttk.Label(f_frame, text="Month:", background=self.bg_color).pack(side=tk.LEFT, padx=(15, 0))
                self.filters['month_var'] = tk.StringVar(value="All")
                self.filters['month_combo'] = ttk.Combobox(f_frame, textvariable=self.filters['month_var'], state="readonly", width=10)
                self.filters['month_combo'].pack(side=tk.LEFT, padx=5)
            elif key == "month":
                continue # Handled with year
            else:
                ttk.Label(self.select_frame, text=label_text, background=self.bg_color).grid(row=row, column=0, sticky="w", pady=2)
                var = tk.StringVar(value="All")
                combo = ttk.Combobox(self.select_frame, textvariable=var)
                combo.grid(row=row, column=1, sticky="ew", pady=2, padx=(5, 0))
                self.filters[f'{key}_var'] = var
                self.filters[f'{key}_combo'] = combo
            row += 1

        # Search box
        ttk.Label(self.select_frame, text="Search Desc:", background=self.bg_color).grid(row=row, column=0, sticky="w", pady=2)
        self.filters['desc_var'] = tk.StringVar()
        ttk.Entry(self.select_frame, textvariable=self.filters['desc_var']).grid(row=row, column=1, sticky="ew", pady=2, padx=(5, 0))
        
        # Remove old adv_frame reference if it exists
        if hasattr(self, 'adv_frame'): del self.adv_frame

        # Bind events
        for key in self.filters:
            if 'combo' in key:
                combo = self.filters[key]
                combo.bind("<<ComboboxSelected>>", self.on_combo_selected)
                combo.bind("<KeyRelease>", self.on_filter_change)
        
        self.update_combos()

    def on_filter_change(self, event=None):
        self.analyze()

    def update_combos(self):
        if self.df is None or self.updating_combos: return
        self.updating_combos = True
        
        try:
            # Current filters
            sels = {k.replace('_var',''): v.get() for k,v in self.filters.items() if '_var' in k and v.get() != "All"}
            
            # Base filter
            d = self.df.dropna(subset=['Expense Date'])
            
            # Apply active filters to narrow down options
            for k, val in sels.items():
                if k == 'report': d = d[d['Report Name'] == val]
                elif k == 'year': d = d[d['Expense Date'].dt.year == int(val)]
                elif k == 'month': d = d[d['Expense Date'].dt.month == int(val)]
                elif k == 'category': d = d[d['Expense Category'] == val]
                elif k == 'merchant': d = d[d['Merchant Name'] == val]
                elif k == 'paid': d = d[d['Paid Through'] == val]
            
            # Helper to update unique values
            def update(key, values):
                combo = self.filters[f'{key}_combo']
                curr = self.filters[f'{key}_var'].get()
                combo['values'] = ["All"] + sorted(list(values))
                if curr != "All" and curr not in combo['values']:
                    self.filters[f'{key}_var'].set("All")

            # Update all combos with available values in filtered set
            # To allow re-selection, we might want to be less aggressive, but this is standard cascading
            # Ideally, we calculate available options for EACH combo based on OTHERS, but that's expensive.
            # Simple approach: Update all based on current subset.
            
            update('report', d['Report Name'].dropna().unique())
            update('year', d['Expense Date'].dt.year.dropna().unique().astype(str))
            update('month', [f"{m:02d}" for m in d['Expense Date'].dt.month.dropna().unique()])
            update('category', d['Expense Category'].dropna().unique())
            update('merchant', d['Merchant Name'].dropna().unique())
            update('paid', d['Paid Through'].dropna().unique())
            
        finally:
            self.updating_combos = False

    def on_combo_selected(self, event=None):
        self.update_combos()

    def load_file(self, file_path=None):
        if not file_path:
            file_path = filedialog.askopenfilename(filetypes=[("Excel/ODS/CSV", "*.xlsx *.ods *.csv")])
        if not file_path: return

        self.root.config(cursor="watch")
        self.root.update()
        
        try:
            self.current_file_path = file_path
            # Reset edit mode
            self.edit_mode = False
            self.btn_edit.config(state="normal")
            self.btn_add.config(state="disabled")
            self.btn_delete.config(state="disabled")
            self.btn_save.pack_forget()
            self.status_label.config(text=f"Loaded: {os.path.basename(file_path)}", foreground="green")

            if file_path.lower().endswith('.csv'):
                self.df = pd.read_csv(file_path, header=0)
            elif file_path.lower().endswith('.xlsx'):
                # Try to detect format
                # Read header only
                try:
                    df_check = pd.read_excel(file_path, engine='openpyxl', nrows=0)
                    cols = [str(c).strip() for c in df_check.columns]
                    
                    # Check for NiruTunmun format: Date, Category, Description, Type, Amount
                    required_niru = ['Date', 'Category', 'Description', 'Type', 'Amount']
                    if all(c in cols for c in required_niru):
                        # Load and convert
                        df_raw = pd.read_excel(file_path, engine='openpyxl')
                        
                        self.df = pd.DataFrame()
                        self.df['Expense Date'] = df_raw['Date']
                        self.df['Expense Category'] = df_raw['Category']
                        self.df['Expense Description'] = df_raw['Description']
                        
                        # Handle Amount and Type
                        self.df['Expense Amount'] = df_raw.apply(lambda x: x['Amount'] if str(x['Type']).lower() == 'expense' else 0, axis=1)
                        self.df['Income Amount'] = df_raw.apply(lambda x: x['Amount'] if str(x['Type']).lower() == 'income' else 0, axis=1)
                        
                        self.df['Paid Through'] = ""
                        self.df['Merchant Name'] = ""
                        self.df['Report Name'] = os.path.splitext(os.path.basename(file_path))[0]
                        
                    else:
                        # Assume Standard App Format in XLSX
                        # Attempt to find the header row by looking for known columns
                        header_row = 0
                        try:
                            # Read first 10 rows to find header
                            df_temp = pd.read_excel(file_path, engine='openpyxl', nrows=10, header=None)
                            
                            found_header = False
                            for idx, row in df_temp.iterrows():
                                # Check if this row looks like a header (contains key columns)
                                row_str = [str(val).strip() for val in row.values]
                                if 'Expense Category' in row_str or 'Category' in row_str:
                                    header_row = idx
                                    found_header = True
                                    break
                            
                            if not found_header:
                                # Fallback to 0 if not found, but this likely won't work well if it's not 0
                                print("Could not detect header row, defaulting to 0")
                                header_row = 0
                                
                        except Exception as find_err:
                            print(f"Error finding header: {find_err}")
                            header_row = 0

                        self.df = pd.read_excel(file_path, engine='openpyxl', header=header_row)
                        
                except Exception as e:
                    # Fallback
                    print(f"XLSX Load Error: {e}")
                    self.df = pd.read_excel(file_path, engine='openpyxl', header=0)

            else:
                self.df = pd.read_excel(file_path, engine='odf', header=3)
            
            # Store original index for editing
            self.df['original_index'] = self.df.index

            if 'Total' in self.df.columns: self.df.drop(columns=['Total'], inplace=True)
            
            # Ensure Paid Through exists
            if 'Paid Through' not in self.df.columns:
                self.df['Paid Through'] = ""
            
            # Fill NaNs in grouping columns to prevent dropping in groupby
            self.df['Merchant Name'] = self.df['Merchant Name'].fillna("Unknown")
            self.df['Expense Category'] = self.df['Expense Category'].fillna("Uncategorized")
            self.df['Paid Through'] = self.df['Paid Through'].fillna("")

            # Conversions
            self.df['Expense Date'] = pd.to_datetime(self.df['Expense Date'], errors='coerce')
            for col in ['Expense Amount', 'Income Amount']:
                self.df[col] = pd.to_numeric(self.df[col], errors='coerce').fillna(0)
            
            self.create_filter_widgets()
            self.analyze_btn.config(state="normal")
            self.export_btn.config(state="normal")
            
            # Charts/Report only if Admin
            if self.is_admin_authenticated:
                self.btn_charts.config(state="normal")
                self.btn_report.config(state="normal")
            else:
                self.btn_charts.config(state="disabled")
                self.btn_report.config(state="disabled")

            self.analyze() # Auto-analyze on load
            
        except Exception as e:
            messagebox.showerror("Error", str(e))
            self.status_label.config(text="Load Failed", foreground="red")
        finally:
            self.root.config(cursor="")

    def analyze(self):
        if self.df is None: return
        
        # Get active filters
        sels = {k.replace('_var',''): v.get() for k,v in self.filters.items() if '_var' in k and v.get() != "All"}
        desc = self.filters['desc_var'].get().strip().lower()
        
        d = self.df.dropna(subset=['Expense Date']).copy()
        
        # Apply filters
        if 'report' in sels: d = d[d['Report Name'].astype(str).str.contains(sels['report'], case=False, na=False)]
        if 'year' in sels: d = d[d['Expense Date'].dt.year == int(sels['year'])]
        if 'month' in sels: d = d[d['Expense Date'].dt.month == int(sels['month'])]
        if 'category' in sels: d = d[d['Expense Category'].astype(str).str.contains(sels['category'], case=False, na=False)]
        if 'merchant' in sels: d = d[d['Merchant Name'].astype(str).str.contains(sels['merchant'], case=False, na=False)]
        if 'paid' in sels: d = d[d['Paid Through'].astype(str).str.contains(sels['paid'], case=False, na=False)]
        if desc: d = d[d['Expense Description'].astype(str).str.lower().str.contains(desc, na=False)]
        
        # Advanced Filters
        try:
            # Date Range
            start = self.filters.get('date_start', tk.StringVar()).get().strip()
            end = self.filters.get('date_end', tk.StringVar()).get().strip()
            if start: d = d[d['Expense Date'] >= pd.to_datetime(start)]
            if end: d = d[d['Expense Date'] <= pd.to_datetime(end)]
            
            # Amount Range Helper
            def get_float(k):
                if k not in self.filters: return None
                val = self.filters[k].get().strip().replace(',', '')
                return float(val) if val else None

            exp_min = get_float('exp_min')
            exp_max = get_float('exp_max')
            inc_min = get_float('inc_min')
            inc_max = get_float('inc_max')

            if exp_min is not None: d = d[d['Expense Amount'] >= exp_min]
            if exp_max is not None: d = d[d['Expense Amount'] <= exp_max]
            if inc_min is not None: d = d[d['Income Amount'] >= inc_min]
            if inc_max is not None: d = d[d['Income Amount'] <= inc_max]

        except Exception as e:
            print(f"Filter Error: {e}")
        
        if d.empty:
            messagebox.showinfo("Info", "No records found.")
            return

        d['Bal'] = d['Income Amount'] - d['Expense Amount']
        d = d.sort_values('Expense Date', ascending=False)
        self.filtered_df = d.copy()
        
        # Update Summary Totals
        self.lbl_records.config(text=f"Total Records: {len(d)}")
        self.lbl_inc.config(text=f"Total Income: {d['Income Amount'].sum():,.2f}")
        self.lbl_exp.config(text=f"Total Expense: {d['Expense Amount'].sum():,.2f}")
        self.lbl_bal.config(text=f"Net Balance: {(d['Income Amount'].sum() - d['Expense Amount'].sum()):,.2f}")
        
        # Update Summary Tree
        for item in self.sum_tree.get_children(): self.sum_tree.delete(item)
        
        sum_grp = d.groupby(['Expense Category', 'Merchant Name'])[['Income Amount', 'Expense Amount', 'Bal']].agg(
            {'Income Amount': ['size', 'sum'], 'Expense Amount': 'sum', 'Bal': 'sum'}
        ).reset_index()
        sum_grp.columns = ['Category', 'Merchant', 'Count', 'Inc', 'Exp', 'Total']
        
        for i, row in sum_grp.iterrows():
            tag = 'odd' if i % 2 else 'even'
            self.sum_tree.insert('', 'end', values=(
                row['Category'], row['Merchant'], row['Count'],
                f"{row['Inc']:,.2f}", f"{row['Exp']:,.2f}", f"{row['Total']:,.2f}"
            ), tags=(tag,))
            
        # Update Raw Data Tree
        for item in self.tree.get_children(): self.tree.delete(item)
        
        for i, row in d.iterrows():
            tag = 'odd' if i % 2 else 'even'
            self.tree.insert('', 'end', values=(
                row['Expense Date'].strftime('%Y-%m-%d'),
                f"{row['Income Amount']:,.2f}",
                f"{row['Expense Amount']:,.2f}",
                f"{row['Bal']:,.2f}",
                row['Expense Description'],
                row['Expense Category'],
                row['Merchant Name'],
                row['Paid Through'],
                row['original_index']
            ), tags=(tag,))

    def export_csv(self):
        if self.filtered_df is not None:
            path = filedialog.asksaveasfilename(defaultextension=".csv", filetypes=[("CSV", "*.csv")])
            if path:
                df_exp = self.filtered_df.copy()
                if 'Expense Date' in df_exp.columns:
                     df_exp['Expense Date'] = df_exp['Expense Date'].apply(lambda x: x.strftime('%Y-%m-%d') if pd.notnull(x) and hasattr(x, 'strftime') else x)
                
                df_exp.to_csv(path, index=False)
                messagebox.showinfo("Success", "Exported successfully.")

    def show_charts(self):
        if self.filtered_df is None or self.filtered_df.empty: return
        
        win = tk.Toplevel(self.root)
        win.title("Analysis Charts")
        win.geometry("1000x600")
        self.center_window(win)
        
        # Prepare Data
        df = self.filtered_df
        
        # 1. Category Expense Pie
        cat_exp = df.groupby('Expense Category')['Expense Amount'].sum()
        cat_exp = cat_exp[cat_exp > 0]
        
        # 2. Income vs Expense Bar
        total_inc = df['Income Amount'].sum()
        total_exp = df['Expense Amount'].sum()
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 5))
        
        # Pie Chart
        if not cat_exp.empty:
            ax1.pie(cat_exp, labels=cat_exp.index, autopct='%1.1f%%', startangle=90)
            ax1.set_title('Expenses by Category')
        else:
            ax1.text(0.5, 0.5, 'No Expenses', ha='center')
            
        # Bar Chart
        ax2.bar(['Income', 'Expense'], [total_inc, total_exp], color=['green', 'red'])
        ax2.set_title('Income vs Expense')
        for i, v in enumerate([total_inc, total_exp]):
            ax2.text(i, v, f'{v:,.0f}', ha='center', va='bottom')
            
        canvas = FigureCanvasTkAgg(fig, master=win)
        canvas.draw()
        canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)

    def _add_footer(self, canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.grey)
        
        # Footer Text
        page_num = canvas.getPageNumber()
        date_str = datetime.now().strftime("%Y-%m-%d %H:%M")
        
        # "Report generated for X" + "System Generated and Verified"
        report_user = getattr(self, 'current_report_user', 'User')
        app_info = f"Report for: {report_user} | System Generated and Verified"
        
        # Left: App Info
        canvas.drawString(0.5 * inch, 0.5 * inch, app_info)
        
        # Center: Date
        canvas.drawCentredString(4.25 * inch, 0.5 * inch, f"Gen Date: {date_str}")
        
        # Right: Page Number
        canvas.drawRightString(8.0 * inch, 0.5 * inch, f"Page {page_num}")
        
        # Line above footer
        canvas.setStrokeColor(colors.lightgrey)
        canvas.line(0.5 * inch, 0.7 * inch, 8.0 * inch, 0.7 * inch)
        
        canvas.restoreState()

    def generate_report(self):
        if self.filtered_df is None or self.filtered_df.empty: return
        
        # Ask for Report Name (User)
        report_for = simpledialog.askstring("Report Name", "Report Generated For (User Name):")
        if not report_for: return # User cancelled or empty
        self.current_report_user = report_for
        
        path = filedialog.asksaveasfilename(defaultextension=".pdf", filetypes=[("PDF", "*.pdf")])
        if not path: return
        
        try:
            doc = SimpleDocTemplate(path, pagesize=letter,
                                  rightMargin=0.5*inch, leftMargin=0.5*inch,
                                  topMargin=0.5*inch, bottomMargin=0.75*inch)
            elements = []
            styles = getSampleStyleSheet()
            
            # --- 1. Data Preparation ---
            df = self.filtered_df
            
            # Calculate Period
            if 'Expense Date' in df.columns and not df['Expense Date'].isnull().all():
                min_date = df['Expense Date'].min()
                max_date = df['Expense Date'].max()
                period_str = f"{min_date.strftime('%d %b %Y')} - {max_date.strftime('%d %b %Y')}"
            else:
                period_str = "N/A"
            
            # --- 2. Professional Header ---
            # Logo Handling
            logo_img = None
            logo_path = None
            if getattr(sys, 'frozen', False):
                base_path = sys._MEIPASS
            else:
                base_path = os.path.dirname(__file__)
            
            possible_logo = os.path.join(base_path, "tsl_icon.png")
            if os.path.exists(possible_logo):
                logo_path = possible_logo

            if logo_path:
                try:
                    img_reader = ImageReader(logo_path)
                    iw, ih = img_reader.getSize()
                    aspect = ih / float(iw)
                    logo_width = 1.2 * inch
                    logo_height = logo_width * aspect
                    logo_img = Image(logo_path, width=logo_width, height=logo_height)
                    logo_img.hAlign = 'LEFT'
                except Exception as e:
                    print(f"Logo error: {e}")

            # Right Side Header Text
            header_right_elements = []
            
            # Company Name
            style_company = ParagraphStyle('Company', parent=styles['Heading1'], alignment=TA_RIGHT, fontSize=16, spaceAfter=2)
            header_right_elements.append(Paragraph("The Space Lab", style_company))
            
            # Report Title
            style_title = ParagraphStyle('RepTitle', parent=styles['Heading2'], alignment=TA_RIGHT, fontSize=14, textColor=colors.darkblue, spaceAfter=2)
            header_right_elements.append(Paragraph("Expense Analysis Report", style_title))
            
            # Period
            style_period = ParagraphStyle('Period', parent=styles['Normal'], alignment=TA_RIGHT, fontSize=10, textColor=colors.grey)
            header_right_elements.append(Paragraph(f"Reporting Period: {period_str}", style_period))

            # Header Table
            # If logo exists, 2 cols. Else 1 col right aligned (or just text).
            if logo_img:
                header_data = [[logo_img, header_right_elements]]
                col_widths = [2*inch, 5*inch]
            else:
                header_data = [[header_right_elements]]
                col_widths = [7*inch]

            t_header = Table(header_data, colWidths=col_widths)
            t_header.setStyle(TableStyle([
                ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ]))
            elements.append(t_header)
            
            # Horizontal Line
            elements.append(Spacer(1, 10))
            d = Drawing(500, 1)
            d.add(Line(0, 0, 7.5*inch, 0, strokeColor=colors.black, strokeWidth=1))
            elements.append(d)
            elements.append(Spacer(1, 20))

            # --- 3. Admin & Meta Info ---
            admin_name = self.settings.get("admin_name", "Administrator")
            admin_role = self.settings.get("admin_role", "")
            
            # Create a small info table
            style_label = ParagraphStyle('Label', parent=styles['Normal'], fontName='Helvetica-Bold')
            style_val = ParagraphStyle('Value', parent=styles['Normal'])
            
            info_data = [
                [Paragraph("Generated By:", style_label), Paragraph(admin_name, style_val)],
                [Paragraph("Role:", style_label), Paragraph(admin_role, style_val)],
                [Paragraph("Report Type:", style_label), Paragraph("Financial / Expense Audit", style_val)]
            ]
            
            t_info = Table(info_data, colWidths=[1.5*inch, 4*inch], hAlign='LEFT')
            t_info.setStyle(TableStyle([
                ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ]))
            elements.append(t_info)
            elements.append(Spacer(1, 20))
            
            # --- 4. Financial Summary ---
            elements.append(Paragraph("Financial Summary", styles['Heading3']))
            elements.append(Spacer(1, 5))
            
            t_inc = df['Income Amount'].sum()
            t_exp = df['Expense Amount'].sum()
            t_bal = t_inc - t_exp
            
            sum_data = [
                ['Total Income', 'Total Expense', 'Net Balance'],
                [f"{t_inc:,.2f}", f"{t_exp:,.2f}", f"{t_bal:,.2f}"]
            ]
            
            t_sum = Table(sum_data, colWidths=[2.3*inch, 2.3*inch, 2.3*inch])
            t_sum.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.darkblue),
                ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,0), 10),
                ('BOTTOMPADDING', (0,0), (-1,0), 8),
                ('TOPPADDING', (0,0), (-1,0), 8),
                ('BACKGROUND', (0,1), (-1,-1), colors.aliceblue),
                ('FONTNAME', (0,1), (-1,-1), 'Helvetica-Bold'),
                ('FONTSIZE', (0,1), (-1,-1), 12),
                ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
                ('TEXTCOLOR', (2,1), (2,1), colors.green if t_bal >= 0 else colors.red),
            ]))
            elements.append(t_sum)
            elements.append(Spacer(1, 25))
            
            # --- 5. Charts ---
            # Generate charts to buffer
            cat_exp = df.groupby('Expense Category')['Expense Amount'].sum()
            cat_exp = cat_exp[cat_exp > 0]
            
            # Create figure with high DPI
            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 5), dpi=100)
            
            # Pie Chart
            if not cat_exp.empty:
                wedges, texts, autotexts = ax1.pie(cat_exp, labels=cat_exp.index, autopct='%1.1f%%', startangle=90, textprops={'fontsize': 8})
                ax1.set_title('Expenses by Category', fontsize=10, fontweight='bold')
            else:
                ax1.text(0.5, 0.5, 'No Expenses', ha='center')
            
            # Bar Chart
            bars = ax2.bar(['Income', 'Expense'], [t_inc, t_exp], color=['#28a745', '#dc3545'], width=0.6)
            ax2.set_title('Income vs Expense', fontsize=10, fontweight='bold')
            ax2.yaxis.grid(True, linestyle='--', alpha=0.7)
            
            # Add values on top of bars
            for bar in bars:
                height = bar.get_height()
                ax2.text(bar.get_x() + bar.get_width()/2., height,
                        f'{height:,.0f}',
                        ha='center', va='bottom', fontsize=9)
            
            plt.tight_layout()
            
            img_buf = BytesIO()
            plt.savefig(img_buf, format='png', bbox_inches='tight')
            img_buf.seek(0)
            plt.close(fig)
            
            img_chart = Image(img_buf, width=7*inch, height=3.5*inch)
            elements.append(img_chart)
            elements.append(Spacer(1, 20))
            
            # --- 6. Category Breakdown Table (Top 10) ---
            elements.append(Paragraph("Top Expenses by Category", styles['Heading3']))
            elements.append(Spacer(1, 5))
            
            cat_data = [['Category', 'Amount']]
            sorted_cats = cat_exp.sort_values(ascending=False).head(10)
            for cat, amt in sorted_cats.items():
                cat_data.append([cat, f"{amt:,.2f}"])
                
            t_cat = Table(cat_data, colWidths=[4*inch, 2*inch], hAlign='LEFT')
            t_cat.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.lightgrey),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
                ('ALIGN', (1,0), (1,-1), 'RIGHT'),
            ]))
            elements.append(t_cat)
            elements.append(Spacer(1, 30))

            # --- 7. Signature ---
            sig_path = self.settings.get("admin_signature", "")
            if sig_path and os.path.exists(sig_path):
                elements.append(Paragraph("<b>Authorized Signature:</b>", styles['Normal']))
                elements.append(Spacer(1, 10))
                try:
                    img_reader = ImageReader(sig_path)
                    iw, ih = img_reader.getSize()
                    aspect = ih / float(iw)
                    target_width = 1.5 * inch
                    target_height = target_width * aspect
                    
                    sig_img = Image(sig_path, width=target_width, height=target_height)
                    sig_img.hAlign = 'LEFT'
                    elements.append(sig_img)
                    
                    # Add name under signature
                    elements.append(Paragraph(f"Signed by: {admin_name}", ParagraphStyle('SigName', parent=styles['Normal'], fontSize=8, textColor=colors.grey)))
                    
                except Exception as e:
                    elements.append(Paragraph(f"(Signature load error: {e})", styles['Normal']))
            
            # --- Build PDF with Footer ---
            doc.build(elements, onFirstPage=self._add_footer, onLaterPages=self._add_footer)
            messagebox.showinfo("Success", f"Professional Report generated:\n{path}")
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to generate report: {e}")
            import traceback
            traceback.print_exc()

    def update_ui_for_no_data(self):
        self.analyze_btn.config(state="disabled")
        self.export_btn.config(state="disabled")
        self.btn_charts.config(state="disabled")
        self.btn_report.config(state="disabled")
        for item in self.sum_tree.get_children(): self.sum_tree.delete(item)
        for item in self.tree.get_children(): self.tree.delete(item)

    def add_record(self):
        if self.df is None: return
        self.show_record_dialog(mode="add")

    def delete_record(self):
        if not self.edit_mode or self.df is None: return
        
        selected_items = self.tree.selection()
        if not selected_items:
            messagebox.showwarning("Warning", "Please select a record to delete.")
            return
            
        if messagebox.askyesno("Confirm Delete", f"Are you sure you want to delete {len(selected_items)} record(s)?"):
            deleted_count = 0
            for item in selected_items:
                try:
                    values = self.tree.item(item, 'values')
                    # ID is the last column
                    idx_val = values[-1]
                    
                    # Try converting to int if index is numeric
                    if pd.api.types.is_integer_dtype(self.df.index):
                        idx = int(idx_val)
                    else:
                        idx = idx_val
                        
                    if idx in self.df.index:
                        self.df.drop(idx, inplace=True)
                        deleted_count += 1
                except Exception as e:
                    print(f"Error deleting record: {e}")
            
            if deleted_count > 0:
                self.analyze() # Refresh UI
                messagebox.showinfo("Success", f"{deleted_count} record(s) deleted.")
            else:
                messagebox.showwarning("Error", "Could not delete records.")

    def on_tree_double_click(self, event):
        if not self.edit_mode: return
        
        item_id = self.tree.identify_row(event.y)
        if not item_id: return
        
        values = self.tree.item(item_id)['values']
        if not values: return
        
        self.show_record_dialog(mode="edit", values=values)

    def show_record_dialog(self, mode="add", values=None):
        win = tk.Toplevel(self.root)
        win.title("Add Record" if mode == "add" else "Edit Record")
        win.geometry("450x600")
        win.configure(bg=self.bg_color)
        win.transient(self.root)
        win.grab_set()
        self.center_window(win)

        # Defaults
        today = datetime.now().strftime("%Y-%m-%d")
        defaults = {
            'Expense Date': today,
            'Expense Description': "",
            'Expense Category': "",
            'Merchant Name': "",
            'Paid Through': "",
            'Income Amount': "0",
            'Expense Amount': "0"
        }
        
        original_idx = None
        if mode == "edit" and values:
             # values: 0=Date, 1=Inc, 2=Exp, 3=Bal, 4=Desc, 5=Cat, 6=Merch, 7=Paid, 8=ID
             defaults['Expense Date'] = values[0]
             defaults['Income Amount'] = str(values[1]).replace(',','')
             defaults['Expense Amount'] = str(values[2]).replace(',','')
             defaults['Expense Description'] = values[4]
             defaults['Expense Category'] = values[5]
             defaults['Merchant Name'] = values[6]
             defaults['Paid Through'] = values[7]
             original_idx = int(values[8])

        fields = [
            ("Date (YYYY-MM-DD)", 'Expense Date'),
            ("Description", 'Expense Description'),
            ("Category", 'Expense Category'),
            ("Merchant", 'Merchant Name'),
            ("Paid Through", 'Paid Through'),
            ("Income Amount", 'Income Amount'),
            ("Expense Amount", 'Expense Amount')
        ]
        
        entries = {}
        
        for lbl, col in fields:
            ttk.Label(win, text=lbl, background=self.bg_color).pack(pady=(10, 0), anchor='w', padx=20)
            val = defaults.get(col, "")
            
            if col in ['Expense Category', 'Merchant Name', 'Paid Through']:
                if col == 'Expense Category':
                    vals = sorted(self.df['Expense Category'].dropna().unique().tolist())
                elif col == 'Merchant Name':
                    vals = sorted(self.df['Merchant Name'].dropna().unique().tolist())
                elif col == 'Paid Through':
                    vals = sorted(self.df['Paid Through'].dropna().unique().tolist())
                
                e = ttk.Combobox(win, values=vals, width=38)
                e.set(val)
            else:
                e = ttk.Entry(win, width=40)
                e.insert(0, str(val))
            
            e.pack(pady=(2, 0), padx=20)
            entries[col] = e
            
        def save():
            try:
                # Validate Date
                date_str = entries['Expense Date'].get()
                dt = pd.to_datetime(date_str)
                
                # Validate Numbers
                inc = float(entries['Income Amount'].get())
                exp = float(entries['Expense Amount'].get())
                
                row_data = {
                    'Expense Date': dt,
                    'Expense Description': entries['Expense Description'].get(),
                    'Expense Category': entries['Expense Category'].get(),
                    'Merchant Name': entries['Merchant Name'].get(),
                    'Paid Through': entries['Paid Through'].get(),
                    'Income Amount': inc,
                    'Expense Amount': exp,
                }
                
                if mode == "add":
                    row_data['Report Name'] = 'Manual Entry'
                    # Append
                    new_idx = self.df['original_index'].max() + 1 if not self.df.empty else 0
                    row_data['original_index'] = new_idx
                    
                    new_row = pd.DataFrame([row_data])
                    self.df = pd.concat([self.df, new_row], ignore_index=True)
                    messagebox.showinfo("Success", "Record added.")
                    
                else:
                    # Update
                    mask = self.df['original_index'] == original_idx
                    if not mask.any():
                        raise Exception("Record not found")
                    actual_idx = self.df.index[mask][0]
                    
                    for k, v in row_data.items():
                        self.df.at[actual_idx, k] = v
                        
                    messagebox.showinfo("Success", "Record updated.")

                # Refresh
                self.analyze()
                win.destroy()
                # Show save button
                if not self.btn_save.winfo_ismapped():
                    self.btn_save.pack(side=tk.LEFT, padx=5)
                    
            except ValueError as ve:
                messagebox.showerror("Validation Error", f"Invalid input: {ve}")
            except Exception as e:
                messagebox.showerror("Error", f"Operation failed: {e}")

        ttk.Button(win, text="Save", command=save).pack(pady=20)

    def show_tooltip(self, event):
        item = self.tree.identify_row(event.y)
        col = self.tree.identify_column(event.x)
        if col == '#5' and item:
            text = self.tree.item(item)['values'][4]
            if not self.tooltip:
                self.tooltip = tk.Toplevel(self.root)
                self.tooltip.wm_overrideredirect(True)
                self.tooltip_lbl = tk.Label(self.tooltip, bg="lightyellow", relief="solid", bd=1)
                self.tooltip_lbl.pack()
            self.tooltip_lbl.config(text=text)
            self.tooltip.wm_geometry(f"+{event.x_root+15}+{event.y_root+10}")
        else:
            self.hide_tooltip(event)

    def hide_tooltip(self, event):
        if self.tooltip:
            self.tooltip.destroy()
            self.tooltip = None

    def show_about(self):
        win = tk.Toplevel(self.root)
        win.title("About")
        win.geometry("900x700")
        win.configure(bg=self.bg_color)
        win.transient(self.root)
        win.grab_set()
        self.center_window(win)
        
        main_frame = tk.Frame(win, bg=self.bg_color)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=30, pady=30)
        
        # Left Column: App Info & Description (Replaced with ScrolledText)
        left_frame = tk.Frame(main_frame, bg=self.bg_color)
        left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 20))
        
        tk.Label(left_frame, text="Expense Analysis Tool", font=('Segoe UI', 24, 'bold'), bg=self.bg_color, fg=self.accent_color).pack(anchor='w')
        tk.Label(left_frame, text="Version 0.3.2", font=('Segoe UI', 12), bg=self.bg_color, fg="#666666").pack(anchor='w', pady=(0, 10))
        
        # ScrolledText for detailed info
        txt_info = scrolledtext.ScrolledText(left_frame, wrap=tk.WORD, font=('Segoe UI', 10), bd=0, height=20)
        txt_info.pack(fill=tk.BOTH, expand=True, pady=(0, 20))
        
        desc_text = """
  Expense Analysis Tool - GUI Application 
  
  
  Overview: 
  This is a graphical user interface (GUI) application built with Tkinter for analyzing expense and income reports. 
  It supports loading data from CSV or ODS (OpenDocument Spreadsheet) files. 
  - For CSV: Header is on row 1 (0-indexed: header=0, default). 
  - For ODS: Header is on row 4 (0-indexed: header=3). 
  Empty rows before/after header are handled by pandas (NaN rows filtered out in unique values). 
  The application provides filtering options via dropdown combos for specific columns, a text search for descriptions, 
  and displays a summary along with raw data in a sortable table. 
  
  
  Key Features: 
  - File Selection: User selects a CSV or ODS file via file dialog (ODS default). 
  - Quick Load: Load up to 3 pre-defined files configured in Settings. 
  - Data Loading: Automatically detects file type and loads using pandas (CSV: read_csv with header=0; ODS: read_excel with engine='odf' and header=3). 
    Note: For ODS support, install odfpy: pip install odfpy (not handled in app). 
  - Column Exclusion: 'Total' column is automatically dropped if present. 
  - Filters: 
    - Dropdowns (Comboboxes) for: Report Name (Col A), Year/Month (from Col C), Expense Category (Col F), 
      Merchant Name (Col H), Paid Through (Col G). 
    - Text entry for searching Expense Description (Col E) - case-insensitive partial match. 
  - Analysis: Applies all selected filters cumulatively. 
  - Sorting: Results sorted by Expense Date in descending order (newest first). 
  - Output: 
    - Summary: Total records, total income/expense/net balance, and breakdown by Category and Merchant (count, inc, exp, net). 
    - Raw Data: Tabular view with pagination-like scrolling, full descriptions displayed, Inc/Exp/Bal columns. 
  - Export: Save filtered raw data to CSV file. 
  - Application icon: Displays TSL logo (PNG format supported). 
  - All filters default to "All" (no filter applied). 
  - Date Handling: Supports string (YYYY-MM-DD) or date formats for 'Expense Date'. 
  
  
  Applicable Dates: 
  The tool handles dates in YYYY-MM-DD format. Sample data covers December 2025 (e.g., 2025-12-04 to 2025-12-05). 
  
  
  Assumptions: 
  - Data columns follow the structure: Report Name, Total, Expense Date, Expense Amount, Expense Description, 
    Expense Category, Paid Through, Merchant Name, Income Amount (exact names not enforced, but combos built dynamically). 
  - Dates in 'Expense Date' column are convertible to datetime for sorting. 
  - Amounts in 'Expense Amount' and 'Income Amount' are numeric. 
  - Handles empty results with user message. 
  - Empty rows (e.g., before data) are included as NaN but filtered out in dropdowns and analysis. 
  
  
  Usage: 
  1. Save the TSL logo as "tsl_icon.png" in the same folder as this script. 
  2. Run the script: python UtilsExp0116.py 
  3. Click "Load File" to select ODS or CSV. 
  4. Select filters as needed (defaults show all data). 
  5. Click "Analyse" to view summary and table. 
  6. Use "Export to CSV" to save the displayed raw data. 
  7. Re-load file or adjust filters for new analysis. 
  
  
  Dependencies: 
  - Python 3.6+ (tested with 3.12) 
  - pandas (for data handling) 
  - tkinter (standard library for GUI) 
  - odfpy (for ODS reading; install separately if needed) 
  
  
  Error Handling: 
  - Invalid file: Message box with error. 
  - No data: Informative message. 
  - Non-numeric amounts: Pandas will coerce to NaN; sums ignore NaNs. 
  - Missing columns: Validation error on load. 
  
  
  Future Enhancements: 
  - Export results to CSV/Excel. 
  - Advanced search (regex). 
  - Chart visualizations (e.g., pie chart for categories). 
  - Auto-skip empty rows option. 
  
  
  Guided by Uday Kumar for The Space Lab 
  Initially developed for The Space Lab using Grok (v1 - v1.16) 
  Updated and extensively upgraded by Angel (Mehul) Singh 
  Developed at Br31Technologies with Lite and Robust version 
  Updated on: 2026-01-07 
  Author: Angel (Mehul) Singh & Grok 
  Version: 0.3.2 (PDF Reports, Charts, Encryption) 
  Change Log: 
  - v1.12: Added comma-separated formatting (e.g., 1,000.00). 
  - v1.13: Added busy cursor, filters update, key input support. 
  - v1.14 - v1.16: Icon support (PNG/ICO). 
  - v1.17: Added Settings, Quick Load, Admin Profile. 
  - v0.3.2: Added PDF Reporting (with Signature), Charts (Pie/Bar), 
    Data Encryption (SecurityManager), and Create New File option. 
  """
        txt_info.insert(tk.END, desc_text)
        txt_info.config(state='disabled')

        # Recent Backups (moved to left column bottom)
        backup_frame = tk.LabelFrame(left_frame, text="Recent Backups", bg=self.bg_color, fg=self.text_color, font=('Segoe UI', 10, 'bold'))
        backup_frame.pack(fill=tk.X, pady=(30, 0))
        try:
            backups = glob.glob(os.path.join(self.backups_dir, "*_backup_*.*"))
            backups.sort(key=os.path.getmtime, reverse=True)
            recent = backups[:3]
            if recent:
                for f in recent:
                    ts = datetime.fromtimestamp(os.path.getmtime(f)).strftime('%Y-%m-%d')
                    lbl = tk.Label(backup_frame, text=f"• {os.path.basename(f)} ({ts})", bg=self.bg_color, font=('Segoe UI', 9), cursor="hand2")
                    lbl.pack(anchor='w', padx=10, pady=2)
                    lbl.bind("<Button-1>", lambda e, path=f: self.load_file(path))
            else:
                tk.Label(backup_frame, text="No backups found.", bg=self.bg_color, font=('Segoe UI', 9, 'italic')).pack(anchor='w', padx=10, pady=5)
            
            # Open Folder Link
            link = tk.Label(backup_frame, text="Open Backups Folder", fg="blue", bg=self.bg_color, font=('Segoe UI', 9, 'underline', 'bold'), cursor="hand2")
            link.pack(anchor='w', padx=10, pady=(5, 5))
            link.bind("<Button-1>", lambda e: os.startfile(self.backups_dir))
        except: pass

        # Right Column: Logos & Developer Info (Centered)
        right_frame = tk.Frame(main_frame, bg=self.bg_color)
        right_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=False, padx=(20, 0))
        
        # Container for centering content in right column
        center_container = tk.Frame(right_frame, bg=self.bg_color)
        center_container.pack(expand=True)

        # Logos
        if hasattr(self, 'icon_img') and self.icon_img:
            try:
                # Adjust scaling as needed
                img = self.icon_img.subsample(4, 4) 
                l = tk.Label(center_container, image=img, bg=self.bg_color)
                l.image = img
                l.pack(pady=10)
            except: pass
            
        if hasattr(self, 'logo2_img') and self.logo2_img:
            try:
                img2 = self.logo2_img.subsample(4, 4)
                l2 = tk.Label(center_container, image=img2, bg=self.bg_color)
                l2.image = img2
                l2.pack(pady=10)
            except: pass
            
        # Developer Info
        tk.Label(center_container, text="Initially Guided by Uday Kumar", font=('Segoe UI', 10, 'bold'), bg=self.bg_color).pack(pady=(10, 0))
        tk.Label(center_container, text="Developed for The Space Lab\n(v1 - v1.16 using Grok)", font=('Segoe UI', 9), bg=self.bg_color, justify=tk.CENTER).pack(pady=(2, 10))
        
        tk.Label(center_container, text="Extensively Upgraded by", font=('Segoe UI', 10, 'bold'), bg=self.bg_color).pack(pady=(5, 0))
        tk.Label(center_container, text="Angel (Mehul) Singh", font=('Segoe UI', 12, 'bold'), bg=self.bg_color, fg=self.accent_color).pack()
        
        tk.Label(center_container, text="Developed at Br31Technologies", font=('Segoe UI', 10, 'bold'), bg=self.bg_color).pack(pady=(10, 0))
        tk.Label(center_container, text="Lite and Robust Version", font=('Segoe UI', 9, 'italic'), bg=self.bg_color).pack(pady=(0, 20))
        
        # Contact Buttons
        def email(): webbrowser.open("mailto:support@br31tech.live")
        def web(): webbrowser.open("https://br31tech.live")
        
        ttk.Button(center_container, text="Email Us", command=email, width=20).pack(pady=5)
        ttk.Button(center_container, text="Visit Website", command=web, width=20).pack(pady=5)



def main():
    root = tk.Tk()
    app = ExpenseAnalyzer(root)
    root.mainloop()

if __name__ == "__main__":
    main()
