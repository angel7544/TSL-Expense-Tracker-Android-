import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, Platform, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { Store } from '../data/Store';
import { AppHeader } from '../components/AppHeader';
import { InputModal } from '../components/InputModal';
import { UIContext } from '../context/UIContext';

const BACKUP_LOG_FILE = FileSystem.documentDirectory + "backup_log.json";

interface BackupLog {
    id: string;
    name: string; // User friendly name
    filename: string;
    date: string;
    recordCount: number;
    uri: string;
    dbName?: string;
}

export default function BackupScreen() {
    const { theme } = useContext(UIContext);
    const styles = useMemo(() => getStyles(theme), [theme]);
    const [backups, setBackups] = useState<BackupLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [availableDbs, setAvailableDbs] = useState<any[]>([]);
    const [restoreModalVisible, setRestoreModalVisible] = useState(false);
    const [selectedBackup, setSelectedBackup] = useState<BackupLog | null>(null);
    const [targetDb, setTargetDb] = useState("");
    const [mergeMode, setMergeMode] = useState<'skip' | 'keep'>('skip');
    const isFocused = useIsFocused();

    useEffect(() => {
        if (isFocused) {
            loadBackups();
            Store.getRecentDatabases().then(setAvailableDbs);
            setTargetDb(Store.currentDbName);
        }
    }, [isFocused]);

    const loadBackups = async () => {
        if (Platform.OS === 'web') return;
        try {
            const info = await FileSystem.getInfoAsync(BACKUP_LOG_FILE);
            if (info.exists) {
                const content = await FileSystem.readAsStringAsync(BACKUP_LOG_FILE);
                const logs = JSON.parse(content);
                // Verify files exist
                const verified = [];
                for (const log of logs) {
                    const i = await FileSystem.getInfoAsync(log.uri);
                    if (i.exists) verified.push(log);
                }
                if (verified.length !== logs.length) {
                    await FileSystem.writeAsStringAsync(BACKUP_LOG_FILE, JSON.stringify(verified));
                }
                setBackups(verified);
            }
        } catch (e) {
            console.error("Failed to load backup log", e);
        }
    };

    const handleCreateBackup = (name: string) => {
        createBackup(name);
    };

    const createBackup = async (name: string) => {
        setLoading(true);
        try {
            await Store.createJsonBackup(name);
            await loadBackups();
            Alert.alert("Success", "Backup created successfully");
        } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to create backup");
        } finally {
            setLoading(false);
        }
    };

    const deleteBackup = async (id: string) => {
        Alert.alert("Delete Backup", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
                const log = backups.find(b => b.id === id);
                if (log) {
                    await FileSystem.deleteAsync(log.uri, { idempotent: true });
                    const updated = backups.filter(b => b.id !== id);
                    setBackups(updated);
                    await FileSystem.writeAsStringAsync(BACKUP_LOG_FILE, JSON.stringify(updated));
                }
            }}
        ]);
    };

    const shareBackup = async (backup: BackupLog) => {
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(backup.uri);
        } else {
            Alert.alert("Error", "Sharing is not available on this platform");
        }
    };

    const restoreBackup = (backup: BackupLog) => {
        setSelectedBackup(backup);
        setTargetDb(backup.dbName || Store.currentDbName);
        setRestoreModalVisible(true);
    };

    const performRestore = async () => {
        if (!selectedBackup) return;
        setLoading(true);
        setRestoreModalVisible(false);
        
        const originalDb = Store.currentDbName;
        const needsSwitch = targetDb && targetDb !== originalDb;

        try {
            if (needsSwitch) {
                await Store.switchDatabase(targetDb);
            }

            const content = await FileSystem.readAsStringAsync(selectedBackup.uri);
            const records = JSON.parse(content);
            const count = await Store.importCSV(records, `Restore_${selectedBackup.name}`, mergeMode === 'skip');
            
            Alert.alert("Success", `Restored ${count} records to ${targetDb || originalDb}`);
        } catch (e: any) {
            Alert.alert("Error", "Failed to restore: " + e.message);
        } finally {
            if (needsSwitch) {
                await Store.switchDatabase(originalDb);
            }
            setLoading(false);
            setSelectedBackup(null);
        }
    };

    const renderItem = ({ item }: { item: BackupLog }) => {
        const dbLabel = item.dbName || 'tsl_expenses.db';
        const subtitle = `${new Date(item.date).toLocaleString()} • ${dbLabel}`;
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.iconBg}>
                        <Ionicons name="save-outline" size={24} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                        <Text style={styles.cardSubtitle}>{subtitle}</Text>
                    </View>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.recordCount} Records</Text>
                    </View>
                </View>
                
                <View style={styles.divider} />
                
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => restoreBackup(item)}>
                        <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.success || "#059669"} />
                        <Text style={[styles.actionText, { color: theme.colors.success || '#059669' }]}>Restore</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => shareBackup(item)}>
                        <Ionicons name="share-social-outline" size={18} color={theme.colors.primary} />
                        <Text style={[styles.actionText, { color: theme.colors.primary }]}>Export</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => deleteBackup(item.id)}>
                        <Ionicons name="trash-outline" size={18} color={theme.colors.danger || "#DC2626"} />
                        <Text style={[styles.actionText, { color: theme.colors.danger || '#DC2626' }]}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <AppHeader title="Backups" subtitle="Manage Backups" />
            
            <View style={styles.content}>
                <TouchableOpacity style={styles.createBtn} onPress={() => setModalVisible(true)}>
                    <Ionicons name="add-circle-outline" size={24} color="white" />
                    <Text style={styles.createBtnText}>Create New Backup</Text>
                </TouchableOpacity>

                {loading ? (
                    <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
                ) : (
                    <FlatList
                        data={backups}
                        showsVerticalScrollIndicator={false}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="file-tray-outline" size={48} color={theme.colors.placeholder} />
                                <Text style={styles.emptyText}>No backups found</Text>
                            </View>
                        }
                    />
                )}
            </View>

            <InputModal
                visible={modalVisible}
                title="Backup Name"
                placeholder="e.g. Monthly Backup"
                onClose={() => setModalVisible(false)}
                onSubmit={handleCreateBackup}
                submitLabel="Create"
            />

            <Modal
                visible={restoreModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setRestoreModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Restore Backup</Text>
                        <Text style={styles.modalSubtitle}>Select target database and merge strategy</Text>

                        <View style={{maxHeight: 250, marginVertical: 10}}>
                            <Text style={styles.label}>Target Database</Text>
                            <ScrollView nestedScrollEnabled style={styles.scrollList}>
                                <TouchableOpacity 
                                    style={[styles.option, targetDb === 'tsl_expenses.db' && styles.optionSelected]}
                                    onPress={() => setTargetDb('tsl_expenses.db')}
                                >
                                    <Text style={[styles.optionText, targetDb === 'tsl_expenses.db' && styles.optionTextSelected]}>Default (tsl_expenses.db)</Text>
                                    {targetDb === 'tsl_expenses.db' && <Ionicons name="checkmark" size={16} color={theme.colors.primary} />}
                                </TouchableOpacity>
                                {availableDbs.filter(d => d.dbName !== 'tsl_expenses.db').map(db => (
                                    <TouchableOpacity 
                                        key={db.dbName}
                                        style={[styles.option, targetDb === db.dbName && styles.optionSelected]}
                                        onPress={() => setTargetDb(db.dbName)}
                                    >
                                        <Text style={[styles.optionText, targetDb === db.dbName && styles.optionTextSelected]}>{db.name} ({db.dbName})</Text>
                                        {targetDb === db.dbName && <Ionicons name="checkmark" size={16} color={theme.colors.primary} />}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <Text style={styles.label}>Merge Strategy</Text>
                        <View style={styles.row}>
                            <TouchableOpacity 
                                style={[styles.chip, mergeMode === 'skip' && styles.chipSelected]}
                                onPress={() => setMergeMode('skip')}
                            >
                                <Text style={[styles.chipText, mergeMode === 'skip' && styles.chipTextSelected]}>Skip Duplicates</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.chip, mergeMode === 'keep' && styles.chipSelected]}
                                onPress={() => setMergeMode('keep')}
                            >
                                <Text style={[styles.chipText, mergeMode === 'keep' && styles.chipTextSelected]}>Keep All</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setRestoreModalVisible(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.submitBtn} onPress={performRestore}>
                                <Text style={styles.submitBtnText}>Restore</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    createBtn: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    createBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
    },
    card: {
        backgroundColor: theme.colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBg: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    cardSubtitle: {
        fontSize: 12,
        color: theme.colors.subtext,
        marginTop: 2,
    },
    badge: {
        backgroundColor: theme.colors.background,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colors.subtext,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: 12,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 4,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 50,
    },
    emptyText: {
        color: theme.colors.subtext,
        marginTop: 10,
    },
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20
    },
    modalContent: {
        backgroundColor: theme.colors.card, borderRadius: 20, padding: 20,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text, marginBottom: 4, textAlign: 'center' },
    modalSubtitle: { fontSize: 14, color: theme.colors.subtext, textAlign: 'center', marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: 8, marginTop: 4 },
    scrollList: { maxHeight: 150, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8 },
    option: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.card
    },
    optionSelected: { backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#EEF2FF' },
    optionText: { fontSize: 14, color: theme.colors.subtext },
    optionTextSelected: { color: theme.colors.primary, fontWeight: '600' },
    row: { flexDirection: 'row', marginBottom: 20 },
    chip: {
        flex: 1, padding: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8,
        alignItems: 'center', marginHorizontal: 4, backgroundColor: theme.colors.background
    },
    chipSelected: { backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#EEF2FF', borderColor: theme.colors.primary },
    chipText: { fontSize: 13, color: theme.colors.subtext, fontWeight: '500' },
    chipTextSelected: { color: theme.colors.primary, fontWeight: '600' },
    modalActions: { flexDirection: 'row', marginTop: 10 },
    cancelBtn: { flex: 1, padding: 14, alignItems: 'center', marginRight: 8 },
    cancelBtnText: { color: theme.colors.subtext, fontWeight: '600' },
    submitBtn: {
        flex: 1, padding: 14, alignItems: 'center', backgroundColor: theme.colors.primary,
        borderRadius: 12, marginLeft: 8
    },
    submitBtnText: { color: 'white', fontWeight: '600' },
});
