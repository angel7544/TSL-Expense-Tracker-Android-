import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Dimensions, Platform } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { Store } from "../data/Store";

const { width } = Dimensions.get("window");

interface LockScreenProps {
    onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");
    
    useEffect(() => {
        checkBiometrics();
    }, []);

    const checkBiometrics = async () => {
        if (!Store.settings.biometrics_enabled) return;
        
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        
        if (hasHardware && isEnrolled) {
            authenticate();
        }
    };

    const authenticate = async () => {
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Unlock App',
            fallbackLabel: 'Use PIN',
        });
        
        if (result.success) {
            onUnlock();
        }
    };

    const handlePress = (digit: string) => {
        if (pin.length >= 4) return;
        
        const newPin = pin + digit;
        setPin(newPin);
        
        if (!Store.settings.lock_enabled) return;
        
        setError("");

        if (newPin.length === 4) {
            if (newPin === Store.settings.lock_pin) {
                setTimeout(() => onUnlock(), 100);
            } else {
                setError("Incorrect PIN");
                setTimeout(() => setPin(""), 500);
            }
        }
    };

    const handleDelete = () => {
        setPin(pin.slice(0, -1));
        setError("");
    };

    const handleForgot = () => {
        Alert.alert(
            "Forgot PIN?",
            "You can log out and sign in again with your password to access the app. This will keep the lock enabled but allow you to re-enter.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Log Out", 
                    style: "destructive", 
                    onPress: () => {
                        Store.setAuthenticated(false);
                        // Store.settings.lock_enabled = false; // Optional: disable lock on reset?
                        // Store.setSettings({ lock_enabled: false }); // Let's keep it enabled but they can change it in settings
                        onUnlock(); // Hide lock screen so Auth screen can show
                    } 
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <Ionicons name="lock-closed" size={40} color="#4F46E5" />
            </View>
            <Text style={styles.title}>App Locked</Text>
            <Text style={styles.subtitle}>Enter your 4-digit PIN</Text>

            <View style={styles.pinDisplay}>
                {[0, 1, 2, 3].map(i => (
                    <View key={i} style={[
                        styles.pinDot, 
                        pin.length > i ? styles.pinDotFilled : null,
                        error ? styles.pinDotError : null
                    ]} />
                ))}
            </View>
            
            {error ? <Text style={styles.errorText}>{error}</Text> : <View style={{height: 20}} />}

            <View style={styles.keypad}>
                {[
                    [1, 2, 3],
                    [4, 5, 6],
                    [7, 8, 9],
                    ['bio', 0, 'del']
                ].map((row, rowIndex) => (
                    <View key={rowIndex} style={styles.row}>
                        {row.map((item, colIndex) => {
                            if (item === 'bio') {
                                return (
                                    <TouchableOpacity 
                                        key="bio" 
                                        style={styles.key} 
                                        onPress={authenticate}
                                        disabled={!Store.settings.biometrics_enabled}
                                    >
                                        {Store.settings.biometrics_enabled && (
                                            <Ionicons name="finger-print" size={32} color="#4F46E5" />
                                        )}
                                    </TouchableOpacity>
                                );
                            }
                            if (item === 'del') {
                                return (
                                    <TouchableOpacity key="del" style={styles.key} onPress={handleDelete}>
                                        <Ionicons name="backspace-outline" size={28} color="#1F2937" />
                                    </TouchableOpacity>
                                );
                            }
                            return (
                                <TouchableOpacity 
                                    key={item} 
                                    style={styles.key} 
                                    onPress={() => handlePress(item.toString())}
                                >
                                    <Text style={styles.keyText}>{item}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))}
            </View>

            <TouchableOpacity style={styles.forgotButton} onPress={handleForgot}>
                <Text style={styles.forgotText}>Forgot PIN?</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 40
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        shadowColor: "#4F46E5",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1F2937',
        marginBottom: 8
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 40
    },
    pinDisplay: {
        flexDirection: 'row',
        marginBottom: 20
    },
    pinDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#9CA3AF',
        marginHorizontal: 12
    },
    pinDotFilled: {
        backgroundColor: '#4F46E5',
        borderColor: '#4F46E5'
    },
    pinDotError: {
        borderColor: '#EF4444',
        backgroundColor: '#FCA5A5'
    },
    errorText: {
        color: '#EF4444',
        marginBottom: 20,
        fontWeight: '600'
    },
    keypad: {
        width: '100%',
        maxWidth: 320,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20
    },
    key: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2
    },
    keyText: {
        fontSize: 28,
        fontWeight: '600',
        color: '#1F2937'
    },
    forgotButton: {
        marginTop: 20
    },
    forgotText: {
        color: '#4F46E5',
        fontWeight: '600'
    }
});
