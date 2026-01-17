import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, ScrollView, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Store, Wallet } from '../../data/Store';
import { UIContext } from '../../context/UIContext';

const CARD_HEIGHT = 180;

const WalletCard = ({ item, stats, theme, onEdit }: { item: Wallet, stats: { income: number, expense: number }, theme: any, onEdit: (w: Wallet) => void }) => {
    const animatedValue = useRef(new Animated.Value(0)).current;
    const [flipped, setFlipped] = useState(false);

    const flipCard = () => {
        if (flipped) {
            Animated.spring(animatedValue, { toValue: 0, friction: 8, tension: 10, useNativeDriver: true }).start();
        } else {
            Animated.spring(animatedValue, { toValue: 180, friction: 8, tension: 10, useNativeDriver: true }).start();
        }
        setFlipped(!flipped);
    };

    const frontInterpolate = animatedValue.interpolate({
        inputRange: [0, 180],
        outputRange: ['0deg', '180deg'],
    });

    const backInterpolate = animatedValue.interpolate({
        inputRange: [0, 180],
        outputRange: ['180deg', '360deg'],
    });

    const isLiability = ['Credit Card', 'Loan', 'Liability'].includes(item.type);
    const effectiveValue = isLiability ? -item.balance : item.balance;
    const isNegative = effectiveValue < 0;

    // Determine card color based on type
    const getCardColor = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('cash')) return ['#10B981', '#059669']; // Green
        if (t.includes('bank')) return ['#3B82F6', '#2563EB']; // Blue
        if (t.includes('credit')) return ['#8B5CF6', '#7C3AED']; // Purple
        if (t.includes('revolut')) return ['#0EA5E9', '#0284C7']; // Light Blue
        if (t.includes('investment')) return ['#F59E0B', '#D97706']; // Orange
        if (t.includes('loan')) return ['#EF4444', '#DC2626']; // Red
        return ['#6B7280', '#4B5563']; // Gray
    };

    const [bgColor, darkerColor] = getCardColor(item.type);

    const styles = StyleSheet.create({
        cardContainer: {
            height: CARD_HEIGHT,
            marginBottom: 20,
            width: '100%',
        },
        card: {
            height: '100%',
            width: '100%',
            backgroundColor: bgColor,
            borderRadius: 20,
            padding: 20,
            position: 'absolute',
            backfaceVisibility: 'hidden',
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
            justifyContent: 'space-between'
        },
        cardBack: {
            backgroundColor: theme.colors.card,
            borderWidth: 2,
            borderColor: bgColor,
            justifyContent: 'center',
            alignItems: 'center',
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        iconBg: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.2)',
            justifyContent: 'center',
            alignItems: 'center',
        },
        walletName: {
            color: '#fff',
            fontSize: 18,
            fontWeight: '700',
            marginLeft: 12,
        },
        typeText: {
            color: 'rgba(255,255,255,0.8)',
            fontSize: 12,
            marginTop: 2,
        },
        balanceContainer: {
            alignItems: 'center',
            marginVertical: 10,
        },
        balanceText: {
            color: '#fff',
            fontSize: 32,
            fontWeight: 'bold',
        },
        statsRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 10,
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: 12,
            padding: 10,
        },
        statItem: {
            alignItems: 'center',
            flex: 1,
        },
        statLabel: {
            color: 'rgba(255,255,255,0.9)',
            fontSize: 11,
            fontWeight: '600',
            marginBottom: 4,
            textTransform: 'uppercase',
            textShadowColor: 'rgba(0,0,0,0.3)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
        },
        statValue: {
            color: '#fff',
            fontSize: 16,
            fontWeight: '800',
            textShadowColor: 'rgba(0,0,0,0.3)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
        },
        divider: {
            width: 1,
            backgroundColor: 'rgba(255,255,255,0.2)',
            marginHorizontal: 10,
        },
        backTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: theme.colors.text,
            marginBottom: 20,
        },
        actionButton: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 12,
            borderRadius: 12,
            width: '80%',
            justifyContent: 'center',
            marginBottom: 12,
        },
    });

    return (
        <Pressable style={styles.cardContainer} onPress={flipCard}>
            {/* Front Side */}
            <Animated.View style={[styles.card, { transform: [{ rotateY: frontInterpolate }] }]}>
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={styles.iconBg}>
                            <Ionicons 
                                name={item.type.toLowerCase().includes('bank') ? "business" : item.type.toLowerCase().includes('card') ? "card" : "wallet"} 
                                size={20} 
                                color="#fff" 
                            />
                        </View>
                        <View>
                            <Text style={styles.walletName}>{item.name}</Text>
                            <Text style={[styles.typeText, { marginLeft: 12 }]}>{item.type}</Text>
                        </View>
                    </View>
                    <Ionicons name="ellipsis-horizontal" size={20} color="rgba(255,255,255,0.6)" />
                </View>

                <View style={styles.balanceContainer}>
                    <Text style={styles.balanceText}>
                        {(isLiability && item.balance > 0) || (!isLiability && item.balance < 0) ? '-' : ''}
                        {theme.currencySymbol || '₹'}{Math.abs(item.balance).toFixed(2)}
                    </Text>
                    {isLiability && <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Current Debt</Text>}
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Income This Month</Text>
                        <Text style={styles.statValue}>+{theme.currencySymbol || '₹'}{stats.income.toFixed(2)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Expenses This Month</Text>
                        <Text style={styles.statValue}>-{theme.currencySymbol || '₹'}{stats.expense.toFixed(2)}</Text>
                    </View>
                </View>
            </Animated.View>

            {/* Back Side */}
            <Animated.View style={[styles.card, styles.cardBack, { transform: [{ rotateY: backInterpolate }] }]}>
                <Text style={styles.backTitle}>Manage Wallet</Text>
                
                <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: theme.colors.primary + '20' }]}
                    onPress={() => onEdit(item)}
                >
                    <Ionicons name="create-outline" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                    <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Edit Details</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: '#FEE2E2' }]}
                    onPress={() => {
                         Alert.alert("Delete Wallet", "Are you sure? Logic will remain but wallet will be gone.", [
                            { text: "Cancel", style: "cancel" },
                            { text: "Delete", style: "destructive", onPress: () => Store.deleteWallet(item.id!) }
                         ]);
                    }}
                >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
                    <Text style={{ color: "#EF4444", fontWeight: '600' }}>Delete Wallet</Text>
                </TouchableOpacity>
            </Animated.View>
        </Pressable>
    );
};

