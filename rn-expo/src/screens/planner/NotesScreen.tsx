import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert, Modal, ScrollView, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Store, Note } from '../../data/Store';
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";

const { width } = Dimensions.get('window');

export const NotesScreen = () => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [currentNote, setCurrentNote] = useState<Partial<Note>>({});

    useEffect(() => {
        loadNotes();
        const unsub = Store.subscribe(loadNotes);
        return unsub;
    }, []);

    const loadNotes = async () => {
        setNotes(await Store.getNotes());
    };

    async function handleSave() {
        if (!currentNote.title && !currentNote.content && !currentNote.image_uri) return;

        await Store.saveNote({
            id: currentNote.id,
            title: currentNote.title || "Untitled",
            content: currentNote.content || "",
            created_at: currentNote.created_at || new Date().toISOString(),
            image_uri: currentNote.image_uri,
            is_important: currentNote.is_important
        });
        setModalVisible(false);
        setCurrentNote({});
    }

    const handleDelete = async (id: number) => {
        Alert.alert("Delete Note", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => Store.deleteNote(id) }
        ]);
    };

    const openNote = (note: Note) => {
        setCurrentNote(note);
        setModalVisible(true);
    };

    const createNote = () => {
        setCurrentNote({});
        setModalVisible(true);
    };

    const pickImage = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: "image/*", copyToCacheDirectory: true });
            if (result.canceled) return;
            const file = result.assets?.[0];
            if (!file?.uri) return;

            const notesDir = FileSystem.documentDirectory + "notes/";
            try {
                await FileSystem.makeDirectoryAsync(notesDir, { intermediates: true });
            } catch (e) {}

            const fileName = file.name || `note_${Date.now()}.jpg`;
            const destUri = notesDir + fileName;

            await FileSystem.copyAsync({ from: file.uri, to: destUri });
            
            setCurrentNote(prev => ({ ...prev, image_uri: destUri }));
        } catch (e) {
            console.log(e);
            Alert.alert("Error", "Failed to pick image");
        }
    };

    const renderItem = ({ item }: { item: Note }) => (
        <TouchableOpacity onPress={() => openNote(item)} style={[styles.card, item.is_important && styles.cardImportant]}>
            {item.image_uri && (
                <Image source={{ uri: item.image_uri }} style={styles.cardImage} />
            )}
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.cardPreview} numberOfLines={3}>{item.content}</Text>
                <View style={styles.cardFooter}>
                    <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    {item.is_important && <Ionicons name="star" size={12} color="#F59E0B" />}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Notes</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => Store.setAppMode('finance')} style={styles.toggleButton}>
                        <Ionicons name="swap-horizontal" size={20} color="#4F46E5" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={createNote} style={styles.addButton}>
                        <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={notes}
                renderItem={renderItem}
                keyExtractor={item => item.id?.toString() || Math.random().toString()}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                numColumns={2}
                columnWrapperStyle={{ justifyContent: 'space-between' }}
                ListEmptyComponent={<Text style={styles.emptyText}>No notes yet.</Text>}
            />

            <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <View style={styles.headerActions}>
                            <TouchableOpacity onPress={() => setCurrentNote(p => ({ ...p, is_important: !p.is_important }))} style={{ marginRight: 15 }}>
                                <Ionicons name={currentNote.is_important ? "star" : "star-outline"} size={24} color="#F59E0B" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSave}>
                                <Text style={styles.saveText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <ScrollView style={styles.modalContent}>
                        <TextInput
                            style={styles.inputTitle}
                            placeholder="Title"
                            value={currentNote.title || ""}
                            onChangeText={t => setCurrentNote({ ...currentNote, title: t })}
                        />
                        
                        {currentNote.image_uri && (
                            <View style={styles.imageContainer}>
                                <Image source={{ uri: currentNote.image_uri }} style={styles.fullImage} />
                                <TouchableOpacity 
                                    style={styles.removeImageButton}
                                    onPress={() => setCurrentNote(p => ({ ...p, image_uri: undefined }))}
                                >
                                    <Ionicons name="close" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.toolbar}>
                            <TouchableOpacity onPress={pickImage} style={styles.toolButton}>
                                <Ionicons name="image-outline" size={24} color="#4F46E5" />
                                <Text style={styles.toolText}>Add Image</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.inputContent}
                            placeholder="Start typing..."
                            multiline
                            textAlignVertical="top"
                            value={currentNote.content || ""}
                            onChangeText={t => setCurrentNote({ ...currentNote, content: t })}
                        />
                    </ScrollView>
                    {currentNote.id && (
                        <TouchableOpacity 
                            style={styles.deleteButton} 
                            onPress={() => { setModalVisible(false); handleDelete(currentNote.id!); }}
                        >
                            <Text style={styles.deleteText}>Delete Note</Text>
                        </TouchableOpacity>
                    )}
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
        width: '48%',
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        overflow: 'hidden',
    },
    cardImportant: {
        borderColor: '#FCD34D',
        borderWidth: 1.5,
    },
    cardImage: {
        width: '100%',
        height: 100,
        resizeMode: 'cover',
    },
    cardContent: {
        padding: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
        color: '#1F2937',
    },
    cardPreview: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 8,
        lineHeight: 18,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    cardDate: {
        fontSize: 11,
        color: '#9CA3AF',
    },
    emptyText: {
        textAlign: 'center',
        color: '#9CA3AF',
        marginTop: 60,
        fontSize: 16,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerctions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 16,
        color: '#EF4444',
    },
    saveText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#4F46E5',
    },
    modalContent: {
        flex: 1,
        padding: 24,
    },
    inputTitle: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 20,
        color: '#111827',
    },
    inputContent: {
        fontSize: 17,
        lineHeight: 26,
        color: '#374151',
        minHeight: 200,
    },
    toolbar: {
        flexDirection: 'row',
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    toolButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    toolText: {
        marginLeft: 8,
        color: '#4F46E5',
        fontWeight: '600',
    },
    imageContainer: {
        marginBottom: 20,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    fullImage: {
        width: '100%',
        height: 200,
        resizeMode: 'cover',
    },
    removeImageButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 4,
        borderRadius: 12,
    },
    deleteButton: {
        margin: 20,
        backgroundColor: '#FEF2F2',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    deleteText: {
        color: '#EF4444',
        fontWeight: '700',
        fontSize: 16,
    }
});
