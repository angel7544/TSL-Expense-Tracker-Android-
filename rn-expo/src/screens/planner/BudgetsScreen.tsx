import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Store, Budget, BudgetSplit } from '../../data/Store';
import { UIContext } from '../../context/UIContext';

export const BudgetsScreen = () => {
    const { theme } = useContext(UIContext);
    const styles = useMemo(() => getStyles(theme), [theme]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [actuals, setActuals] = useState<Record<string, number>>({});
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [month, setMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
    const [activeTab, setActiveTab] = useState<'monthly' | 'yearly' | 'weekly'>('monthly');
    
    const [modalVisible, setModalVisible] = useState(false);
    const [currentBudget, setCurrentBudget] = useState<Partial<Budget>>({});
    const [categories, setCategories] = useState<string[]>([]);
    const [splitsByBudget, setSplitsByBudget] = useState<Record<number, BudgetSplit[]>>({});
    const [splitStatus, setSplitStatus] = useState<Record<number, number>>({});
    const [currentSplits, setCurrentSplits] = useState<Array<Partial<BudgetSplit>>>([]);

    useEffect(() => {
        loadData();
        const unsub = Store.subscribe(loadData);
        return unsub;
    }, [year, month, activeTab]);

    const loadData = async () => {
        let budgetsData: Budget[] = [];
        let totals: {category: string, amount: number}[] = [];
        let records: any[] = [];
        let cats: string[] = [];

        // 1. Get Budgets & Totals based on Tab
        if (activeTab === 'yearly') {
             budgetsData = await Store.getBudgets(year, month, 'yearly');
             totals = await Store.getCategoryTotals(year, 'All', 'expense');
             records = await Store.list({ year, month: 'All' });
        } else if (activeTab === 'weekly') {
             budgetsData = await Store.getBudgets(year, month, 'weekly');
             totals = await Store.getCategoryTotals(year, month, 'expense');
             records = await Store.list({ year, month });
        } else {
             budgetsData = await Store.getBudgets(year, month, 'monthly');
             totals = await Store.getCategoryTotals(year, month, 'expense');
             records = await Store.list({ year, month });
        }

        cats = await Store.getUniqueValues('expense_category');
        
        setBudgets(budgetsData);
        setCategories(cats);
        
        const acts: Record<string, number> = {};
        totals.forEach(t => {
            if (activeTab === 'weekly') {
                // Approximate weekly spend from monthly total
                acts[t.category] = t.amount / 4.3; 
            } else {
                acts[t.category] = t.amount;
            }
        });
        setActuals(acts);

        const sStatus: Record<number, number> = {};
        records.forEach(r => {
            if (r.split_id) {
                sStatus[r.split_id] = (sStatus[r.split_id] || 0) + Number(r.expense_amount || 0);
            }
        });
        setSplitStatus(sStatus);

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
            period: currentBudget.period || 'monthly',
            month: month,
            year: year
        });
        
        let budId = currentBudget.id;
        if (!budId) {
            const updated = await Store.getBudgets(year, month, currentBudget.period || 'monthly');
            const match = updated
                .filter(b => b.category === currentBudget.category && Number(b.amount) === Number(currentBudget.amount) && b.period === (currentBudget.period || 'monthly'))
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
                            <Ionicons name="git-branch-outline" size={14} color={theme.colors.subtext} />
                            <Text style={styles.splitsHeaderText}>Splits • Total ₹{splitsTotal}</Text>
                        </View>
                        <View style={styles.splitsRow}>
                            {splits.map(s => {
                                const spent = s.id ? (splitStatus[s.id] || 0) : 0;
                                const isDone = s.amount > 0 && spent >= s.amount;
                                return (
                                    <View key={s.id} style={[styles.splitChip, isDone && { backgroundColor: theme.colors.success + '20', borderColor: theme.colors.success, borderWidth: 1 }]}>
                                        <Text style={[styles.splitChipText, isDone && { color: theme.colors.success, fontWeight: 'bold' }]}>
                                            {s.name}: ₹{s.amount} {spent > 0 && spent < s.amount && `(${spent})`} {isDone && '✓'}
                                        </Text>
                                    </View>
                                );
                            })}
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
                    <Text style={styles.subtitle}>{activeTab === 'yearly' ? year : `${month}/${year}`}</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => Store.setAppMode('finance')} style={styles.toggleButton}>
                        <Ionicons name="swap-horizontal" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => { 
                            setCurrentBudget({ category: categories[0] || "", period: activeTab }); 
                            setCurrentSplits([]);
                            setModalVisible(true); 
                        }} 
                        style={[styles.addButton, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}
                    >
                        <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
            
            <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 16, backgroundColor: theme.colors.card }}>
                 {(['monthly', 'yearly', 'weekly'] as const).map(tab => (
                    <TouchableOpacity 
                        key={tab} 
                        style={{
                            marginRight: 12,
                            paddingVertical: 6,
                            paddingHorizontal: 16,
                            borderRadius: 20,
                            backgroundColor: activeTab === tab ? theme.colors.primary : theme.colors.background,
                            borderWidth: 1,
                            borderColor: activeTab === tab ? theme.colors.primary : theme.colors.border
                        }}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={{ 
                            color: activeTab === tab ? '#fff' : theme.colors.text,
                            fontWeight: '600',
                            fontSize: 14
                        }}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={budgets}
                renderItem={renderItem}
                keyExtractor={item => item.id?.toString() || Math.random().toString()}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                ListEmptyComponent={<Text style={styles.emptyText}>No budgets set for this period.</Text>}
                ListHeaderComponent={() => (
                    <View style={{ marginBottom: 10 }}>
                        {activeTab === 'weekly' && (
                            <Text style={{ fontSize: 12, color: theme.colors.subtext, fontStyle: 'italic', textAlign: 'center' }}>
                                Weekly spending is estimated as (Monthly Total / 4.3)
                            </Text>
                        )}
                        {activeTab === 'yearly' && (
                            <Text style={{ fontSize: 12, color: theme.colors.subtext, fontStyle: 'italic', textAlign: 'center' }}>
                                Showing total spending for {year}
                            </Text>
                        )}
                    </View>
                )}
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
                                    style={[
                                        styles.chip, 
                                        currentBudget.category === c && { backgroundColor: theme.colors.primary }
                                    ]}
                                    onPress={() => setCurrentBudget({ ...currentBudget, category: c })}
                                >
                                    <Text style={[
                                        styles.chipText, 
                                        currentBudget.category === c && styles.chipTextSelected
                                    ]}>
                                        {c}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="create-outline" size={18} color={theme.colors.subtext} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter custom category"
                                placeholderTextColor={theme.colors.subtext}
                                value={currentBudget.category}
                                onChangeText={t => setCurrentBudget({ ...currentBudget, category: t })}
                            />
                        </View>

                        <Text style={styles.label}>Period</Text>
                        <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                            {(['monthly', 'yearly', 'weekly'] as const).map(p => (
                                <TouchableOpacity
                                    key={p}
                                    style={[
                                        styles.chip,
                                        currentBudget.period === p && { backgroundColor: theme.colors.primary }
                                    ]}
                                    onPress={() => setCurrentBudget({ ...currentBudget, period: p })}
                                >
                                    <Text style={[
                                        styles.chipText,
                                        currentBudget.period === p && styles.chipTextSelected
                                    ]}>
                                        {p.charAt(0).toUpperCase() + p.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Amount Limit</Text>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.currencySymbol}>₹</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                placeholder="0.00"
                                placeholderTextColor={theme.colors.subtext}
                                value={currentBudget.amount?.toString()}
                                onChangeText={t => setCurrentBudget({ ...currentBudget, amount: Number(t) })}
                            />
                        </View>

                        <Text style={styles.label}>Splits</Text>
                        {currentSplits.map((s, i) => (
                            <View key={s.id ?? i} style={styles.splitRow}>
                                <View style={[styles.inputWrapper, { flex: 1, marginBottom: 0 }]}>
                                    <Ionicons name="pricetag-outline" size={18} color={theme.colors.subtext} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Split name"
                                        placeholderTextColor={theme.colors.subtext}
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
                                        placeholderTextColor={theme.colors.subtext}
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
                            <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
                            <Text style={[styles.addSplitText, { color: theme.colors.primary }]}>Add Split</Text>
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
                            <TouchableOpacity onPress={handleSave} style={[styles.saveButton, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}>
                                <Text style={styles.saveButtonText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const getStyles = (theme: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
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
    subtitle: {
        fontSize: 14,
        color: theme.colors.subtext,
        fontWeight: '500',
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
    card: {
        backgroundColor: theme.colors.card,
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
        color: theme.colors.text,
    },
    amountText: {
        fontSize: 14,
        color: theme.colors.subtext,
        fontWeight: '500',
    },
    progressBarBg: {
        height: 10,
        backgroundColor: theme.colors.background,
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
        color: theme.colors.subtext,
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
        backgroundColor: theme.colors.card,
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
        color: theme.colors.text,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: 20,
        paddingHorizontal: 12,
    },
    currencySymbol: {
        fontSize: 18,
        color: theme.colors.subtext,
        marginRight: 8,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 18,
        color: theme.colors.text,
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
        backgroundColor: theme.mode === 'dark' ? theme.colors.input : '#EEF2FF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 16,
    },
    addSplitText: {
        marginLeft: 6,
        color: theme.colors.primary,
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
        backgroundColor: theme.colors.background,
        borderRadius: 20,
        marginRight: 10,
        height: 36,
        justifyContent: 'center',
    },
    chipSelected: {
        backgroundColor: theme.colors.primary,
    },
    chipText: {
        color: theme.colors.subtext,
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
        color: theme.colors.subtext,
        fontSize: 16,
        fontWeight: '600',
    },
    deleteButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginRight: 'auto',
        backgroundColor: theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#FEF2F2',
        borderRadius: 8,
    },
    deleteButtonText: {
        color: theme.colors.danger,
        fontWeight: '600',
    },
    saveButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
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
        color: theme.colors.subtext,
        fontSize: 12,
        fontWeight: '600',
    },
    splitsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    splitChip: {
        backgroundColor: theme.colors.background,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 8,
        marginBottom: 6,
    },
    splitChipText: {
        color: theme.colors.text,
        fontSize: 12,
        fontWeight: '600',
    }
});
