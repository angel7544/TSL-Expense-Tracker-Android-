import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Image, Linking, StyleSheet, Platform, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Store } from '../data/Store';

interface InfoModalProps {
    visible: boolean;
    onClose: () => void;
    logoUri?: string | null;
}

export const InfoModal = ({ visible, onClose, logoUri }: InfoModalProps) => {
    const openLink = (url: string) => Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    const [isPlannerMode, setIsPlannerMode] = useState(Store.appMode === 'planner');

    useEffect(() => {
        setIsPlannerMode(Store.appMode === 'planner');
    }, [visible]);

    const toggleMode = (value: boolean) => {
        setIsPlannerMode(value);
        Store.setAppMode(value ? 'planner' : 'finance');
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
                    <BlurView style={styles.absolute} intensity={50} tint="dark" />
                ) : (
                    <View style={styles.absoluteAndroid} />
                )}
                
                <View style={styles.modalView}>
                    <TouchableOpacity 
                        style={styles.closeButton} 
                        onPress={onClose}
                    >
                        <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>

                    {logoUri && <Image source={{ uri: logoUri }} style={styles.modalLogo} />}
                    <Text style={styles.modalTitle}>Expense Tracker</Text>
                    <Text style={styles.modalVersion}>Version 3.4.0</Text>
                    
                    <View style={styles.modeContainer}>
                        <Text style={styles.modeLabel}>Planner Mode</Text>
                        <Switch
                            trackColor={{ false: "#767577", true: "#81b0ff" }}
                            thumbColor={isPlannerMode ? "#007bff" : "#f4f3f4"}
                            ios_backgroundColor="#3e3e3e"
                            onValueChange={toggleMode}
                            value={isPlannerMode}
                        />
                    </View>

                    <Text style={styles.devLabel}>Developed by</Text>
                    <Text style={styles.devName}>Angel (Mehul) Singh</Text>
                    <Text style={styles.companyName}>BR31TECHNOLOGIES</Text>

                    <View style={styles.linksContainer}>
                        <TouchableOpacity onPress={() => openLink("https://br31tech.live")} style={styles.linkButton}>
                            <Ionicons name="globe-outline" size={20} color="#fff" />
                            <Text style={styles.linkText}>Website</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => openLink("https://github.com/angel7544")} style={[styles.linkButton, { backgroundColor: "#333" }]}>
                            <Ionicons name="logo-github" size={20} color="#fff" />
                            <Text style={styles.linkText}>GitHub</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => openLink("https://linkedin.com/in/angel3002")} style={[styles.linkButton, { backgroundColor: "#0077b5" }]}>
                            <Ionicons name="logo-linkedin" size={20} color="#fff" />
                            <Text style={styles.linkText}>LinkedIn</Text>
                        </TouchableOpacity>
                    </View>
                </View>
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
        backgroundColor: "rgba(0,0,0,0.7)",
    },
    modalView: {
        margin: 20,
        backgroundColor: "white",
        borderRadius: 20,
        padding: 35,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '85%',
    },
    closeButton: {
        position: 'absolute',
        right: 15,
        top: 15,
    },
    modalLogo: {
        width: 80,
        height: 80,
        marginBottom: 15,
        borderRadius: 16,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#333',
    },
    modalVersion: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
    },
    modeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: '#F3F4F6',
        padding: 10,
        borderRadius: 12,
        width: '100%',
        justifyContent: 'space-between',
    },
    modeLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    devLabel: {
        fontSize: 12,
        color: '#888',
        marginBottom: 2,
    },
    devName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#007bff',
        marginBottom: 5,
    },
    companyName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#555',
        marginBottom: 25,
    },
    linksContainer: {
        width: '100%',
        gap: 10,
    },
    linkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#007bff',
        padding: 12,
        borderRadius: 10,
        width: '100%',
    },
    linkText: {
        color: 'white',
        fontWeight: 'bold',
        marginLeft: 8,
    }
});
