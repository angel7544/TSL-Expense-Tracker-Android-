import React, { useState, useEffect, useContext } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, Modal, ScrollView, 
  StyleSheet, Alert, Platform, 
  KeyboardAvoidingView
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { Store, ExpenseRecord } from "../data/Store";
import * as FileSystem from "expo-file-system";
import { UIContext } from "../context/UIContext";

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
    const { theme } = useContext(UIContext);

    return (
        <View style={{ marginBottom: 20, zIndex: zIndex }}>
            <View style={{ 
                borderWidth: 1.5, 
                borderColor: isFocused ? theme.colors.primary : theme.colors.border, 
                borderRadius: 8, 
                height: 56, 
                justifyContent: 'center',
                backgroundColor: theme.colors.input,
                position: 'relative'
            }}>
                <View style={{ 
                    position: 'absolute', 
                    top: -10, 
                    left: 12, 
                    backgroundColor: theme.colors.card, 
                    paddingHorizontal: 4,
                    zIndex: 1
                }}>
                    <Text style={{ fontSize: 12, color: isFocused ? theme.colors.primary : theme.colors.subtext, fontWeight: '500' }}>{label}</Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
                    <TextInput 
                        value={value}
                        onChangeText={onChangeText}
                        onFocus={() => { setIsFocused(true); onFocus(); }}
                        onBlur={() => { setIsFocused(false); onBlur(); }}
                        style={{ flex: 1, fontSize: 16, color: theme.colors.text }}
                        placeholderTextColor={theme.colors.placeholder}
                    />
                    <TouchableOpacity onPress={onFocus}>
                        <Ionicons name="caret-down-outline" size={20} color={theme.colors.subtext} />
                    </TouchableOpacity>
                </View>
            </View>
            
            {showSuggestions && suggestions.length > 0 && (
                <View style={{ 
                    position: 'absolute', 
                    top: 54, 
                    left: 0, 
                    right: 0, 
                    backgroundColor: theme.colors.card, 
                    borderWidth: 1, 
                    borderColor: theme.colors.border,
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
                    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                        {suggestions.map((item, i) => (
                            <TouchableOpacity key={i} onPress={() => onSelect(item)} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                                <Text style={{fontSize: 14, color: theme.colors.text}}>{item}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );
};

export const AddRecordModal = ({ visible, onClose, onSave, record }: AddRecordModalProps) => {
  const { theme } = useContext(UIContext);
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
        if (record) {
            setForm({
                expense_date: record.expense_date,
                expense_description: record.expense_description,
                expense_category: record.expense_category,
                merchant_name: record.merchant_name,
                paid_through: record.paid_through,
                income_amount: String(record.income_amount),
                expense_amount: String(record.expense_amount)
            });
        } else {
            setForm({
                expense_date: new Date().toISOString().slice(0, 10),
                expense_description: "",
                expense_category: "",
                merchant_name: "",
                paid_through: "",
                income_amount: "0",
                expense_amount: "0"
            });
        }
        loadSuggestions();
    }
  }, [visible, record]);

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

         // Save directly to application sandbox (internal storage) without asking for folder
         const uri = FileSystem.documentDirectory + filename;
         await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
         
         Alert.alert("Backup Created", "File saved internally to application storage.\n" + filename);
     } catch (e: any) {
         Alert.alert("Error", e.message);
     }
  };

  const save = async () => {
    const data = {
        ...form,
        income_amount: Number(form.income_amount),
        expense_amount: Number(form.expense_amount)
    };

    if (record && record.id) {
        await Store.update({ ...data, id: record.id });
    } else {
        await Store.add(data);
    }
    
    // Reset form is handled by useEffect on next open or explicit reset if needed
    // But since we close modal, next open will reset or load new record
    
    onSave(); 
    
    if (!record) { // Only prompt backup on new records
        Alert.alert(
            "Record Saved",
            "Do you want to backup your data to storage now?",
            [
                { text: "No", style: "cancel", onPress: onClose },
                { text: "Yes, Backup", onPress: () => { backupToStorage(); onClose(); } }
            ]
        );
    } else {
        onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 16 }}
      >
        <View style={{ backgroundColor: theme.colors.card, borderRadius: 12, maxHeight: "90%", width: "100%", maxWidth: 600, alignSelf: "center" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderColor: theme.colors.border }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: theme.colors.text }}>{record ? "Edit Record" : "Add Record"}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, { color: theme.colors.subtext }]}>Date</Text>
            <TextInput 
                value={form.expense_date} 
                onChangeText={t => setForm({ ...form, expense_date: t })} 
                style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.input }]} 
                placeholderTextColor={theme.colors.placeholder}
            />
            
            <Text style={[styles.label, { color: theme.colors.subtext }]}>Description</Text>
            <TextInput 
                value={form.expense_description} 
                onChangeText={t => setForm({ ...form, expense_description: t })} 
                style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.input }]} 
                placeholderTextColor={theme.colors.placeholder}
            />
            
            <DropdownInput 
                label="Category"
                value={form.expense_category}
                onChangeText={t => setForm({ ...form, expense_category: t })}
                onFocus={() => setShowCatSuggestions(true)}
                onBlur={() => setTimeout(() => setShowCatSuggestions(false), 500)}
                suggestions={suggestions.categories.filter(c => c.toLowerCase().includes(form.expense_category.toLowerCase()))}
                onSelect={c => {
                    setForm({ ...form, expense_category: c });
                    setShowCatSuggestions(false);
                }}
                showSuggestions={showCatSuggestions}
                zIndex={30}
            />
            
            <DropdownInput 
                label="Merchant"
                value={form.merchant_name}
                onChangeText={t => setForm({ ...form, merchant_name: t })}
                onFocus={() => setShowMerchantSuggestions(true)}
                onBlur={() => setTimeout(() => setShowMerchantSuggestions(false), 500)}
                suggestions={suggestions.merchants.filter(c => c.toLowerCase().includes(form.merchant_name.toLowerCase()))}
                onSelect={c => {
                    setForm({ ...form, merchant_name: c });
                    setShowMerchantSuggestions(false);
                }}
                showSuggestions={showMerchantSuggestions}
                zIndex={20}
            />
            
            <DropdownInput 
                label="Paid Through"
                value={form.paid_through}
                onChangeText={t => setForm({ ...form, paid_through: t })}
                onFocus={() => setShowPaidSuggestions(true)}
                onBlur={() => setTimeout(() => setShowPaidSuggestions(false), 500)}
                suggestions={suggestions.paidThrough.filter(c => c.toLowerCase().includes(form.paid_through.toLowerCase()))}
                onSelect={c => {
                    setForm({ ...form, paid_through: c });
                    setShowPaidSuggestions(false);
                }}
                showSuggestions={showPaidSuggestions}
                zIndex={10}
            />
            
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.label, { color: theme.colors.subtext }]}>Income</Text>
                  <TextInput 
                    value={form.income_amount} 
                    onChangeText={t => setForm({ ...form, income_amount: t })} 
                    keyboardType="numeric" 
                    style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.input }]} 
                    placeholderTextColor={theme.colors.placeholder}
                  />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.label, { color: theme.colors.subtext }]}>Expense</Text>
                  <TextInput 
                    value={form.expense_amount} 
                    onChangeText={t => setForm({ ...form, expense_amount: t })} 
                    keyboardType="numeric" 
                    style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.input }]} 
                    placeholderTextColor={theme.colors.placeholder}
                  />
              </View>
            </View>

            <TouchableOpacity onPress={save} style={{ backgroundColor: theme.colors.primary, padding: 12, borderRadius: 6, marginTop: 16 }}>
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