export const WalletsScreen = () => {
    const { theme } = useContext(UIContext);
    const styles = useMemo(() => getStyles(theme), [theme]);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [stats, setStats] = useState<Record<number, { income: number, expense: number }>>({});
    
    const [modalVisible, setModalVisible] = useState(false);
    const [currentWallet, setCurrentWallet] = useState<Partial<Wallet>>({});
    const [customType, setCustomType] = useState("");

    useEffect(() => {
        loadData();
        const unsub = Store.subscribe(loadData);
        return unsub;
    }, []);

    const loadData = async () => {
        const data = await Store.getWallets();
        const today = new Date();
        const year = today.getFullYear().toString();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');

        const newStats: Record<number, { income: number, expense: number }> = {};
        
        await Promise.all(data.map(async (w) => {
            if (w.name) {
                const s = await Store.getWalletStats(w.name, year, month);
                if (w.id) newStats[w.id] = s;
            }
        }));

        setWallets(data);
        setStats(newStats);
    };

    const handleSave = async () => {
        const typeToSave = customType || currentWallet.type;
        if (!currentWallet.name || !typeToSave) {
            Alert.alert("Error", "Name and Type are required");
            return;
        }

        await Store.saveWallet({
            id: currentWallet.id,
            name: currentWallet.name,
            type: typeToSave,
            balance: Number(currentWallet.balance || 0)
        });
        
        setModalVisible(false);
        setCurrentWallet({});
        setCustomType("");
    };

    const presetTypes = ['Cash', 'Bank', 'Credit Card', 'Savings', 'Loan'];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Wallets</Text>
                    <Text style={styles.subtitle}>Tap card to flip for options</Text>
                </View>
                <TouchableOpacity 
                    onPress={() => { 
                        setCurrentWallet({ type: 'Cash', balance: 0 }); 
                        setCustomType("");
                        setModalVisible(true); 
                    }} 
                    style={styles.addButton}
                >
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={wallets}
                renderItem={({ item }) => (
                    <WalletCard 
                        item={item} 
                        stats={stats[item.id!] || { income: 0, expense: 0 }} 
                        theme={theme}
                        onEdit={(w) => {
                            setCurrentWallet(w);
                            if (!presetTypes.includes(w.type)) {
                                setCustomType(w.type);
                            } else {
                                setCustomType("");
                            }
                            setModalVisible(true);
                        }}
                    />
                )}
                keyExtractor={item => item.id?.toString() || Math.random().toString()}
                contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                ListEmptyComponent={<Text style={styles.emptyText}>No wallets found. Add one to start tracking!</Text>}
            />

            <Modal visible={modalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{currentWallet.id ? 'Edit Wallet' : 'New Wallet'}</Text>
                        
                        <Text style={styles.label}>Wallet Name</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="wallet-outline" size={18} color={theme.colors.subtext} />
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Chase Sapphire, Piggy Bank"
                                placeholderTextColor={theme.colors.subtext}
                                value={currentWallet.name}
                                onChangeText={t => setCurrentWallet({ ...currentWallet, name: t })}
                            />
                        </View>

                        <Text style={styles.label}>Account Type</Text>
                        <View style={styles.chipContainer}>
                            {presetTypes.map(c => (
                                <TouchableOpacity 
                                    key={c} 
                                    style={[
                                        styles.chip, 
                                        currentWallet.type === c && !customType && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                    ]}
                                    onPress={() => {
                                        setCurrentWallet({ ...currentWallet, type: c });
                                        setCustomType("");
                                    }}
                                >
                                    <Text style={[
                                        styles.chipText, 
                                        currentWallet.type === c && !customType && styles.chipTextSelected
                                    ]}>{c}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity 
                                style={[
                                    styles.chip, 
                                    (!!customType || (!!currentWallet.type && !presetTypes.includes(currentWallet.type))) && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                ]}
                                onPress={() => {
                                    setCustomType(currentWallet.type && !presetTypes.includes(currentWallet.type) ? currentWallet.type : "Custom");
                                    setCurrentWallet({ ...currentWallet, type: 'Custom' });
                                }}
                            >
                                <Text style={[
                                    styles.chipText, 
                                    (!!customType || (!!currentWallet.type && !presetTypes.includes(currentWallet.type))) && styles.chipTextSelected                         ]}>Other</Text>
                            </TouchableOpacity>
                        </View>

                        {(customType || (currentWallet.type && !presetTypes.includes(currentWallet.type))) && (
                            <View style={[styles.inputWrapper, { marginTop: -10 }]}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter custom type (e.g. Investment)"
                                    placeholderTextColor={theme.colors.subtext}
                                    value={customType}
                                    onChangeText={setCustomType}
                                />
                            </View>
                        )}

                        <Text style={styles.label}>Current Balance</Text>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.currencySymbol}>₹</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                placeholder="0.00"
                                placeholderTextColor={theme.colors.subtext}
                                value={currentWallet.balance?.toString()}
                                onChangeText={t => setCurrentWallet({ ...currentWallet, balance: Number(t) })}
                            />
                        </View>
                        
                        <View style={styles.infoBox}>
                             <Ionicons name="information-circle-outline" size={16} color={theme.colors.subtext} />
                             <Text style={styles.infoText}>
                                 Types containing "Credit" or "Loan" are treated as Liabilities (Debt). All others are Assets.
                             </Text>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelButton}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                                <Text style={styles.saveButtonText}>Save Wallet</Text>
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
        padding: 24,
        paddingTop: 60,
        backgroundColor: theme.colors.card,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.subtext,
        marginTop: 4,
    },
    addButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
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
        backgroundColor: theme.colors.input,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: 20,
        paddingHorizontal: 12,
        height: 50,
    },
    input: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: theme.colors.text,
        height: '100%',
    },
    currencySymbol: {
        fontSize: 18,
        color: theme.colors.subtext,
        fontWeight: '600',
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 20,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: theme.colors.input,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    chipText: {
        fontSize: 14,
        color: theme.colors.subtext,
        fontWeight: '500',
    },
    chipTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },
    modalButtons: {
        flexDirection: 'row',
        marginTop: 10,
    },
    cancelButton: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        backgroundColor: theme.colors.input,
        marginRight: 10,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: theme.colors.subtext,
        fontWeight: '600',
    },
    saveButton: {
        flex: 1.5,
        padding: 14,
        borderRadius: 12,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: '700',
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: theme.colors.input,
        padding: 10,
        borderRadius: 8,
        marginBottom: 20,
        alignItems: 'center',
    },
    infoText: {
        fontSize: 12,
        color: theme.colors.subtext,
        marginLeft: 8,
        flex: 1,
    }
});
