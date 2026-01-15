import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Store, Budget, BudgetSplit } from '../../data/Store';

export const BudgetsScreen = () => {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [actuals, setActuals] = useState<Record<string, number>>({});
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [month, setMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
    
    const [modalVisible, setModalVisible] = useState(false);
    const [currentBudget, setCurrentBudget] = useState<Partial<Budget>>({});
    const [categories, setCategories] = useState<string[]>([]);
    const [splitsByBudget, setSplitsByBudget] = useState<Record<number, BudgetSplit[]>>({});
    const [currentSplits, setCurrentSplits] = useState<Array<Partial<BudgetSplit>>>([]);

    useEffect(() => {
        loadData();
        const unsub = Store.subscribe(loadData);
        return unsub;
    }, [year, month]);

    const loadData = async () => {
        const [budgetsData, cats, totals] = await Promise.all([
            Store.getBudgets(year, month),
            Store.getUniqueValues('expense_category'),
            Store.getCategoryTotals(year, month, 'expense')
        ]);
        
        setBudgets(budgetsData);
        setCategories(cats);
        
        const acts: Record<string, number> = {};
        totals.forEach(t => acts[t.category] = t.amount);
        setActuals(acts);

        const withIds = budgetsData.filter(b => !!b.id) as Required<Budget>[];
        const splitsLists = await Promise.all(withIds.map(b => Store.getBudgetSplits(b.id)));
        const map: Record<number, BudgetSplit[]> = {};
        withIds.forEach((b, i) => { map[b.id] = splitsLists[i] || []; });
        setSplitsByBudget(map);
    };

    const handleSave = async () => {
        if (!currentBudget.category || !currentBudget.amount) {
            Alert.alert("Error", "Category and Amount are required");
            return;
        }

        await Store.saveBudget({
            id: currentBudget.id,
            category: currentBudget.category,
            amount: Number(currentBudget.amount),
            period: 'monthly',
            month: month,
            year: year
        });
        
        let budId = currentBudget.id;
        if (!budId) {
            const updated = await Store.getBudgets(year, month);
            const match = updated
                .filter(b => b.category === currentBudget.category && Number(b.amount) === Number(currentBudget.amount) && b.period === 'monthly' && b.month === month)
                .sort((a, b) => (b.id || 0) - (a.id || 0))[0];
            budId = match?.id;
        }

        if (budId) {
            const payload = currentSplits
                .filter(s => (s.name || '').trim().length > 0 && Number(s.amount) > 0)
                .map(s => ({ name: String(s.name), amount: Number(s.amount) }));
            await Store.replaceBudgetSplits(budId, payload);
        }

        setModalVisible(false);
        setCurrentBudget({});
        setCurrentSplits([]);
    };

    const handleDelete = async (id: number) => {
        Alert.alert("Delete Budget", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => Store.deleteBudget(id) }
        ]);
    };

    const getProgressColor = (percent: number) => {
        if (percent >= 100) return '#EF4444'; // Red
        if (percent >= 80) return '#F59E0B'; // Orange
        return '#10B981'; // Green
    };

    const renderItem = ({ item }: { item: Budget }) => {
        const spent = actuals[item.category] || 0;
        const percent = (spent / item.amount) * 100;
        const color = getProgressColor(percent);
        const splits = item.id ? (splitsByBudget[item.id] || []) : [];
        const splitsTotal = splits.reduce((s, x) => s + Number(x.amount || 0), 0);

        return (
            <TouchableOpacity 
                style={styles.card} 
                onPress={async () => { 
                    setCurrentBudget(item); 
                    const loaded = item.id ? await Store.getBudgetSplits(item.id) : [];
                    setCurrentSplits(loaded.map(s => ({ id: s.id, name: s.name, amount: s.amount })));
                    setModalVisible(true); 
                }}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.categoryContainer}>
                        <View style={[styles.categoryIcon, { backgroundColor: color + '20' }]}>
                            <Ionicons name="pricetag" size={16} color={color} />
                        </View>
                        <Text style={styles.categoryName}>{item.category}</Text>
                    </View>
                    <Text style={styles.amountText}>₹{spent.toFixed(0)} / ₹{item.amount}</Text>
                </View>
                
                <View style={styles.progressBarBg}>
                    <View 
                        style={[
                            styles.progressBarFill, 
                            { width: `${Math.min(percent, 100)}%`, backgroundColor: color }
                        ]} 
                    />
                </View>
                
                <Text style={[styles.percentText, { color }]}>
                    {percent.toFixed(1)}% Used {percent > 100 && '(Over Budget!)'}
                </Text>
                
                {splits.length > 0 && (
                    <View style={styles.splitsContainer}>
                        <View style={styles.splitsHeader}>
                            <Ionicons name="git-branch-outline" size={14} color="#6B7280" />
                            <Text style={styles.splitsHeaderText}>Splits • Total ₹{splitsTotal}</Text>
                        </View>
                        <View style={styles.splitsRow}>
                            {splits.map(s => (
                                <View key={s.id} style={styles.splitChip}>
                                    <Text style={styles.splitChipText}>{s.name}: ₹{s.amount}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Budgets</Text>
                    <Text style={styles.subtitle}>{month}/{year}</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => Store.setAppMode('finance')} style={styles.toggleButton}>
                        <Ionicons name="swap-horizontal" size={20} color="#4F46E5" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => { 
                            setCurrentBudget({ category: categories[0] || "" }); 
                            setCurrentSplits([]);
                            setModalVisible(true); 
                        }} 
                        style={styles.addButton}
                    >
                        <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={budgets}
                renderItem={renderItem}
                keyExtractor={item => item.id?.toString() || Math.random().toString()}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                ListEmptyComponent={<Text style={styles.emptyText}>No budgets set for this month.</Text>}
            />

            <Modal visible={modalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{currentBudget.id ? 'Edit Budget' : 'New Budget'}</Text>
                        
                        <Text style={styles.label}>Category</Text>
                        <ScrollView horizontal style={styles.chipContainer} showsHorizontalScrollIndicator={false}>
                            {categories.map(c => (
                                <TouchableOpacity 
                                    key={c} 
                                    style={[styles.chip, currentBudget.category === c && styles.chipSelected]}
                                    onPress={() => setCurrentBudget({ ...currentBudget, category: c })}
                                >
                                    <Text style={[styles.chipText, currentBudget.category === c && styles.chipTextSelected]}>{c}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="create-outline" size={18} color="#9CA3AF" />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter custom category"
                                value={currentBudget.category || ""}
                                onChangeText={t => setCurrentBudget({ ...currentBudget, category: t })}
                            />
                        </View>

                        <Text style={styles.label}>Amount Limit</Text>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.currencySymbol}>₹</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                placeholder="0.00"
                                value={currentBudget.amount?.toString()}
                                onChangeText={t => setCurrentBudget({ ...currentBudget, amount: Number(t) })}
                            />
                        </View>

                        <Text style={styles.label}>Splits</Text>
                        {currentSplits.map((s, i) => (
                            <View key={s.id ?? i} style={styles.splitRow}>
                                <View style={[styles.inputWrapper, { flex: 1, marginBottom: 0 }]}>
                                    <Ionicons name="pricetag-outline" size={18} color="#9CA3AF" />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Split name"
                                        value={String(s.name || "")}
                                        onChangeText={(t) => {
                                            const next = [...currentSplits];
                                            next[i] = { ...next[i], name: t };
                                            setCurrentSplits(next);
                                        }}
                                    />
                                </View>
                                <View style={[styles.inputWrapper, { width: 140, marginLeft: 8, marginBottom: 0 }]}>
                                    <Text style={styles.currencySymbol}>₹</Text>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        placeholder="0.00"
                                        value={s.amount?.toString() || ""}
                                        onChangeText={(t) => {
                                            const next = [...currentSplits];
                                            next[i] = { ...next[i], amount: Number(t) };
                                            setCurrentSplits(next);
                                        }}
                                    />
                                </View>
                            </View>
                        ))}
                        <TouchableOpacity
                            onPress={() => setCurrentSplits([...currentSplits, { name: "", amount: 0 }])}
                            style={styles.addSplitButton}
                        >
                            <Ionicons name="add-circle-outline" size={18} color="#4F46E5" />
                            <Text style={styles.addSplitText}>Add Split</Text>
                        </TouchableOpacity>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelButton}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            {currentBudget.id && (
                                <TouchableOpacity onPress={() => { setModalVisible(false); handleDelete(currentBudget.id!); }} style={styles.deleteButton}>
                                    <Text style={styles.deleteButtonText}>Delete</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                                <Text style={styles.saveButtonText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#111827',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    addButton: {
        backgroundColor: '#4F46E5',
        padding: 10,
        borderRadius: 20,
        shadowColor: "#4F46E5",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    toggleButton: {
        marginRight: 8,
        backgroundColor: '#EEF2FF',
        padding: 8,
        borderRadius: 999,
    },
    card: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    categoryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    categoryIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    categoryName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    amountText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    progressBarBg: {
        height: 10,
        backgroundColor: '#F3F4F6',
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 5,
    },
    percentText: {
        fontSize: 12,
        marginTop: 6,
        fontWeight: '600',
        alignSelf: 'flex-end',
    },
    emptyText: {
        textAlign: 'center',
        color: '#9CA3AF',
        marginTop: 60,
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 20,
        textAlign: 'center',
        color: '#111827',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 20,
        paddingHorizontal: 12,
    },
    currencySymbol: {
        fontSize: 18,
        color: '#9CA3AF',
        marginRight: 8,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 18,
        color: '#1F2937',
        fontWeight: '600',
    },
    splitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    addSplitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 16,
    },
    addSplitText: {
        marginLeft: 6,
        color: '#4F46E5',
        fontWeight: '600',
    },
    splitDeleteBtn: {
        marginLeft: 8,
        padding: 8,
    },
    chipContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        height: 40,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
        marginRight: 10,
        height: 36,
        justifyContent: 'center',
    },
    chipSelected: {
        backgroundColor: '#4F46E5',
    },
    chipText: {
        color: '#374151',
        fontSize: 14,
        fontWeight: '500',
    },
    chipTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 10,
    },
    cancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginRight: 10,
    },
    cancelButtonText: {
        color: '#6B7280',
        fontSize: 16,
        fontWeight: '600',
    },
    deleteButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginRight: 'auto',
        backgroundColor: '#FEF2F2',
        borderRadius: 8,
    },
    deleteButtonText: {
        color: '#EF4444',
        fontWeight: '600',
    },
    saveButton: {
        backgroundColor: '#4F46E5',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        shadowColor: "#4F46E5",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    }
    ,
    splitsContainer: {
        marginTop: 10,
    },
    splitsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    splitsHeaderText: {
        marginLeft: 6,
        color: '#6B7280',
        fontSize: 12,
        fontWeight: '600',
    },
    splitsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    splitChip: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 8,
        marginBottom: 6,
    },
    splitChipText: {
        color: '#374151',
        fontSize: 12,
        fontWeight: '600',
    }
});
