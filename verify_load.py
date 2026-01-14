import pandas as pd
import os

file_path = r"d:\IMS\UtilisTSL_PY\NiruTunmun_(Expenses).xlsx"

if not os.path.exists(file_path):
    print(f"File not found: {file_path}")
    exit(1)

print(f"Loading {file_path}...")

try:
    # Try to detect format (Same logic as in load_file)
    # Read header only
    df_check = pd.read_excel(file_path, engine='openpyxl', nrows=0)
    cols = [str(c).strip() for c in df_check.columns]
    print(f"Columns found: {cols}")
    
    # Check for NiruTunmun format: Date, Category, Description, Type, Amount
    required_niru = ['Date', 'Category', 'Description', 'Type', 'Amount']
    if all(c in cols for c in required_niru):
        print("Format detected: NiruTunmun")
        # Load and convert
        df_raw = pd.read_excel(file_path, engine='openpyxl')
        
        df = pd.DataFrame()
        df['Expense Date'] = df_raw['Date']
        df['Expense Category'] = df_raw['Category']
        df['Expense Description'] = df_raw['Description']
        
        # Handle Amount and Type
        df['Expense Amount'] = df_raw.apply(lambda x: x['Amount'] if str(x['Type']).lower() == 'expense' else 0, axis=1)
        df['Income Amount'] = df_raw.apply(lambda x: x['Amount'] if str(x['Type']).lower() == 'income' else 0, axis=1)
        
        df['Paid Through'] = ""
        df['Merchant Name'] = ""
        df['Report Name'] = os.path.splitext(os.path.basename(file_path))[0]
        
        print("\nConverted DataFrame Head:")
        print(df.head())
        print("\nColumns:")
        print(df.columns)
        
        if 'Paid Through' in df.columns:
            print("\n'Paid Through' column present.")
        else:
            print("\n'Paid Through' column MISSING.")
            
    else:
        print("Format detected: Standard or Unknown")
        df = pd.read_excel(file_path, engine='openpyxl', header=0)
        print(df.head())

except Exception as e:
    print(f"Error: {e}")
