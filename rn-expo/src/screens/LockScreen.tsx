import React, { useState, useEffect, useContext, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Dimensions, Platform } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { Store } from "../data/Store";
import { UIContext } from "../context/UIContext";
import { getTheme } from "../constants/Theme";

const { width } = Dimensions.get("window");

interface LockScreenProps {
    onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
    const { theme } = useContext(UIContext);
    const styles = useMemo(() => getStyles(theme), [theme]);
    
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
                        onUnlock(); 
                    } 
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <Ionicons name="lock-closed" size={40} color={theme.colors.primary} />
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
                                            <Ionicons name="finger-print" size={32} color={theme.colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                );
                            }
                            if (item === 'del') {
                                return (
                                    <TouchableOpacity key="del" style={styles.key} onPress={handleDelete}>
                                        <Ionicons name="backspace-outline" size={28} color={theme.colors.text} />
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

const getStyles = (theme: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 40
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.mode === 'dark' ? theme.colors.card : theme.colors.primary + '20', // Light opacity
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: theme.colors.text,
        marginBottom: 8
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.subtext,
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
        borderColor: theme.colors.placeholder,
        marginHorizontal: 12
    },
    pinDotFilled: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary
    },
    pinDotError: {
        borderColor: theme.colors.danger,
        backgroundColor: theme.colors.danger + '40' // lighter danger
    },
    errorText: {
        color: theme.colors.danger,
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
        backgroundColor: theme.colors.card,
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
        color: theme.colors.text
    },
    forgotButton: {
        marginTop: 20
    },
    forgotText: {
        color: theme.colors.primary,
        fontWeight: '600'
    }
});
