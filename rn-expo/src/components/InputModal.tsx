import React, { useState, useContext } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { UIContext } from '../context/UIContext';

interface InputModalProps {
    visible: boolean;
    title: string;
    message?: string;
    placeholder?: string;
    initialValue?: string;
    onClose: () => void;
    onSubmit: (value: string) => void;
    submitLabel?: string;
    secureTextEntry?: boolean;
    keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'numeric' | 'email-address' | 'phone-pad';
    maxLength?: number;
}

export const InputModal = ({ 
    visible, 
    title, 
    message, 
    placeholder = "Enter value", 
    initialValue = "", 
    onClose, 
    onSubmit,
    submitLabel = "Save",
    secureTextEntry = false,
    keyboardType = 'default',
    maxLength
}: InputModalProps) => {
    const { theme } = useContext(UIContext);
    const [value, setValue] = useState(initialValue);

    React.useEffect(() => {
        if (visible) setValue(initialValue);
    }, [visible, initialValue]);

    const handleSubmit = () => {
        onSubmit(value);
        onClose();
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                {Platform.OS === 'ios' ? (
                    <BlurView style={styles.absolute} intensity={30} tint={theme.mode === 'dark' ? 'dark' : 'light'} />
                ) : (
                    <View style={styles.absoluteAndroid} />
                )}

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: '100%', alignItems: 'center' }}>
                    <View style={[styles.modalView, { backgroundColor: theme.colors.card }]}>
                        <View style={styles.header}>
                            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{title}</Text>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color={theme.colors.subtext} />
                            </TouchableOpacity>
                        </View>
                        
                        {message && <Text style={[styles.modalMessage, { color: theme.colors.subtext }]}>{message}</Text>}

                        <TextInput
                            style={[
                                styles.input, 
                                { 
                                    backgroundColor: theme.colors.input, 
                                    borderColor: theme.colors.border,
                                    color: theme.colors.text
                                }
                            ]}
                            placeholder={placeholder}
                            placeholderTextColor={theme.colors.placeholder}
                            value={value}
                            onChangeText={setValue}
                            autoFocus={true}
                            onSubmitEditing={handleSubmit}
                            secureTextEntry={secureTextEntry}
                            keyboardType={keyboardType}
                            maxLength={maxLength}
                        />

                        <View style={styles.buttonRow}>
                            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                                <Text style={[styles.cancelButtonText, { color: theme.colors.subtext }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.submitButton, { backgroundColor: theme.colors.primary }]} onPress={handleSubmit}>
                                <Text style={styles.submitButtonText}>{submitLabel}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    absolute: {
        position: "absolute",
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
    },
    absoluteAndroid: {
        position: "absolute",
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalView: {
        width: '85%',
        backgroundColor: "white",
        borderRadius: 20,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    modalMessage: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        marginBottom: 24,
        backgroundColor: '#f9f9f9',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    cancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    cancelButtonText: {
        color: '#666',
        fontWeight: '600',
        fontSize: 16,
    },
    submitButton: {
        backgroundColor: '#4F46E5',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    submitButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
});
