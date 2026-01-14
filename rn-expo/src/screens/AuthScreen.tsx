import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, StyleSheet, Platform, KeyboardAvoidingView, Dimensions, GestureResponderEvent } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Store } from "../data/Store";

const { width, height } = Dimensions.get("window");

// Add navigation prop to AuthScreen to support tab mode navigation
export default function AuthScreen({ navigation, onClose }: { navigation?: any, onClose?: () => void }) {
    const [user, setUser] = useState("");
    const [pass, setPass] = useState("");
    const [email, setEmail] = useState("");
    const [confirmPass, setConfirmPass] = useState("");
    const [isLoginMode, setIsLoginMode] = useState(true);

    const login = () => {
        const ok = Store.users[user] === pass;
        if (ok) {
            Store.setAuthenticated(true);
            // Instead of closing modal, just update auth state
            // If in tab mode, this will switch to the next tab (Backup)
            if (onClose) onClose();
        } else {
            Alert.alert("Login", "Invalid credentials");
        }
    };

    const signup = () => {
        if (!user || !pass || !email) {
            return Alert.alert("Error", "Please fill all fields");
        }
        if (pass !== confirmPass) {
            return Alert.alert("Error", "Passwords do not match");
        }
        
        Store.setUser(user, pass);
        
        // Update profile settings
        const currentSettings = Store.getSettings();
        const newSettings = { 
            ...currentSettings, 
            admin_name: user, 
            company_contact: email 
        };
        Store.setSettings(newSettings);

        Store.setAuthenticated(true);
        Store.setAuthModalVisible(false); // Close modal on success
        if (onClose) onClose();
        Alert.alert("Success", "Account created and logged in!");
    };

    // We don't need a close button if it's a tab, but if used as modal it's fine.
    // However, if we are in a tab, 'onClose' might not be passed or might not navigate away.
    // In tab mode, successful login will just update state and the parent navigator will switch tabs.
    const handleClose = () => {
        Store.setAuthModalVisible(false);
        if (onClose) onClose();
    };

    // Implement the handleHome function to navigate back to the main tab screen when the home button is pressed in tab mode
    function handleHome(event: GestureResponderEvent): void {
        if (navigation) {
            navigation.navigate("Home");
        }
    }

    return (
        <View style={styles.authContainer}>
            {/* Ambient Background Blobs */}
            <View style={[styles.blob, { top: -100, left: -50, backgroundColor: "#4F46E5" }]} />
            <View style={[styles.blob, { bottom: -100, right: -50, backgroundColor: "#EC4899" }]} />
            <View style={[styles.blob, { top: height/3, left: width/2, width: 200, height: 200, backgroundColor: "#8B5CF6", opacity: 0.4 }]} />

            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />

            {/* Close/Home Button - Only show if onClose is provided (modal mode) */}
            {onClose && (
            <TouchableOpacity 
                style={styles.closeButton}
                onPress={handleClose}
            >
                <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            )}

            {/* Home Button - Show if navigation is available (Tab mode) and not in modal */}
            {!onClose && navigation && (
            <TouchableOpacity 
                style={[styles.closeButton, { left: 20 }]} 
                onPress={handleHome}
            >
                <Ionicons name="home" size={24} color="#fff" />
            </TouchableOpacity>
            )}

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, justifyContent: "center" }}>
            <ScrollView 
                contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
            >
                <View style={{ alignItems: "center", marginBottom: 50 }}>
                    <View style={styles.logoContainer}>
                        <Ionicons name="stats-chart" size={48} color="#fff" />
                    </View>
                    <Text style={styles.authTitle}>
                        {isLoginMode ? "Welcome Back" : "Create Account"}
                    </Text>
                    <Text style={styles.authSubtitle}>
                        {isLoginMode ? "Sign in to access your finance dashboard" : "Join us and manage your expenses effectively"}
                    </Text>
                </View>

                <View style={styles.authFormCard}>
                    <View style={styles.inputGroup}>
                        <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput 
                            value={user} 
                            onChangeText={setUser} 
                            placeholder="Username" 
                            placeholderTextColor="#6B7280"
                            style={styles.modernInput} 
                        />
                    </View>

                    {!isLoginMode && (
                        <View style={styles.inputGroup}>
                            <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                            <TextInput 
                                value={email} 
                                onChangeText={setEmail} 
                                placeholder="Email Address" 
                                placeholderTextColor="#6B7280"
                                keyboardType="email-address"
                                style={styles.modernInput} 
                            />
                        </View>
                    )}

                    <View style={styles.inputGroup}>
                        <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput 
                            value={pass} 
                            onChangeText={setPass} 
                            placeholder="Password" 
                            placeholderTextColor="#6B7280"
                            secureTextEntry 
                            style={styles.modernInput} 
                        />
                    </View>

                    {!isLoginMode && (
                        <View style={styles.inputGroup}>
                            <Ionicons name="shield-checkmark-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                            <TextInput 
                                value={confirmPass} 
                                onChangeText={setConfirmPass} 
                                placeholder="Confirm Password" 
                                placeholderTextColor="#6B7280"
                                secureTextEntry 
                                style={styles.modernInput} 
                            />
                        </View>
                    )}

                    <TouchableOpacity onPress={isLoginMode ? login : signup} style={styles.gradientButton}>
                        <Text style={styles.gradientButtonText}>{isLoginMode ? "SIGN IN" : "SIGN UP"}</Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => setIsLoginMode(!isLoginMode)} style={{ alignSelf: "center", marginTop: 30 }}>
                    <Text style={styles.switchAuthText}>
                        {isLoginMode ? "New here? " : "Already have an account? "}
                        <Text style={{ color: "#818CF8", fontWeight: "bold" }}>{isLoginMode ? "Create Account" : "Sign In"}</Text>
                    </Text>
                </TouchableOpacity>
            </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    authContainer: { flex: 1, backgroundColor: "#111827", position: "relative" },
    blob: { position: "absolute", width: 300, height: 300, borderRadius: 150 },
    logoContainer: { 
        width: 80, height: 80, borderRadius: 24, 
        backgroundColor: "rgba(255,255,255,0.1)", 
        justifyContent: "center", alignItems: "center", marginBottom: 20,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.2)"
    },
    authTitle: { fontSize: 32, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },
    authSubtitle: { fontSize: 14, color: "#9CA3AF", marginTop: 8, textAlign: "center", maxWidth: "80%" },
    authFormCard: { 
        width: "100%", backgroundColor: "rgba(31, 41, 55, 0.7)", 
        borderRadius: 24, padding: 24, 
        borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
        shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20
    },
    inputGroup: { 
        flexDirection: "row", alignItems: "center", 
        backgroundColor: "rgba(17, 24, 39, 0.6)", 
        borderRadius: 16, marginBottom: 16, paddingHorizontal: 16, height: 56,
        borderWidth: 1, borderColor: "rgba(75, 85, 99, 0.4)"
    },
    inputIcon: { marginRight: 12 },
    modernInput: { flex: 1, color: "#fff", fontSize: 16 },
    gradientButton: { 
        backgroundColor: "#4F46E5", flexDirection: "row", justifyContent: "center", alignItems: "center",
        height: 56, borderRadius: 16, marginTop: 8,
        shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6
    },
    gradientButtonText: { color: "#fff", fontWeight: "700", fontSize: 16, marginRight: 8 },
    switchAuthText: { color: "#D1D5DB", fontSize: 14 },
    closeButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 50,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)'
    }
});