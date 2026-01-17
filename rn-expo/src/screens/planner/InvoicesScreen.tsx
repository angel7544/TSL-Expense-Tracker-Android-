import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Store, Invoice, InvoiceItem, ExpenseRecord } from '../../data/Store';
import { UIContext } from '../../context/UIContext';

// --- Simple Calendar Modal ---
const CalendarModal = ({ visible, onClose, onSelect, initialDate }: { visible: boolean, onClose: () => void, onSelect: (date: string) => void, initialDate?: string }) => {
    const { theme } = useContext(UIContext);
    const styles = useMemo(() => getStyles(theme), [theme]);
    const [currentDate, setCurrentDate] = useState(initialDate ? new Date(initialDate) : new Date());
    
    useEffect(() => {
        if (visible) {
            setCurrentDate(initialDate ? new Date(initialDate) : new Date());
        }
    }, [visible, initialDate]);

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const handleDayPress = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        onSelect(dateStr);
        onClose();
    };

    const changeMonth = (delta: number) => {
        setCurrentDate(new Date(year, month + delta, 1));
    };

    const renderCalendar = () => {
        const days = [];
        for (let i = 0; i < firstDay; i++) {
            days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            const isToday = new Date().toDateString() === new Date(year, month, i).toDateString();
            const isSelected = initialDate === `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            days.push(
                <TouchableOpacity 
                    key={i} 
                    style={[styles.calendarDay, isSelected && styles.calendarDaySelected, isToday && !isSelected && styles.calendarDayToday]} 
                    onPress={() => handleDayPress(i)}
                >
                    <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected]}>{i}</Text>
                </TouchableOpacity>
            );
        }
        return days;
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.calendarContainer}>
                    <View style={styles.calendarHeader}>
                        <TouchableOpacity onPress={() => changeMonth(-1)}><Ionicons name="chevron-back" size={24} color={theme.colors.text} /></TouchableOpacity>
                        <Text style={styles.calendarTitle}>{monthNames[month]} {year}</Text>
                        <TouchableOpacity onPress={() => changeMonth(1)}><Ionicons name="chevron-forward" size={24} color={theme.colors.text} /></TouchableOpacity>
                    </View>
                    <View style={styles.weekDays}>
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <Text key={i} style={styles.weekDayText}>{d}</Text>)}
                    </View>
                    <View style={styles.calendarGrid}>
                        {renderCalendar()}
                    </View>
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Text style={styles.closeBtnText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

export const InvoicesScreen = () => {
    const { theme } = useContext(UIContext);
    const styles = useMemo(() => getStyles(theme), [theme]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [currentInvoice, setCurrentInvoice] = useState<Partial<Invoice>>({});
    const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
    
    // Calendar State
    const [showCalendar, setShowCalendar] = useState<'invoice' | 'due' | null>(null);

    // For importing from records
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [availableRecords, setAvailableRecords] = useState<ExpenseRecord[]>([]);

    useEffect(() => {
        loadData();
        const unsub = Store.subscribe(loadData);
        return unsub;
    }, []);

    const loadData = async () => {
        const data = await Store.getInvoices();
        setInvoices(data);
    };

    const calculateTotals = () => {
        const sub = invoiceItems.reduce((sum, item) => sum + (Number(item.amount) * Number(item.quantity)), 0);
        const discountVal = Number(currentInvoice.discount || 0);
        const taxable = Math.max(0, sub - discountVal);
        const taxRate = Number(currentInvoice.tax_rate || 0);
        const taxVal = (taxable * taxRate) / 100;
        const total = taxable + taxVal;
        return { sub, discountVal, taxVal, total };
    };

    const handleSave = async () => {
        if (!currentInvoice.client_name || !currentInvoice.invoice_number) {
            Alert.alert("Error", "Client Name and Invoice Number are required");
            return;
        }

        const { sub, discountVal, taxRate, taxVal, total } = (() => {
            const t = calculateTotals();
            return { ...t, taxRate: Number(currentInvoice.tax_rate || 0) };
        })();

        const newInvoice: Invoice = {
            ...currentInvoice as Invoice,
            items: JSON.stringify(invoiceItems),
            total_amount: total,
            subtotal: sub,
            discount: discountVal,
            tax_rate: taxRate,
            tax_amount: taxVal,
            status: currentInvoice.status || 'draft',
            invoice_date: currentInvoice.invoice_date || new Date().toISOString().split('T')[0],
            due_date: currentInvoice.due_date || "",
        };

        if (currentInvoice.id) {
            await Store.deleteInvoice(currentInvoice.id);
        }
        
        await Store.addInvoice(newInvoice);
        setModalVisible(false);
        resetForm();
    };

    const handleDelete = async (id: number) => {
        Alert.alert("Delete Invoice", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => Store.deleteInvoice(id) }
        ]);
    };

    const resetForm = () => {
        setCurrentInvoice({
            invoice_number: `INV-${Date.now().toString().slice(-6)}`,
            invoice_date: new Date().toISOString().split('T')[0],
            status: 'draft',
            tax_rate: 18 // Default GST 18%
        });
        setInvoiceItems([]);
    };

    const openModal = (inv?: Invoice) => {
        if (inv) {
            setCurrentInvoice(inv);
            try {
                setInvoiceItems(JSON.parse(inv.items));
            } catch (e) {
                setInvoiceItems([]);
            }
        } else {
            resetForm();
        }
        setModalVisible(true);
    };

    const generatePdf = async (inv: Invoice) => {
        try {
            const settings = Store.getSettings();
            let items: InvoiceItem[] = [];
            try {
                items = JSON.parse(inv.items);
            } catch (e) { items = []; }

            const subtotal = inv.subtotal || items.reduce((s, i) => s + (i.amount * i.quantity), 0);
            const discount = inv.discount || 0;
            const taxRate = inv.tax_rate || 0;
            const taxAmount = inv.tax_amount || ((subtotal - discount) * taxRate / 100);
            const total = inv.total_amount || (subtotal - discount + taxAmount);

            const phoneIcon = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`;
            const pinIcon = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
            const userIcon = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
            const taxIcon = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`;

            const ITEMS_PER_PAGE = 8;
            const pages = [];
            for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
                pages.push(items.slice(i, i + ITEMS_PER_PAGE));
            }
            if (pages.length === 0) pages.push([]);

            const html = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  @page { size: ${settings.pdf_page_size || 'A4'}; margin: 0; }
                  body { font-family: 'Helvetica', sans-serif; margin: 0; padding: 0; color: #333; }
                  
                  .header { background-color: #047857; color: white; padding: 40px; display: flex; justify-content: space-between; align-items: flex-start; position: relative; }
                  .logo-area img { max-height: 80px; margin-bottom: 10px; background: white; padding: 5px; border-radius: 4px; }
                  .header-title { font-size: 48px; font-weight: bold; letter-spacing: 2px; margin: 0; }
                  .header-details { text-align: right; }
                  .header-details p { margin: 2px 0; font-size: 14px; opacity: 0.9; }
                  .status-stamp { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-15deg); width: 128px; height: 128px; display: flex; align-items: center; justify-content: center; border: 8px solid; border-radius: 50%; font-size: 35px; font-weight: bold; text-transform: uppercase; background-color: rgba(255, 255, 255, 0.63); opacity: 0.8; z-index: 100; }
                  .status-stamp.paid { color: #b91c1c; border-color: #b91c1c; }
                  .status-stamp.due { color: #ea580c; border-color: #ea580c; }
                  
                  .content { padding: 40px 40px 40px 40px; }
                  .page-container { min-height: 100vh; position: relative; }
                  
                  .info-row { display: flex; justify-content: space-between; margin-bottom: 40px; }
                  .info-col { width: 45%; }
                  .info-col h3 { color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                  .info-col p { margin: 2px 0; font-size: 14px; font-weight: 500; display: flex; align-items: center; }
                  .info-col .company-name { font-size: 16px; font-weight: bold; color: #047857; margin-bottom: 5px; }
                  .icon { display: inline-block; width: 14px; height: 14px; margin-right: 6px; vertical-align: middle; }
                  
                  table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                  th { background-color: #f3f4f6; color: #374151; font-weight: bold; text-transform: uppercase; font-size: 12px; padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; }
                  td { padding: 12px; font-size: 14px; border-bottom: 1px solid #eee; }
                  tr:nth-child(even) { background-color: #fcfcfc; }
                  
                  .totals-section { display: flex; justify-content: flex-end; }
                  .totals-table { width: 300px; }
                  .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
                  .totals-row.final { background-color: #047857; color: white; padding: 12px; font-weight: bold; font-size: 16px; margin-top: 10px; border-radius: 4px; }
                  
                  .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #eee; padding-top: 20px; }
                  .signature-section { margin-top: 50px; text-align: right; }
                  .signature-img { max-height: 60px; display: inline-block; margin-bottom: 6px; }
                  .signature-name { font-family: cursive; font-size: 18px; display: block; text-align: right; margin-bottom: 6px; }
                  .signature-label { border-top: 1px solid #ccc; display: inline-block; padding-top: 5px; font-size: 10px; text-transform: uppercase; }
                </style>
              </head>
              <body>
                ${pages.map((pageItems, pageIndex) => {
                    const isLastPage = pageIndex === pages.length - 1;
                    return `
                    <div class="page-container" style="${!isLastPage ? 'page-break-after: always;' : ''}">
                        <div class="header">
                          <div class="logo-area">
                            ${settings.company_logo ? `<img src="${settings.company_logo}" />` : ''}
                          </div>
                          <div class="header-details">
                            <h1 class="header-title">INVOICE</h1>
                            <p>INVOICE NO: ${inv.invoice_number}</p>
                            <p>INVOICE DATE: ${inv.invoice_date}</p>
                            ${inv.due_date ? `<p>DUE DATE: ${inv.due_date}</p>` : ''}
                          </div>
                        </div>
                        ${(inv.status === 'paid' && pageIndex === 0) ? `<div class="status-stamp paid">PAID</div>` : (inv.status === 'sent' && pageIndex === 0) ? `<div class="status-stamp due">DUE</div>` : ''}

                        <div class="content">
                            ${pageIndex === 0 ? `
                            <div class="info-row">
                                <div class="info-col">
                                    <h3>From</h3>
                                    <p class="company-name">${settings.company_name}</p>
                                    ${settings.company_address ? `<p>${pinIcon} ${settings.company_address}</p>` : ''}
                                    <p>${phoneIcon} ${settings.company_contact}</p>
                                    ${settings.company_gst ? `<p>${taxIcon} GSTIN: ${settings.company_gst}</p>` : ''}
                                </div>
                                <div class="info-col" style="text-align: left;">
                                    <h3>Billed To</h3>
                                    <p class="company-name">${inv.client_name}</p>
                                    <p>${pinIcon} ${inv.client_address}</p>
                                    <p>${phoneIcon} ${inv.client_phone}</p>
                                    ${inv.client_gst ? `<p>${taxIcon} GSTIN: ${inv.client_gst}</p>` : ''}
                                </div>
                            </div>
                            ` : ''}

                            <table>
                                <thead>
                                    <tr>
                                        <th style="width: 5%">#</th>
                                        <th style="width: 45%">Product/Service</th>
                                        <th style="width: 15%; text-align: center">Qty</th>
                                        <th style="width: 15%; text-align: right">Unit Price</th>
                                        <th style="width: 20%; text-align: right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${pageItems.map((item, i) => `
                                        <tr>
                                            <td>${(pageIndex * ITEMS_PER_PAGE) + i + 1}</td>
                                            <td>
                                                ${item.name ? `<div style="font-weight: 600;">${item.name}</div>` : ''}
                                                ${item.description ? `<div style="font-size: 12px; color: #6b7280;">${item.description}</div>` : ''}
                                            </td>
                                            <td style="text-align: center">${item.quantity}</td>
                                            <td style="text-align: right">₹${Number(item.amount).toFixed(2)}</td>
                                            <td style="text-align: right">₹${(Number(item.amount) * Number(item.quantity)).toFixed(2)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>

                            ${isLastPage ? `
                            <div class="totals-section">
                                <div class="totals-table">
                                    <div class="totals-row">
                                        <span>Subtotal</span>
                                        <span>₹${subtotal.toFixed(2)}</span>
                                    </div>
                                    ${discount > 0 ? `
                                    <div class="totals-row">
                                        <span>Discount</span>
                                        <span>-₹${discount.toFixed(2)}</span>
                                    </div>
                                    ` : ''}
                                    <div class="totals-row">
                                        ${taxRate === 0 ? 
                                            `<span style="width: 100%; text-align: right; font-size: 10px; font-style: italic;">Service Provider/Trader Not registered under GST</span>` 
                                            : 
                                            `<span>Tax (GST ${taxRate}%)</span>
                                            <span>₹${taxAmount.toFixed(2)}</span>`
                                        }
                                    </div>
                                    <div class="totals-row final">
                                        <span>AMOUNT</span>
                                        <span>₹${total.toFixed(2)}</span>
                                        <span>Status: ${inv.status === 'paid' ? 'Paid' : inv.status === 'sent' ? 'Due' : 'Unpaid'}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="signature-section">
                                ${settings.admin_signature_image ? 
                                    `<img src="${settings.admin_signature_image}" class="signature-img" />` : 
                                    `<p class="signature-name">${settings.admin_signature || settings.admin_name}</p>`
                                }
                                <p class="signature-label">Authorized Signature</p>
                            </div>

                            <div class="footer">
                                <p>${settings.company_name} | THANK YOU FOR YOUR BUSINESS!${settings.company_contact ? ` | ${settings.company_contact}` : ''}</p>
                                <p style="margin-top: 2px; font-style: italic; font-size: 10px;">This is a software generated invoice.</p>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    `;
                }).join('')}
              </body>
            </html>
            `;

            const { uri } = await Print.printToFileAsync({ html });
            const filename = `Invoice_${inv.invoice_number}.pdf`;
            const newUri = uri.substring(0, uri.lastIndexOf('/') + 1) + filename;
            await FileSystem.moveAsync({ from: uri, to: newUri });
            await Sharing.shareAsync(newUri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: filename });

        } catch (error: any) {
            Alert.alert("Error", "Failed to generate invoice PDF: " + error.message);
        }
    };

    const handleImportOpen = async () => {
        const records = await Store.list({});
        setAvailableRecords(records.filter(r => (r.income_amount || 0) > 0));
        setImportModalVisible(true);
    };

    const handleImportRecord = (record: ExpenseRecord) => {
        const amount = record.income_amount || 0;
        const newItem: InvoiceItem = {
            name: record.expense_category,
            description: record.expense_description || record.expense_category,
            amount: amount,
            quantity: 1
        };
        setInvoiceItems([...invoiceItems, newItem]);
        setImportModalVisible(false);
    };

    const renderInvoiceItem = ({ item }: { item: Invoice }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.invoiceNumber}>{item.invoice_number}</Text>
                    <Text style={styles.clientName}>{item.client_name}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.amount}>₹{item.total_amount.toFixed(2)}</Text>
                    <View style={[styles.badge, { backgroundColor: item.status === 'paid' ? '#d1fae5' : item.status === 'sent' ? '#dbeafe' : '#f3f4f6' }]}>
                        <Text style={[styles.badgeText, { color: item.status === 'paid' ? '#065f46' : item.status === 'sent' ? '#1e40af' : '#374151' }]}>
                            {item.status}
                        </Text>
                    </View>
                </View>
            </View>
            <Text style={styles.date}>{item.invoice_date}</Text>
            
            <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => openModal(item)} style={styles.actionBtn}>
                    <Ionicons name="create-outline" size={20} color={theme.colors.subtext} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => generatePdf(item)} style={styles.actionBtn}>
                    <Ionicons name="share-outline" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id!)} style={styles.actionBtn}>
                    <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const totals = calculateTotals();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Invoices</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => Store.setAppMode('finance')} style={styles.toggleButton}>
                        <Ionicons name="swap-horizontal" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]} onPress={() => openModal()}>
                        <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={invoices}
                renderItem={renderInvoiceItem}
                keyExtractor={item => (item.id || 0).toString()}
                contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                ListEmptyComponent={<Text style={styles.emptyText}>No invoices yet. Create one!</Text>}
            />

            <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{currentInvoice.id ? 'Edit Invoice' : 'New Invoice'}</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Ionicons name="close" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>
                    
                    <ScrollView style={styles.modalContent}>
                        <Text style={styles.sectionTitle}>Details</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Invoice Number (e.g. INV-001)"
                            placeholderTextColor={theme.colors.subtext}
                            value={currentInvoice.invoice_number}
                            onChangeText={t => setCurrentInvoice({...currentInvoice, invoice_number: t})}
                        />
                        <View style={styles.row}>
                            <TouchableOpacity style={[styles.input, { flex: 1, marginRight: 8 }]} onPress={() => setShowCalendar('invoice')}>
                                <Text style={{ color: currentInvoice.invoice_date ? theme.colors.text : theme.colors.subtext }}>
                                    {currentInvoice.invoice_date || "Invoice Date"}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.input, { flex: 1 }]} onPress={() => setShowCalendar('due')}>
                                <Text style={{ color: currentInvoice.due_date ? theme.colors.text : theme.colors.subtext }}>
                                    {currentInvoice.due_date || "Due Date"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.row}>
                             <Text style={{ marginRight: 10, alignSelf: 'center' }}>Status:</Text>
                             {(['draft', 'sent', 'paid'] as const).map(s => (
                                 <TouchableOpacity 
                                    key={s} 
                                    onPress={() => setCurrentInvoice({...currentInvoice, status: s})}
                                    style={[
                                        styles.statusChip, 
                                        currentInvoice.status === s && { backgroundColor: theme.colors.primary }
                                    ]}
                                 >
                                     <Text style={[
                                         styles.statusChipText, 
                                         currentInvoice.status === s && styles.statusChipTextActive
                                     ]}>{s}</Text>
                                 </TouchableOpacity>
                             ))}
                        </View>

                        <Text style={styles.sectionTitle}>Client</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Client Name"
                            value={currentInvoice.client_name}
                            onChangeText={t => setCurrentInvoice({...currentInvoice, client_name: t})}
                        />
                        <TextInput 
                            style={styles.input} 
                            placeholder="Address"
                            value={currentInvoice.client_address}
                            onChangeText={t => setCurrentInvoice({...currentInvoice, client_address: t})}
                            multiline
                        />
                        <View style={styles.row}>
                            <TextInput 
                                style={[styles.input, { flex: 1, marginRight: 8 }]} 
                                placeholder="Phone"
                                value={currentInvoice.client_phone}
                                onChangeText={t => setCurrentInvoice({...currentInvoice, client_phone: t})}
                            />
                            <TextInput 
                                style={[styles.input, { flex: 1 }]} 
                                placeholder="GST No (Optional)"
                                value={currentInvoice.client_gst}
                                onChangeText={t => setCurrentInvoice({...currentInvoice, client_gst: t})}
                            />
                        </View>

                        <View style={styles.itemsHeader}>
                            <Text style={styles.sectionTitle}>Items</Text>
                            <TouchableOpacity onPress={handleImportOpen} style={styles.importBtn}>
                                <Ionicons name="download-outline" size={16} color={theme.colors.primary} />
                                <Text style={[styles.importBtnText, { color: theme.colors.primary }]}>Import</Text>
                            </TouchableOpacity>
                        </View>

                        {invoiceItems.map((item, index) => (
                            <View key={index} style={styles.itemRow}>
                                <View style={{ flex: 1 }}>
                                    <TextInput 
                                        style={[styles.input, { marginBottom: 4 }]} 
                                        placeholder="Item Name"
                                        value={item.name || ''}
                                        onChangeText={t => {
                                            const newItems = [...invoiceItems];
                                            newItems[index].name = t;
                                            setInvoiceItems(newItems);
                                        }}
                                    />
                                    <TextInput 
                                        style={[styles.input, { marginBottom: 4 }]} 
                                        placeholder="Description"
                                        value={item.description}
                                        onChangeText={t => {
                                            const newItems = [...invoiceItems];
                                            newItems[index].description = t;
                                            setInvoiceItems(newItems);
                                        }}
                                    />
                                    <View style={{ flexDirection: 'row' }}>
                                        <TextInput 
                                            style={[styles.input, { flex: 1, marginRight: 4 }]} 
                                            placeholder="Qty"
                                            keyboardType="numeric"
                                            value={String(item.quantity)}
                                            onChangeText={t => {
                                                const newItems = [...invoiceItems];
                                                newItems[index].quantity = Number(t);
                                                setInvoiceItems(newItems);
                                            }}
                                        />
                                        <TextInput 
                                            style={[styles.input, { flex: 1 }]} 
                                            placeholder="Price"
                                            keyboardType="numeric"
                                            value={String(item.amount)}
                                            onChangeText={t => {
                                                const newItems = [...invoiceItems];
                                                newItems[index].amount = Number(t);
                                                setInvoiceItems(newItems);
                                            }}
                                        />
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => {
                                    const newItems = [...invoiceItems];
                                    newItems.splice(index, 1);
                                    setInvoiceItems(newItems);
                                }} style={{ padding: 8 }}>
                                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        ))}

                        <TouchableOpacity 
                            style={[styles.addItemBtn, { borderColor: theme.colors.primary }]} 
                            onPress={() => setInvoiceItems([...invoiceItems, { name: '', description: '', quantity: 1, amount: 0 }])}
                        >
                            <Text style={[styles.addItemBtnText, { color: theme.colors.primary }]}>+ Add Item</Text>
                        </TouchableOpacity>

                        <View style={styles.summarySection}>
                            <View style={styles.summaryRow}>
                                <Text>Subtotal</Text>
                                <Text style={styles.summaryValue}>₹{totals.sub.toFixed(2)}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={{ alignSelf: 'center' }}>Discount (₹)</Text>
                                <TextInput 
                                    style={[styles.input, { width: 100, textAlign: 'right', marginBottom: 0, paddingVertical: 4 }]}
                                    keyboardType="numeric"
                                    value={String(currentInvoice.discount || 0)}
                                    onChangeText={t => setCurrentInvoice({...currentInvoice, discount: Number(t)})}
                                />
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={{ alignSelf: 'center' }}>GST (%)</Text>
                                <TextInput 
                                    style={[styles.input, { width: 100, textAlign: 'right', marginBottom: 0, paddingVertical: 4 }]}
                                    keyboardType="numeric"
                                    value={String(currentInvoice.tax_rate || 0)}
                                    onChangeText={t => setCurrentInvoice({...currentInvoice, tax_rate: Number(t)})}
                                />
                            </View>
                            <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 8, marginTop: 8 }]}>
                                <Text style={styles.totalLabel}>Total Amount</Text>
                                <Text style={[styles.totalValue, { color: theme.colors.primary }]}>₹{totals.total.toFixed(2)}</Text>
                            </View>
                        </View>
                        
                        <View style={{ height: 100 }} />
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]} onPress={handleSave}>
                            <Text style={styles.saveBtnText}>Save Invoice</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                
                <CalendarModal 
                    visible={!!showCalendar} 
                    onClose={() => setShowCalendar(null)}
                    initialDate={showCalendar === 'invoice' ? currentInvoice.invoice_date : currentInvoice.due_date}
                    onSelect={(date) => {
                        if (showCalendar === 'invoice') setCurrentInvoice({...currentInvoice, invoice_date: date});
                        else if (showCalendar === 'due') setCurrentInvoice({...currentInvoice, due_date: date});
                    }}
                />
            </Modal>

            {/* Import Modal */}
            <Modal visible={importModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.smallModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Import Income</Text>
                            <TouchableOpacity onPress={() => setImportModalVisible(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={availableRecords}
                            keyExtractor={item => (item.id || 0).toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.recordItem} onPress={() => handleImportRecord(item)}>
                                    <View>
                                        <Text style={styles.recordDesc}>{item.expense_description || item.expense_category}</Text>
                                        <Text style={styles.recordDate}>{item.expense_date}</Text>
                                    </View>
                                    <Text style={styles.recordAmount}>+₹{item.income_amount?.toFixed(2)}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const getStyles = (theme: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: 20,
        backgroundColor: theme.colors.card,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: theme.colors.text,
        letterSpacing: -0.5,
    },
    addButton: {
        backgroundColor: theme.colors.primary,
        padding: 10,
        borderRadius: 20,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    toggleButton: {
        marginRight: 8,
        backgroundColor: theme.mode === 'dark' ? theme.colors.input : '#EEF2FF',
        padding: 8,
        borderRadius: 999,
    },
    emptyText: { textAlign: 'center', marginTop: 50, color: theme.colors.subtext },
    card: {
        backgroundColor: theme.colors.card, borderRadius: 12, padding: 16, marginBottom: 12,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    invoiceNumber: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
    clientName: { fontSize: 14, color: theme.colors.subtext },
    amount: { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary },
    date: { fontSize: 12, color: theme.colors.subtext, marginBottom: 12 },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginTop: 4 },
    badgeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    cardActions: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12 },
    actionBtn: { marginLeft: 16, padding: 4 },
    
    modalContainer: { flex: 1, backgroundColor: theme.colors.card },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
    modalContent: { flex: 1, padding: 16 },
    modalFooter: { padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border },
    
    sectionTitle: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text, marginBottom: 12, marginTop: 8, textTransform: 'uppercase' },
    input: { backgroundColor: theme.mode === 'dark' ? theme.colors.background : '#f9fafb', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16, color: theme.colors.text },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    statusChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.colors.background, marginRight: 8 },
    statusChipActive: { backgroundColor: theme.colors.primary },
    statusChipText: { color: theme.colors.text, fontSize: 12 },
    statusChipTextActive: { color: '#fff', fontWeight: 'bold' },
    
    itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 12 },
    importBtn: { flexDirection: 'row', alignItems: 'center', padding: 8 },
    importBtnText: { color: theme.colors.primary, fontWeight: 'bold', marginLeft: 4 },
    
    itemRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: 16 },
    addItemBtn: { padding: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 8, borderStyle: 'dashed', marginTop: 8 },
    addItemBtnText: { color: theme.colors.primary, fontWeight: 'bold' },
    
    summarySection: { marginTop: 24, padding: 16, backgroundColor: theme.mode === 'dark' ? theme.colors.background : '#f9fafb', borderRadius: 8 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' },
    summaryValue: { fontWeight: 'bold', color: theme.colors.text },
    totalLabel: { fontSize: 16, color: theme.colors.text, fontWeight: 'bold' },
    totalValue: { fontSize: 24, fontWeight: 'bold', color: theme.colors.primary },
    
    saveBtn: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    smallModal: { backgroundColor: theme.colors.card, borderRadius: 12, maxHeight: '80%', padding: 16 },
    recordItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    recordDesc: { fontWeight: 'bold', color: theme.colors.text },
    recordDate: { fontSize: 12, color: theme.colors.subtext },
    recordAmount: { color: theme.colors.success, fontWeight: 'bold' },
    
    // Calendar Styles
    calendarContainer: { backgroundColor: theme.colors.card, borderRadius: 12, padding: 16, width: '100%', maxWidth: 350, alignSelf: 'center' },
    calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    calendarTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
    weekDays: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
    weekDayText: { color: theme.colors.subtext, width: 30, textAlign: 'center' },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calendarDay: { width: '14.28%', height: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    calendarDayText: { color: theme.colors.text },
    calendarDaySelected: { backgroundColor: theme.colors.primary, borderRadius: 20 },
    calendarDayTextSelected: { color: '#fff', fontWeight: 'bold' },
    calendarDayToday: { borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 20 },
    closeBtn: { marginTop: 16, padding: 12, alignItems: 'center' },
    closeBtnText: { color: theme.colors.subtext }
});
