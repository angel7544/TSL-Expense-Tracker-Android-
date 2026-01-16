import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert, Modal, ScrollView, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Store, Note } from '../../data/Store';
import { UIContext } from '../../context/UIContext';
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";

const { width } = Dimensions.get('window');

export const NotesScreen = () => {
    const { theme } = useContext(UIContext);
    const styles = useMemo(() => getStyles(theme), [theme]);
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
            is_important: !!currentNote.is_important
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

            const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
            const ext = (file.name || "").split(".").pop()?.toLowerCase();
            const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
            const dataUri = `data:${mime};base64,${base64}`;
            
            setCurrentNote(prev => ({ ...prev, image_uri: dataUri }));
        } catch (e) {
            console.log(e);
            Alert.alert("Error", "Failed to pick image");
        }
    };

    const renderItem = ({ item }: { item: Note }) => (
        <TouchableOpacity onPress={() => openNote(item)} style={[styles.card, !!item.is_important && styles.cardImportant]}>
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
                        <Ionicons name="swap-horizontal" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={createNote} style={[styles.addButton, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}>
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
                                <Text style={[styles.saveText, { color: theme.colors.primary }]}>Save</Text>
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
                                <Ionicons name="image-outline" size={24} color={theme.colors.primary} />
                                <Text style={[styles.toolText, { color: theme.colors.primary }]}>Add Image</Text>
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
        width: '48%',
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
    },
    cardImportant: {
        borderColor: theme.colors.warning,
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
        color: theme.colors.text,
    },
    cardPreview: {
        fontSize: 13,
        color: theme.colors.subtext,
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
        color: theme.colors.subtext,
    },
    emptyText: {
        textAlign: 'center',
        color: theme.colors.subtext,
        marginTop: 60,
        fontSize: 16,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: theme.colors.card,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerctions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 16,
        color: theme.colors.danger,
    },
    saveText: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    modalContent: {
        flex: 1,
        padding: 24,
    },
    inputTitle: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 20,
        color: theme.colors.text,
    },
    inputContent: {
        fontSize: 17,
        lineHeight: 26,
        color: theme.colors.text,
        minHeight: 200,
    },
    toolbar: {
        flexDirection: 'row',
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    toolButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.mode === 'dark' ? theme.colors.surface : '#EEF2FF',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    toolText: {
        marginLeft: 8,
        color: theme.colors.primary,
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
        backgroundColor: theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#FEF2F2',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    deleteText: {
        color: theme.colors.danger,
        fontWeight: '700',
        fontSize: 16,
    }
});
