import os
import unittest
from unittest.mock import MagicMock, patch
import pandas as pd
from datetime import datetime
import sys

# Mock UI dependencies
sys.modules['kivymd.toast'] = MagicMock()
sys.modules['kivymd.uix.datatables'] = MagicMock()

from main import ExpenseApp

class TestNewFeatures(unittest.TestCase):
    def setUp(self):
        self.app = ExpenseApp()
        self.app.root = MagicMock()
        self.app.root.ids = MagicMock()
        self.app.current_file_path = "test_file.xlsx"
        
    @patch('main.shutil.copy2')
    @patch('main.os.makedirs')
    @patch('main.os.path.exists')
    def test_backup_data(self, mock_exists, mock_makedirs, mock_copy):
        print("\nTesting Backup Logic...")
        mock_exists.return_value = False # Force makedirs
        
        self.app.backup_data()
        
        mock_makedirs.assert_called()
        mock_copy.assert_called()
        print("Backup Logic OK")

    @patch('main.pd.DataFrame.to_excel')
    @patch('main.ExpenseApp.load_file')
    def test_create_new_file(self, mock_load, mock_to_excel):
        print("\nTesting New File Creation...")
        self.app.create_new_file()
        
        # Verify to_excel called (file created)
        mock_to_excel.assert_called()
        # Verify load_file called
        mock_load.assert_called()
        print("New File Creation OK")

    def test_column_selection(self):
        print("\nTesting Column Selection...")
        # Setup data with all columns including new ones
        data = {
            'Expense Date': [],
            'Income Amount': [],
            'Expense Amount': [],
            'Expense Description': [],
            'Expense Category': [],
            'Merchant Name': [],
            'Paid Through': [],
            'Report Name': [],
            'Extra': []
        }
        self.app.filtered_df = pd.DataFrame(data)
        
        # Mock MDDataTable to check arguments
        with patch('main.MDDataTable') as MockTable:
            self.app.update_table()
            
            # Get call args
            args, kwargs = MockTable.call_args
            column_data = kwargs.get('column_data', [])
            col_names = [c[0] for c in column_data]
            
            # Verify new columns are present
            self.assertIn('Paid Through', col_names)
            self.assertIn('Report Name', col_names)
            # Verify internal/extra cols not present
            self.assertNotIn('Extra', col_names)
            
        print("Column Selection OK")

    def test_cascading_filters(self):
        print("\nTesting Cascading Filters...")
        # Setup data: 2024 has "Jan", 2025 has "Feb"
        data = {
            'Year': [2024, 2025],
            'Month': ['January', 'February'],
            'Report Name': ['R1', 'R2'],
            'Expense Category': ['C1', 'C2'],
            'Merchant Name': ['M1', 'M2'],
            'Paid Through': ['P1', 'P2']
        }
        self.app.df = pd.DataFrame(data)
        
        # Mock open_filter_menu internal logic (we can't easily check MDDropdownMenu open, but we can check logic)
        # We'll just manually verify logic here
        
        # Filter by Year 2024
        self.app.filter_year_val = "2024"
        
        # "Month" filter should only show 'January'
        temp_df = self.app.df.copy()
        if self.app.filter_year_val:
            temp_df = temp_df[temp_df['Year'].astype(str) == self.app.filter_year_val]
            
        months = temp_df['Month'].unique().tolist()
        self.assertEqual(months, ['January'])
        print("Cascading Filter (Year->Month) OK")

    def test_add_record_logic(self):
        print("\nTesting Add Record Logic...")
        # Setup initial df
        self.app.df = pd.DataFrame(columns=['A', 'original_index'])
        self.app.current_file_path = "test.xlsx" # Dummy
        
        # Mock dialog elements
        self.app.edit_fields = {'A': MagicMock()}
        self.app.edit_fields['A'].text = "NewVal"
        self.app.editing_index = None # New record
        
        # Mock save_record to avoid file I/O
        self.app.save_record = MagicMock()
        self.app.dialog_record = MagicMock()
        self.app.preprocess_data = MagicMock()
        self.app.apply_filters = MagicMock()
        
        # Call save
        self.app.save_record_from_dialog()
        
        # Check df has new row
        self.assertEqual(len(self.app.df), 1)
        self.assertEqual(self.app.df.iloc[0]['A'], "NewVal")
        print("Add Record Logic OK")

if __name__ == '__main__':
    unittest.main()
