import React, { useState, useEffect, useContext } from "react";
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { Store, FilterOptions } from "../data/Store";
import { UIContext } from "../context/UIContext";

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

export const FilterModal = ({ visible, onClose, onApply, currentFilters }: FilterModalProps) => {
  const { theme } = useContext(UIContext);
  const [filters, setFilters] = useState<FilterOptions>({ ...currentFilters });
  const [options, setOptions] = useState<{years: string[], categories: string[], merchants: string[]}>({
      years: [], categories: [], merchants: []
  });

  const months = [
      "All", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"
  ];

  useEffect(() => {
    if (visible) {
        setFilters({ ...currentFilters });
        Store.getFilterOptions().then(opts => {
            setOptions({
                years: ["All", ...opts.years],
                categories: ["All", ...opts.categories],
                merchants: ["All", ...opts.merchants]
            });
        });
    }
  }, [visible]);

  const apply = () => {
      onApply(filters);
      onClose();
  };

  const reset = () => {
      const empty = { year: "All", month: "All", category: "All", merchant: "All" };
      setFilters(empty);
      onApply(empty); 
  };

  const Section = ({ title, items, selected, onSelect }: { title: string, items: string[], selected?: string, onSelect: (v: string) => void }) => (
      <View style={{ marginBottom: 20 }}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap" }}>
              {items.map((item, i) => {
                  const isSel = (item === selected) || (!selected && item === "All");
                  return (
                    <TouchableOpacity 
                        key={i} 
                        onPress={() => onSelect(item)}
                        style={[
                            styles.chip, 
                            { 
                                backgroundColor: isSel ? theme.colors.lighter : theme.colors.background,
                                borderColor: isSel ? theme.colors.primary : 'transparent'
                            }
                        ]}
                    >
                        <Text style={[
                            styles.chipText, 
                            { 
                                color: isSel ? theme.colors.primary : theme.colors.subtext,
                                fontWeight: isSel ? "600" : "400"
                            }
                        ]}>{item}</Text>
                    </TouchableOpacity>
                  );
              })}
          </ScrollView>
      </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
          <View style={[styles.header, { borderColor: theme.colors.border }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Filter Records</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
            <Section 
                title="Year" 
                items={options.years} 
                selected={filters.year} 
                onSelect={v => setFilters({ ...filters, year: v })} 
            />
             <Section 
                title="Month" 
                items={months} 
                selected={filters.month} 
                onSelect={v => setFilters({ ...filters, month: v })} 
            />
             <Section 
                title="Category" 
                items={options.categories} 
                selected={filters.category} 
                onSelect={v => setFilters({ ...filters, category: v })} 
            />
             <Section 
                title="Merchant" 
                items={options.merchants} 
                selected={filters.merchant} 
                onSelect={v => setFilters({ ...filters, merchant: v })} 
            />
            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={[styles.footer, { borderColor: theme.colors.border }]}>
              <TouchableOpacity onPress={reset} style={[styles.button, { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }]}>
                  <Text style={{ color: theme.colors.text, fontWeight: "600" }}>Reset</Text>
              </TouchableOpacity>
              <View style={{ width: 12 }} />
              <TouchableOpacity onPress={apply} style={[styles.button, { backgroundColor: theme.colors.primary }]}>
                  <Text style={{ color: "#fff", fontWeight: "600" }}>Apply Filters</Text>
              </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, height: "80%" },
  header: { flexDirection: "row", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderColor: "#eee", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "600" },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: "#f1f3f5", marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: "transparent" },
  chipSelected: { backgroundColor: "#e7f5ff", borderColor: "#007bff" },
  chipText: { fontSize: 13, color: "#495057" },
  chipTextSelected: { color: "#007bff", fontWeight: "600" },
  footer: { flexDirection: "row", padding: 16, borderTopWidth: 1, borderColor: "#eee" },
  button: { flex: 1, padding: 14, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  buttonOutline: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd" },
  buttonPrimary: { backgroundColor: "#007bff" }
});
