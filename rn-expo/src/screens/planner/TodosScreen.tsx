import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, Modal, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Store, Todo } from '../../data/Store';
import { NotificationService } from '../../services/NotificationService';

export const TodosScreen = () => {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [showCompleted, setShowCompleted] = useState(true);
    
    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [taskText, setTaskText] = useState('');
    const [taskDate, setTaskDate] = useState(new Date().toISOString().split('T')[0]);
    const [taskTime, setTaskTime] = useState(''); // HH:MM
    const [enableReminder, setEnableReminder] = useState(false);

    useEffect(() => {
        loadTodos();
        const unsub = Store.subscribe(loadTodos);
        return unsub;
    }, []);

    const loadTodos = async () => {
        const data = await Store.getTodos();
        setTodos(data);
    };

    const handleAddPress = () => {
        setTaskText('');
        setTaskDate(new Date().toISOString().split('T')[0]);
        setTaskTime('');
        setEnableReminder(false);
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!taskText.trim()) return;

        let notifId = undefined;

        if (enableReminder && taskTime) {
            // Schedule Notification
            // Parse date and time
            const dateParts = taskDate.split('-').map(Number);
            const timeParts = taskTime.split(':').map(Number);
            
            if (dateParts.length === 3 && timeParts.length === 2) {
                const triggerDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1]);
                if (triggerDate > new Date()) {
                    notifId = await NotificationService.scheduleNotification(
                        "Task Reminder",
                        taskText,
                        triggerDate
                    );
                    Alert.alert("Reminder Set", `Notification scheduled for ${triggerDate.toLocaleString()}`);
                } else {
                    Alert.alert("Warning", "Time is in the past, no reminder set.");
                }
            }
        }

        await Store.saveTodo({
            text: taskText.trim(),
            is_completed: false,
            due_date: taskDate,
            due_time: taskTime,
            notification_id: notifId || undefined
        });
        setModalVisible(false);
    };

    const toggleComplete = async (todo: Todo) => {
        await Store.saveTodo({ ...todo, is_completed: !todo.is_completed });
    };

    const deleteTodo = async (todo: Todo) => {
        Alert.alert("Delete Task", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
                if (todo.notification_id) {
                    await NotificationService.cancelNotification(todo.notification_id);
                }
                await Store.deleteTodo(todo.id!);
            }}
        ]);
    };

    const renderItem = ({ item }: { item: Todo }) => {
        if (!showCompleted && item.is_completed) return null;
        return (
            <View style={[styles.item, item.is_completed && styles.itemCompleted]}>
                <TouchableOpacity onPress={() => toggleComplete(item)} style={styles.checkButton}>
                    <Ionicons 
                        name={item.is_completed ? "checkbox" : "square-outline"} 
                        size={24} 
                        color={item.is_completed ? "#10B981" : "#9CA3AF"} 
                    />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.itemText, item.is_completed && styles.completedText]}>
                        {item.text}
                    </Text>
                    {(item.due_date || item.due_time) && (
                        <View style={styles.metaRow}>
                            <Ionicons name="calendar-outline" size={12} color="#6B7280" style={{marginRight: 4}} />
                            <Text style={styles.dueText}>
                                {item.due_date} {item.due_time}
                            </Text>
                            {item.notification_id && (
                                <View style={styles.reminderBadge}>
                                    <Ionicons name="alarm" size={10} color="#F59E0B" />
                                </View>
                            )}
                        </View>
                    )}
                </View>
                <TouchableOpacity onPress={() => deleteTodo(item)} style={styles.deleteButtonIcon}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Tasks</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => Store.setAppMode('finance')} style={styles.toggleButton}>
                        <Ionicons name="swap-horizontal" size={20} color="#4F46E5" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowCompleted(!showCompleted)} style={styles.filterButton}>
                        <Ionicons name={showCompleted ? "eye-off-outline" : "eye-outline"} size={20} color="#6B7280" />
                        <Text style={styles.filterText}>{showCompleted ? "Hide Done" : "Show Done"}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={todos}
                renderItem={renderItem}
                keyExtractor={item => item.id?.toString() || Math.random().toString()}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                ListEmptyComponent={<Text style={styles.emptyText}>No tasks yet. Add one below!</Text>}
            />

            <TouchableOpacity onPress={handleAddPress} style={styles.fab}>
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>

            {/* Add Task Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Task</Text>
                        
                        <Text style={styles.label}>Task Description</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="What needs to be done?"
                            value={taskText}
                            onChangeText={setTaskText}
                        />

                        <Text style={styles.label}>Due Date (YYYY-MM-DD)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="YYYY-MM-DD"
                            value={taskDate}
                            onChangeText={setTaskDate}
                        />

                        <View style={styles.row}>
                            <View>
                                <Text style={styles.label}>Set Reminder?</Text>
                                <Text style={styles.subLabel}>Get notified on time</Text>
                            </View>
                            <Switch 
                                value={enableReminder} 
                                onValueChange={setEnableReminder}
                                trackColor={{ false: "#D1D5DB", true: "#4F46E5" }}
                            />
                        </View>

                        {enableReminder && (
                            <>
                                <Text style={styles.label}>Time (HH:MM 24h)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="14:30"
                                    value={taskTime}
                                    onChangeText={setTaskTime}
                                    keyboardType="numbers-and-punctuation"
                                />
                            </>
                        )}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelButton}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                                <Text style={styles.saveButtonText}>Save Task</Text>
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
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    toggleButton: {
        marginRight: 8,
        backgroundColor: '#EEF2FF',
        padding: 8,
        borderRadius: 999,
    },
    filterText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
        marginLeft: 4,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    itemCompleted: {
        opacity: 0.7,
        backgroundColor: '#F9FAFB',
    },
    checkButton: {
        marginRight: 4,
    },
    itemText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1F2937',
    },
    completedText: {
        textDecorationLine: 'line-through',
        color: '#9CA3AF',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    dueText: {
        fontSize: 12,
        color: '#6B7280',
    },
    reminderBadge: {
        marginLeft: 6,
        backgroundColor: '#FEF3C7',
        padding: 2,
        borderRadius: 4,
    },
    deleteButtonIcon: {
        padding: 8,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        backgroundColor: '#4F46E5',
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#4F46E5",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
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
        marginTop: 8,
    },
    subLabel: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    input: {
        backgroundColor: '#F9FAFB',
        padding: 14,
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 10,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 15,
        marginBottom: 15,
        paddingVertical: 5,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 25,
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
});
