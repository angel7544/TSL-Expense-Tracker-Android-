import React, { useState, useEffect } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, Modal, ScrollView, 
  StyleSheet, Alert, Platform, 
  KeyboardAvoidingView
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { Store, ExpenseRecord } from "../data/Store";
import * as FileSystem from "expo-file-system";

interface AddRecordModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  record?: ExpenseRecord | null;
}

const DropdownInput = ({ 
    label, 
    value, 
    onChangeText, 
    onFocus, 
    onBlur, 
    suggestions, 
    onSelect, 
    showSuggestions, 
    zIndex 
}: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    onFocus: () => void;
    onBlur: () => void;
    suggestions: string[];
    onSelect: (item: string) => void;
    showSuggestions: boolean;
    zIndex: number;
}) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={{ marginBottom: 20, zIndex: zIndex }}>
            <View style={{ 
                borderWidth: 1.5, 
                borderColor: isFocused ? '#007bff' : '#ddd', 
                borderRadius: 8, 
                height: 56, 
                justifyContent: 'center',
                backgroundColor: '#fff',
                position: 'relative'
            }}>
                <View style={{ 
                    position: 'absolute', 
                    top: -10, 
                    left: 12, 
                    backgroundColor: '#fff', 
                    paddingHorizontal: 4,
                    zIndex: 1
                }}>
                    <Text style={{ fontSize: 12, color: isFocused ? '#007bff' : '#666', fontWeight: '500' }}>{label}</Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
                    <TextInput 
                        value={value}
                        onChangeText={onChangeText}
                        onFocus={() => { setIsFocused(true); onFocus(); }}
                        onBlur={() => { setIsFocused(false); onBlur(); }}
                        style={{ flex: 1, fontSize: 16, color: '#333' }}
                    />
                    <TouchableOpacity onPress={onFocus}>
                        <Ionicons name="caret-down-outline" size={20} color="#666" />
                    </TouchableOpacity>
                </View>
            </View>
            
            {showSuggestions && suggestions.length > 0 && (
                <View style={{ 
                    position: 'absolute', 
                    top: 54, 
                    left: 0, 
                    right: 0, 
                    backgroundColor: 'white', 
                    borderWidth: 1, 
                    borderColor: '#ddd',
                    borderBottomLeftRadius: 8,
                    borderBottomRightRadius: 8,
                    elevation: 5,
                    zIndex: 1000,
                    maxHeight: 200,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                }}>
                    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                        {suggestions.map((item, i) => (
                            <TouchableOpacity key={i} onPress={() => onSelect(item)} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
                                <Text style={{fontSize: 14, color: '#333'}}>{item}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );
};

export const AddRecordModal = ({ visible, onClose, onSave }: AddRecordModalProps) => {
  const [form, setForm] = useState({
    expense_date: new Date().toISOString().slice(0, 10),
    expense_description: "",
    expense_category: "",
    merchant_name: "",
    paid_through: "",
    income_amount: "0",
    expense_amount: "0"
  });

  const [suggestions, setSuggestions] = useState<{categories: string[], paidThrough: string[], merchants: string[]}>({ categories: [], paidThrough: [], merchants: [] });
  const [showCatSuggestions, setShowCatSuggestions] = useState(false);
  const [showPaidSuggestions, setShowPaidSuggestions] = useState(false);
  const [showMerchantSuggestions, setShowMerchantSuggestions] = useState(false);

  useEffect(() => {
    if (visible) {
        loadSuggestions();
    }
  }, [visible]);

  const loadSuggestions = async () => {
    const cats = await Store.getUniqueValues("expense_category");
    const paid = await Store.getUniqueValues("paid_through");
    const merchants = await Store.getUniqueValues("merchant_name");
    setSuggestions({ categories: cats, paidThrough: paid, merchants });
  };

  const backupToStorage = async () => {
     try {
         const records = await Store.list({});
         const csv = Store.exportCSV(records);
         
         const filename = `backup_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;

         if (Platform.OS === "android") {
             try {
                 const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                 if (permissions.granted) {
                     const uri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, filename, "text/csv");
                     await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
                     Alert.alert("Backup Success", "Saved to " + uri);
                 }
             } catch (err) {
                 Alert.alert("Backup Error", "Could not save file");
             }
         } else {
             const uri = FileSystem.documentDirectory + filename;
             await FileSystem.writeAsStringAsync(uri, csv);
             Alert.alert("Backup Created", "File saved locally (use Export in Settings to share)");
         }
     } catch (e: any) {
         Alert.alert("Error", e.message);
     }
  };

  const save = async () => {
    await Store.add({
        ...form,
        income_amount: Number(form.income_amount),
        expense_amount: Number(form.expense_amount)
    });
    
    setForm({
        expense_date: new Date().toISOString().slice(0, 10),
        expense_description: "",
        expense_category: "",
        merchant_name: "",
        paid_through: "",
        income_amount: "0",
        expense_amount: "0"
    });

    onSave(); 
    
    Alert.alert(
        "Record Saved",
        "Do you want to backup your data to storage now?",
        [
            { text: "No", style: "cancel", onPress: onClose },
            { text: "Yes, Backup", onPress: () => { backupToStorage(); onClose(); } }
        ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 16 }}
      >
        <View style={{ backgroundColor: "#fff", borderRadius: 12, maxHeight: "90%", width: "100%", maxWidth: 600, alignSelf: "center" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderColor: "#eee" }}>
            <Text style={{ fontSize: 18, fontWeight: "600" }}>Add Record</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Date</Text>
            <TextInput value={form.expense_date} onChangeText={t => setForm({ ...form, expense_date: t })} style={styles.input} />
            
            <Text style={styles.label}>Description</Text>
            <TextInput value={form.expense_description} onChangeText={t => setForm({ ...form, expense_description: t })} style={styles.input} />
            
            <DropdownInput 
                label="Category"
                value={form.expense_category}
                onChangeText={t => setForm({ ...form, expense_category: t })}
                onFocus={() => setShowCatSuggestions(true)}
                onBlur={() => setTimeout(() => setShowCatSuggestions(false), 200)}
                suggestions={suggestions.categories.filter(c => c.toLowerCase().includes(form.expense_category.toLowerCase()))}
                onSelect={c => setForm({ ...form, expense_category: c })}
                showSuggestions={showCatSuggestions}
                zIndex={30}
            />
            
            <DropdownInput 
                label="Merchant"
                value={form.merchant_name}
                onChangeText={t => setForm({ ...form, merchant_name: t })}
                onFocus={() => setShowMerchantSuggestions(true)}
                onBlur={() => setTimeout(() => setShowMerchantSuggestions(false), 200)}
                suggestions={suggestions.merchants.filter(c => c.toLowerCase().includes(form.merchant_name.toLowerCase()))}
                onSelect={c => setForm({ ...form, merchant_name: c })}
                showSuggestions={showMerchantSuggestions}
                zIndex={20}
            />
            
            <DropdownInput 
                label="Paid Through"
                value={form.paid_through}
                onChangeText={t => setForm({ ...form, paid_through: t })}
                onFocus={() => setShowPaidSuggestions(true)}
                onBlur={() => setTimeout(() => setShowPaidSuggestions(false), 200)}
                suggestions={suggestions.paidThrough.filter(c => c.toLowerCase().includes(form.paid_through.toLowerCase()))}
                onSelect={c => setForm({ ...form, paid_through: c })}
                showSuggestions={showPaidSuggestions}
                zIndex={10}
            />
            
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Income</Text>
                  <TextInput value={form.income_amount} onChangeText={t => setForm({ ...form, income_amount: t })} keyboardType="numeric" style={styles.input} />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.label}>Expense</Text>
                  <TextInput value={form.expense_amount} onChangeText={t => setForm({ ...form, expense_amount: t })} keyboardType="numeric" style={styles.input} />
              </View>
            </View>

            <TouchableOpacity onPress={save} style={{ backgroundColor: "#007bff", padding: 12, borderRadius: 6, marginTop: 16 }}>
              <Text style={{ color: "#fff", textAlign: "center", fontSize: 16, fontWeight: "600" }}>Save Record</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  label: { fontSize: 12, color: "#666", marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#ddd", padding: 10, borderRadius: 6, marginBottom: 12, fontSize: 16 },
});
