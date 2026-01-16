import React, { useState, useEffect, useContext, useMemo } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, StyleSheet } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { Store, ExpenseRecord, FilterOptions } from "../data/Store";
import { AddRecordModal } from "../components/AddRecordModal";
import { FilterModal } from "../components/FilterModal";
import { AppHeader } from "../components/AppHeader";
import { useIsFocused } from "@react-navigation/native";
import { UIContext } from "../context/UIContext";

export default function ListScreen() {
  const { theme } = useContext(UIContext);
  const styles = useMemo(() => getStyles(theme), [theme]);
  const isFocused = useIsFocused();
  const [desc, setDesc] = useState("");
  const [filters, setFilters] = useState<FilterOptions>({});
  const [data, setData] = useState<ExpenseRecord[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ExpenseRecord | null>(null);

  useEffect(() => {
    if (isFocused) {
        Store.list({ desc, ...filters }).then(setData);
    }
  }, [desc, filters, isFocused]);

  const remove = async (id: number) => {
    await Store.remove(id);
    Store.list({ desc, ...filters }).then(setData);
  };

  const activeFilterCount = [filters.year, filters.month, filters.category, filters.merchant].filter(x => x && x !== "All").length;

  return (
    <View style={styles.container}>
      <AppHeader title="All Records" subtitle="All Records" />
      <View style={styles.content}>
      <View style={styles.searchRow}>
        <TextInput
          value={desc}
          onChangeText={setDesc}
          placeholder="Search description"
          placeholderTextColor={theme.colors.placeholder}
          style={styles.searchInput}
        />
        <TouchableOpacity onPress={() => setFilterVisible(true)} style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}>
           <Ionicons name="filter" size={20} color={activeFilterCount > 0 ? "#fff" : theme.colors.subtext} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setSelectedRecord(null); setModalVisible(true); }} style={styles.addButton}>
           <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => item.id ? String(item.id) : String(index)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
               <Text style={styles.dateText}>{item.expense_date} • {item.expense_category}</Text>
               <View style={{ flexDirection: 'row' }}>
                   <TouchableOpacity onPress={() => { setSelectedRecord(item); setModalVisible(true); }} style={{ marginRight: 12 }}>
                     <Ionicons name="pencil-outline" size={18} color={theme.colors.primary} />
                   </TouchableOpacity>
                   <TouchableOpacity onPress={() => remove(item.id!)}>
                     <Ionicons name="trash-outline" size={18} color={theme.colors.danger || "#dc3545"} />
                   </TouchableOpacity>
               </View>
            </View>
            <Text style={styles.amountText}>{item.expense_description}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                {Number(item.income_amount) > 0 ? <Text style={styles.incomeText}>Inc: {Number(item.income_amount).toFixed(2)}</Text> : <View/>}
                {Number(item.expense_amount) > 0 ? <Text style={styles.expenseText}>Exp: {Number(item.expense_amount).toFixed(2)}</Text> : <View/>}
            </View>
          </View>
        )}
      />

      <FilterModal 
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={setFilters}
        currentFilters={filters}
      />
      </View>

      <AddRecordModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        onSave={() => { 
            setModalVisible(false); 
            Store.list({ desc, ...filters }).then(setData); 
        }}
        record={selectedRecord}
      />
    </View>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, flex: 1 },
  searchRow: { flexDirection: "row", marginBottom: 12, alignItems: "center" },
  searchInput: { 
      flex: 1, 
      backgroundColor: theme.colors.card, 
      padding: 10, 
      borderRadius: 12, 
      marginRight: 8, 
      borderWidth: 1, 
      borderColor: theme.colors.border,
      color: theme.colors.text
  },
  filterButton: { 
      backgroundColor: theme.colors.card, 
      width: 44, height: 44, borderRadius: 12, 
      justifyContent: "center", alignItems: "center", marginRight: 8, 
      borderWidth: 1, borderColor: theme.colors.border 
  },
  filterButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary
  },
  addButton: { 
      backgroundColor: theme.colors.primary, 
      width: 44, height: 44, borderRadius: 22, 
      justifyContent: "center", alignItems: "center",
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4
  },
  card: { 
      backgroundColor: theme.colors.card, 
      padding: 16, borderRadius: 16, marginBottom: 12, 
      borderWidth: 1, borderColor: theme.colors.border,
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2
  },
  dateText: { fontSize: 12, color: theme.colors.subtext },
  amountText: { fontSize: 16, fontWeight: "600", marginVertical: 8, color: theme.colors.text },
  incomeText: { color: theme.colors.success || '#10B981', fontWeight: "500" },
  expenseText: { color: theme.colors.danger || '#EF4444', fontWeight: "500" },
  label: { fontSize: 12, color: theme.colors.subtext, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: theme.colors.border, padding: 10, borderRadius: 6, marginBottom: 12, fontSize: 16, color: theme.colors.text, backgroundColor: theme.colors.card }
});
