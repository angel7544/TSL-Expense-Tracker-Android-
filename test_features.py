import os
import json
from security_manager import SecurityManager
from utilisExp03final import ExpenseAnalyzer
import tkinter as tk

def test_security():
    print("Testing SecurityManager...")
    sec = SecurityManager("test_secret.key")
    data = {"test": "value"}
    sec.save_json_encrypted(data, "test_enc.json")
    loaded = sec.load_json_encrypted("test_enc.json")
    assert loaded == data
    print("SecurityManager Test Passed!")
    
    # Clean up
    if os.path.exists("test_secret.key"): os.remove("test_secret.key")
    if os.path.exists("test_enc.json"): os.remove("test_enc.json")

def test_app_methods():
    print("Testing App Methods...")
    root = tk.Tk()
    app = ExpenseAnalyzer(root)
    
    methods = [
        'show_charts',
        'generate_report',
        'create_new_file',
        'load_settings',
        'save_settings'
    ]
    
    for m in methods:
        if hasattr(app, m):
            print(f"Method {m} exists.")
        else:
            print(f"Method {m} MISSING!")
            
    root.destroy()

if __name__ == "__main__":
    test_security()
    test_app_methods()
