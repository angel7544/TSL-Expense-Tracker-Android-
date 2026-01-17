import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ScrollView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Store, Debt, Wallet } from '../../data/Store';
import { UIContext } from '../../context/UIContext';
import { AppHeader } from '../../components/AppHeader';
import DateTimePicker from '@react-native-community/datetimepicker';

export const DebtsScreen = () => {
    const { theme } = useContext(UIContext);
    const styles = getStyles(theme);
    
    const [debts, setDebts] = useState<Debt[]>([]);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    
    // Form State
    const [editingId, setEditingId] = useState<number | undefined>(undefined);
    const [type, setType] = useState<'borrowed' | 'lent'>('borrowed');
    const [person, setPerson] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date());
    const [time, setTime] = useState(new Date());
    const [color, setColor] = useState('#2196F3');
    const [description, setDescription] = useState('');
    const [selectedWalletId, setSelectedWalletId] = useState<number | undefined>(undefined);
    const [useWallet, setUseWallet] = useState(true);

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    useEffect(() => {
        loadData();
        const unsub = Store.subscribe(loadData);
        return unsub;
    }, []);

    const loadData = async () => {
        const d = await Store.getDebts();
        setDebts(d);
        const w = await Store.getWallets();
        setWallets(w);
    };

    const handleSave = async () => {
        if (!person || !amount) {
            Alert.alert("Error", "Please fill name and amount");
            return;
        }

        const debt: Debt = {
            id: editingId,
            type,
            person,
            amount: parseFloat(amount),
            date: date.toISOString().split('T')[0],
            time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            color,
            description,
            wallet_id: useWallet ? selectedWalletId : undefined,
            is_settled: false 
        };

        if (editingId) {
            const existing = debts.find(d => d.id === editingId);
            if (existing) debt.is_settled = existing.is_settled;
        }

        await Store.saveDebt(debt);
        setModalVisible(false);
        resetForm();
    };

    const resetForm = () => {
        setEditingId(undefined);
        setType('borrowed');
        setPerson('');
        setAmount('');
        setDate(new Date());
        setTime(new Date());
        setColor('#2196F3');
        setDescription('');
        setSelectedWalletId(undefined);
        setUseWallet(true);
    };

    const openEdit = (item: Debt) => {
        setEditingId(item.id);
        setType(item.type);
        setPerson(item.person);
        setAmount(item.amount.toString());
        setDate(new Date(item.date));
        setColor(item.color);
        setDescription(item.description);
        setSelectedWalletId(item.wallet_id);
        setUseWallet(!!item.wallet_id);
        setModalVisible(true);
    };

    const handleDelete = (id: number) => {
        Alert.alert("Delete", "Are you sure?", [
            { text: "Cancel" },
            { text: "Delete", onPress: () => Store.deleteDebt(id), style: 'destructive' }
        ]);
    };
    
    const toggleSettle = async (item: Debt) => {
        const updated = { ...item, is_settled: !item.is_settled };
        await Store.saveDebt(updated);
    };

    const renderItem = ({ item }: { item: Debt }) => (
        <TouchableOpacity style={[styles.card, { borderLeftColor: item.color, borderLeftWidth: 4 }]} onPress={() => openEdit(item)} onLongPress={() => handleDelete(item.id!)}>
            <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.person}</Text>
                <Text style={styles.cardSubtitle}>{item.type === 'borrowed' ? 'I Borrowed' : 'I Lent'}</Text>
                <Text style={styles.cardDate}>{item.date}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.amount, { color: item.type === 'borrowed' ? theme.colors.danger : theme.colors.success }]}>
                    {(theme as any).currencySymbol || '₹'}{item.amount.toFixed(2)}
                </Text>
                <TouchableOpacity onPress={() => toggleSettle(item)} style={[styles.badge, { backgroundColor: item.is_settled ? theme.colors.success : ((theme.colors as any).warning || '#F59E0B') }]}>
                    <Text style={styles.badgeText}>{item.is_settled ? 'Settled' : 'Active'}</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <AppHeader 
                title="Debts" 
                rightAction={
                    <TouchableOpacity onPress={() => { resetForm(); setModalVisible(true); }} style={[styles.addButton, { backgroundColor: theme.colors.primary }]}>
                        <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                }
            />
            
            <FlatList
                data={debts}
                renderItem={renderItem}
                keyExtractor={item => item.id?.toString() || Math.random().toString()}
                contentContainerStyle={{ padding: 16 }}
            />

            <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>{type === 'borrowed' ? 'I borrowed' : 'I lent'}</Text>
                        <TouchableOpacity onPress={handleSave}>
                            <Text style={styles.saveButton}>SAVE</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={{ padding: 16 }}>
                        <View style={styles.typeToggle}>
                             <TouchableOpacity onPress={() => setType('borrowed')} style={[styles.typeBtn, type === 'borrowed' && styles.typeBtnActive]}>
                                 <Text style={[styles.typeText, type === 'borrowed' && styles.typeTextActive]}>Borrowed</Text>
                             </TouchableOpacity>
                             <TouchableOpacity onPress={() => setType('lent')} style={[styles.typeBtn, type === 'lent' && styles.typeBtnActive]}>
                                 <Text style={[styles.typeText, type === 'lent' && styles.typeTextActive]}>Lent</Text>
                             </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Name/Organization</Text>
                        <TextInput style={styles.input} value={person} onChangeText={setPerson} placeholder="Who?" placeholderTextColor={theme.colors.subtext} />

                        <Text style={styles.label}>Amount</Text>
                        <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0" placeholderTextColor={theme.colors.subtext} />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={styles.label}>Date</Text>
                                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
                                    <Text style={{ color: theme.colors.text }}>{date.toLocaleDateString()}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={styles.label}>Time</Text>
                                <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.input}>
                                    <Text style={{ color: theme.colors.text }}>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Text style={styles.label}>Description</Text>
                        <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="What was it for?" placeholderTextColor={theme.colors.subtext} />

                        <Text style={styles.label}>Wallet</Text>
                        <View style={styles.walletContainer}>
                            <TouchableOpacity onPress={() => setUseWallet(!useWallet)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                <Ionicons name={useWallet ? "checkbox" : "square-outline"} size={24} color={theme.colors.primary} />
                                <Text style={{ color: theme.colors.text, marginLeft: 8 }}>Use Wallet</Text>
                            </TouchableOpacity>
                            
                            {useWallet && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {wallets.map(w => (
                                        <TouchableOpacity 
                                            key={w.id} 
                                            onPress={() => setSelectedWalletId(w.id)}
                                            style={[
                                                styles.walletChip, 
                                                selectedWalletId === w.id && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                            ]}
                                        >
                                            <Text style={{ color: selectedWalletId === w.id ? '#fff' : theme.colors.text }}>{w.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}
                        </View>

                        {showDatePicker && (
                            <DateTimePicker 
                                value={date} 
                                mode="date" 
                                onChange={(event: any, selectedDate?: Date) => { setShowDatePicker(false); if(selectedDate) setDate(selectedDate); }} 
                            />
                        )}
                        {showTimePicker && (
                            <DateTimePicker 
                                value={time} 
                                mode="time" 
                                onChange={(event: any, selectedDate?: Date) => { setShowTimePicker(false); if(selectedDate) setTime(selectedDate); }} 
                            />
                        )}
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
};

const getStyles = (theme: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    addButton: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: theme.colors.card, padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', elevation: 2 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
    cardSubtitle: { fontSize: 14, color: theme.colors.subtext },
    cardDate: { fontSize: 12, color: theme.colors.subtext, marginTop: 4 },
    amount: { fontSize: 16, fontWeight: 'bold' },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    modalContainer: { flex: 1, backgroundColor: theme.colors.background },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
    saveButton: { fontSize: 16, fontWeight: 'bold', color: theme.colors.primary },
    label: { fontSize: 14, fontWeight: '600', color: theme.colors.subtext, marginTop: 16, marginBottom: 8 },
    input: { backgroundColor: theme.colors.card, padding: 12, borderRadius: 8, color: theme.colors.text, fontSize: 16 },
    typeToggle: { flexDirection: 'row', backgroundColor: theme.colors.card, borderRadius: 8, padding: 4, marginBottom: 16 },
    typeBtn: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 6 },
    typeBtnActive: { backgroundColor: theme.colors.background },
    typeText: { color: theme.colors.subtext, fontWeight: '600' },
    typeTextActive: { color: theme.colors.primary },
    walletContainer: { marginTop: 8 },
    walletChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, marginRight: 8 }
});
