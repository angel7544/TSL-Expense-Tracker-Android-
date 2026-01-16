import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, Text, Button, Alert, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { Store, ExpenseRecord } from '../data/Store';
import { AppHeader } from "../components/AppHeader";
import { InputModal } from '../components/InputModal';
import { UIContext } from '../context/UIContext';
import { getTheme } from '../constants/Theme';

export default function ReportScreen() {
  const { theme } = useContext(UIContext);
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [summary, setSummary] = useState({ inc: 0, exp: 0, net: 0 });
  const [modalVisible, setModalVisible] = useState(false);

  const loadData = async () => {
    try {
      const data = await Store.list({});
      setRecords(data);
      const inc = data.reduce((s, r) => s + (r.income_amount || 0), 0);
      const exp = data.reduce((s, r) => s + (r.expense_amount || 0), 0);
      setSummary({ inc, exp, net: inc - exp });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = Store.subscribe(loadData);
    return unsub;
  }, []);

  const generatePdf = async (filename: string) => {
    try {
      // Re-fetch to ensure latest data
      const data = await Store.list({});
      const settings = Store.getSettings();
      const totalInc = data.reduce((s, r) => s + (r.income_amount || 0), 0);
      const totalExp = data.reduce((s, r) => s + (r.expense_amount || 0), 0);
      
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              @page { size: ${settings.pdf_page_size || 'A4'}; margin: 0; }
              body { font-family: 'Helvetica', sans-serif; padding: 40px; padding-bottom: 80px; color: #333; }
              .header { display: flex; justify-content: space-between; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
              .company-info h2 { margin: 0; color: #007bff; font-size: 24px; }
              .company-info p { margin: 4px 0; font-size: 12px; color: #666; }
              .report-info { text-align: right; }
              .report-info h1 { margin: 0; font-size: 20px; color: #333; }
              .report-info p { margin: 4px 0; font-size: 12px; color: #666; }
              
              .summary-cards { display: flex; justify-content: space-between; margin-bottom: 30px; gap: 20px; }
              .card { flex: 1; padding: 15px; border-radius: 8px; background: #f8f9fa; border-left: 4px solid #ccc; }
              .card.inc { border-color: #28a745; background: #e8f5e9; }
              .card.exp { border-color: #dc3545; background: #fce8e6; }
              .card.net { border-color: #17a2b8; background: #e0f7fa; }
              .card h3 { margin: 0 0 5px 0; font-size: 12px; color: #555; text-transform: uppercase; }
              .card p { margin: 0; font-size: 20px; font-weight: bold; }
              
              table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
              th, td { border: 1px solid #dee2e6; padding: 10px; text-align: left; font-size: 11px; }
              th { background-color: #f8f9fa; color: #495057; font-weight: bold; text-transform: uppercase; }
              tr:nth-child(even) { background-color: #f8f9fa; }
              
              .amount-inc { color: #28a745; font-weight: bold; }
              .amount-exp { color: #dc3545; font-weight: bold; }
              
              .footer { position: fixed; bottom: 20px; width: 100%; text-align: center; font-size: 10px; color: #adb5bd; border-top: 1px solid #eee; padding-top: 20px; }
              .signature-section { margin-top: 40px; page-break-inside: avoid; }
              .signature-box { display: inline-block; border-top: 1px solid #333; padding-top: 10px; min-width: 200px; text-align: center; }
              .logo { max-height: 50px; margin-bottom: 10px; }
              
              .watermark {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-45deg);
                font-size: 80px;
                color: rgba(0, 0, 0, 0.05);
                z-index: -1;
                white-space: nowrap;
                pointer-events: none;
                font-weight: bold;
                text-transform: uppercase;
                border: 5px solid rgba(0, 0, 0, 0.05);
                padding: 20px;
                border-radius: 20px;
              }
            </style>
          </head>
          <body>
            <div class="watermark">System Generated</div>
            <div class="header">
              <div class="company-info">
                ${settings.company_logo ? `<img src="${settings.company_logo}" class="logo" />` : ''}
                <h2>${settings.company_name}</h2>
                <p>Admin: ${settings.admin_name} | ${settings.admin_role}</p>
                <p>${settings.company_contact}</p>
              </div>
              <div class="report-info">
                <h1>Analysis Report</h1>
                <p>Date: ${new Date().toLocaleDateString()}</p>
                <p>Generated via AndroidTSLExpense</p>
                <p>Size: ${settings.pdf_page_size || 'A4'}</p>
              </div>
            </div>

            <div class="summary-cards">
              <div class="card inc">
                <h3>Total Income</h3>
                <p style="color: #28a745">${totalInc.toFixed(2)}</p>
              </div>
              <div class="card exp">
                <h3>Total Expense</h3>
                <p style="color: #dc3545">${totalExp.toFixed(2)}</p>
              </div>
              <div class="card net">
                <h3>Net Balance</h3>
                <p style="color: ${totalInc - totalExp >= 0 ? '#17a2b8' : '#ffc107'}">${(totalInc - totalExp).toFixed(2)}</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 15%">Date</th>
                  <th style="width: 30%">Description</th>
                  <th style="width: 15%">Category</th>
                  <th style="width: 20%">Merchant</th>
                  <th style="width: 10%; text-align: right">Income</th>
                  <th style="width: 10%; text-align: right">Expense</th>
                </tr>
              </thead>
              <tbody>
                ${data.map(r => `
                  <tr>
                    <td>${r.expense_date}</td>
                    <td>${r.expense_description}</td>
                    <td>${r.expense_category}</td>
                    <td>${r.merchant_name}</td>
                    <td style="text-align: right" class="${r.income_amount > 0 ? 'amount-inc' : ''}">${(r.income_amount || 0) > 0 ? (r.income_amount || 0).toFixed(2) : '-'}</td>
                    <td style="text-align: right" class="${r.expense_amount > 0 ? 'amount-exp' : ''}">${(r.expense_amount || 0) > 0 ? (r.expense_amount || 0).toFixed(2) : '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="signature-section">
                <div class="signature-box">
                    ${settings.admin_signature_image ? 
                        `<img src="${settings.admin_signature_image}" style="max-height: 50px; display: block; margin: 0 auto 5px auto;" />` : 
                        `<p style="font-family: 'Courier New', monospace; font-style: italic; font-size: 14px; margin-bottom: 5px;">${settings.admin_signature || settings.admin_name}</p>`
                    }
                    <p style="font-size: 10px; color: #666; text-transform: uppercase;">Authorized Signature</p>
                </div>
            </div>

            <div class="footer">
              <p>System Generated and Verified by ${settings.admin_name} | ${settings.company_name}</p>
              <p>This document is confidential and intended solely for the use of the individual or entity to whom it is addressed.</p>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      const finalName = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
      const newUri = uri.substring(0, uri.lastIndexOf('/') + 1) + finalName;
      await FileSystem.moveAsync({ from: uri, to: newUri });
      await Sharing.shareAsync(newUri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: finalName });
    } catch (error: any) {
      Alert.alert("Error", "Failed to generate report: " + error.message);
    }
  };

  const handlePdfSubmit = (filename: string) => {
    setModalVisible(false);
    generatePdf(filename);
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Report" subtitle="Generate & View Reports" />
      <View style={{ flex: 1, padding: 16 }}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
                <Text style={styles.title}>Expense Analysis</Text>
                <Text style={styles.subtitle}>Date: {new Date().toLocaleDateString()}</Text>
            </View>
            <TouchableOpacity style={styles.miniButton} onPress={() => setModalVisible(true)}>
                <Ionicons name="document-text-outline" size={20} color="#fff" />
                <Text style={styles.miniButtonText}>PDF</Text>
            </TouchableOpacity>
        </View>
      </View>

      <InputModal
        visible={modalVisible}
        title="Export PDF"
        placeholder="Enter filename"
        initialValue={`Report_${new Date().toISOString().slice(0,10)}`}
        onClose={() => setModalVisible(false)}
        onSubmit={handlePdfSubmit}
        submitLabel="Generate"
      />

      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Income</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.success }]}>₹{summary.inc.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Expense</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.danger }]}>₹{summary.exp.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Net Balance</Text>
          <Text style={[styles.summaryValue, { color: summary.net >= 0 ? theme.colors.primary : theme.colors.danger }]}>
            ₹{summary.net.toFixed(2)}
          </Text>
        </View>
      </View>

      <ScrollView 
        style={styles.list}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.tableHeader}>
          <Text style={[styles.col, { flex: 2 }]}>Date/Desc</Text>
          <Text style={[styles.col, { flex: 1 }]}>Cat</Text>
          <Text style={[styles.col, { flex: 1, textAlign: 'right' }]}>Amount</Text>
        </View>
        {records.map((item, index) => (
          <View key={index} style={styles.row}>
            <View style={{ flex: 2 }}>
              <Text style={styles.date}>{item.expense_date}</Text>
              <Text style={styles.desc} numberOfLines={1}>{item.expense_description}</Text>
            </View>
            <Text style={[styles.col, { flex: 1, fontSize: 12 }]}>{item.expense_category}</Text>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              {item.income_amount > 0 && <Text style={{ color: theme.colors.success, fontWeight: 'bold' }}>+{item.income_amount.toFixed(2)}</Text>}
              {item.expense_amount > 0 && <Text style={{ color: theme.colors.danger, fontWeight: 'bold' }}>-{item.expense_amount.toFixed(2)}</Text>}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={generatePdf}>
          <Text style={styles.buttonText}>Generate PDF Report</Text>
        </TouchableOpacity>
      </View> */}
      
      </View>
    </View>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { marginBottom: 16, borderBottomWidth: 1, borderColor: theme.colors.border, paddingBottom: 10 },
  title: { fontSize: 22, fontWeight: 'bold', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.subtext, marginTop: 4 },
  summaryContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, backgroundColor: theme.colors.card, padding: 16, borderRadius: 10, elevation: 2 },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: theme.colors.subtext, marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: 'bold' },
  list: { flex: 1, backgroundColor: theme.colors.card, borderRadius: 10, padding: 10, marginBottom: 80 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderColor: theme.colors.border, paddingBottom: 8, marginBottom: 8 },
  col: { fontWeight: '600', color: theme.colors.text },
  row: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderColor: theme.colors.border, alignItems: 'center' },
  date: { fontSize: 10, color: theme.colors.subtext },
  desc: { fontSize: 13, color: theme.colors.text },
  miniButton: { 
    backgroundColor: theme.colors.primary, 
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8, 
    alignItems: 'center',
    flexDirection: 'row',
    elevation: 2
  },
  miniButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginLeft: 4 },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 20, left: 16, right: 16 },
});
