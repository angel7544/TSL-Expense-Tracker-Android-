import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { Store } from '../data/Store';
import { AppHeader } from '../components/AppHeader';
import { InputModal } from '../components/InputModal';

const BACKUP_LOG_FILE = FileSystem.documentDirectory + "backup_log.json";

interface BackupLog {
    id: string;
    name: string; // User friendly name
    filename: string;
    date: string;
    recordCount: number;
    uri: string;
}

export default function BackupScreen() {
    const [backups, setBackups] = useState<BackupLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        loadBackups();
    }, []);

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
            const records = await Store.list({});
            const json = JSON.stringify(records, null, 2);
            // Sanitize filename
            const safeName = name.replace(/[^a-z0-9]/gi, '_');
            const filename = `backup_${safeName}_${Date.now()}.json`;
            const uri = FileSystem.documentDirectory + filename;
            
            await FileSystem.writeAsStringAsync(uri, json);

            const newLog: BackupLog = {
                id: Date.now().toString(),
                name: name,
                filename: filename,
                date: new Date().toISOString(),
                recordCount: records.length,
                uri: uri
            };

            const updated = [newLog, ...backups];
            setBackups(updated);
            await FileSystem.writeAsStringAsync(BACKUP_LOG_FILE, JSON.stringify(updated));
            
            Alert.alert("Success", "Backup created successfully");

        } catch (e: any) {
            Alert.alert("Error", e.message);
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
        Alert.alert("Restore Backup", `Restore records from ${backup.name}? This will merge with current data.`, [
            { text: "Cancel", style: "cancel" },
            { text: "Restore", onPress: async () => {
                try {
                    const content = await FileSystem.readAsStringAsync(backup.uri);
                    const records = JSON.parse(content);
                    await Store.importCSV(records, `Restore_${backup.name}`);
                    Alert.alert("Success", `Restored ${records.length} records`);
                } catch (e: any) {
                    Alert.alert("Error", "Failed to restore: " + e.message);
                }
            }}
        ]);
    };

    const renderItem = ({ item }: { item: BackupLog }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.iconBg}>
                    <Ionicons name="save-outline" size={24} color="#4F46E5" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardSubtitle}>{new Date(item.date).toLocaleString()}</Text>
                </View>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.recordCount} Records</Text>
                </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.actions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => restoreBackup(item)}>
                    <Ionicons name="cloud-upload-outline" size={18} color="#059669" />
                    <Text style={[styles.actionText, { color: '#059669' }]}>Restore</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => shareBackup(item)}>
                    <Ionicons name="share-social-outline" size={18} color="#4F46E5" />
                    <Text style={[styles.actionText, { color: '#4F46E5' }]}>Export</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => deleteBackup(item.id)}>
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                    <Text style={[styles.actionText, { color: '#DC2626' }]}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <AppHeader title="Backups" subtitle="Manage Data Backups" />
            
            <View style={styles.content}>
                <TouchableOpacity style={styles.createBtn} onPress={() => setModalVisible(true)}>
                    <Ionicons name="add-circle-outline" size={24} color="white" />
                    <Text style={styles.createBtnText}>Create New Backup</Text>
                </TouchableOpacity>

                {loading ? (
                    <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 20 }} />
                ) : (
                    <FlatList
                        data={backups}
                        showsVerticalScrollIndicator={false}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="file-tray-outline" size={48} color="#ccc" />
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    createBtn: {
        backgroundColor: '#4F46E5',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        shadowColor: "#4F46E5",
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
        backgroundColor: 'white',
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
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    cardSubtitle: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    badge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#4B5563',
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
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
        color: '#9CA3AF',
        marginTop: 10,
    }
});
