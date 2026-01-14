import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, StyleSheet } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { Store, ExpenseRecord, FilterOptions } from "../data/Store";
import { AddRecordModal } from "../components/AddRecordModal";
import { FilterModal } from "../components/FilterModal";
import { AppHeader } from "../components/AppHeader";
import { useIsFocused } from "@react-navigation/native";

export default function ListScreen() {
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
    <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      <AppHeader title="All Records" subtitle="All Records" />
      <View style={{ padding: 16, flex: 1 }}>
      <View style={{ flexDirection: "row", marginBottom: 12, alignItems: "center" }}>
        <TextInput
          value={desc}
          onChangeText={setDesc}
          placeholder="Search description"
          style={{ flex: 1, backgroundColor: "#fff", padding: 10, borderRadius: 6, marginRight: 8, borderWidth: 1, borderColor: "#ddd" }}
        />
        <TouchableOpacity onPress={() => setFilterVisible(true)} style={{ backgroundColor: activeFilterCount > 0 ? "#007bff" : "#fff", width: 44, height: 44, borderRadius: 8, justifyContent: "center", alignItems: "center", marginRight: 8, borderWidth: 1, borderColor: activeFilterCount > 0 ? "#007bff" : "#ddd" }}>
           <Ionicons name="filter" size={20} color={activeFilterCount > 0 ? "#fff" : "#666"} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setSelectedRecord(null); setModalVisible(true); }} style={{ backgroundColor: "#007bff", width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" }}>
           <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => item.id ? String(item.id) : String(index)}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: "#fff", padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: "#eee" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
               <Text style={{ fontSize: 12, color: "#666" }}>{item.expense_date} • {item.expense_category}</Text>
               <View style={{ flexDirection: 'row' }}>
                   <TouchableOpacity onPress={() => { setSelectedRecord(item); setModalVisible(true); }} style={{ marginRight: 12 }}>
                     <Ionicons name="pencil-outline" size={18} color="#007bff" />
                   </TouchableOpacity>
                   <TouchableOpacity onPress={() => remove(item.id!)}>
                     <Ionicons name="trash-outline" size={18} color="#dc3545" />
                   </TouchableOpacity>
               </View>
            </View>
            <Text style={{ fontSize: 16, fontWeight: "500", marginVertical: 4 }}>{item.expense_description}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                {Number(item.income_amount) > 0 ? <Text style={{ color: "#28a745" }}>Inc: {Number(item.income_amount).toFixed(2)}</Text> : <View/>}
                {Number(item.expense_amount) > 0 ? <Text style={{ color: "#dc3545" }}>Exp: {Number(item.expense_amount).toFixed(2)}</Text> : <View/>}
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

const styles = StyleSheet.create({
  label: { fontSize: 12, color: "#666", marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#ddd", padding: 10, borderRadius: 6, marginBottom: 12, fontSize: 16 }
});
