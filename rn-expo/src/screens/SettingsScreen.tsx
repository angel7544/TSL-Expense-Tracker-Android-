import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, StyleSheet, Platform, Image, Dimensions, KeyboardAvoidingView } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Store } from "../data/Store";
import { ImportExport } from "../services/ImportExport";
import { AppHeader } from "../components/AppHeader";
import { InputModal } from "../components/InputModal";
import { InfoModal } from "../components/InfoModal";

const { width, height } = Dimensions.get("window");

export default function SettingsScreen({ navigation }: any) {
  const [settings, setSettings] = useState(Store.getSettings());
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  // Hide/Show Tab Bar based on Auth State
  React.useEffect(() => {
    navigation.setOptions({
        tabBarStyle: {
            display: isAuthenticated ? 'flex' : 'none',
            position: 'absolute',
            bottom: 5,
            left: 20,
            right: 20,
            elevation: 0,
            backgroundColor: '#ffffff',
            borderRadius: 25,
            height: 65,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
            borderTopWidth: 0
        }
    });
  }, [isAuthenticated, navigation]);

  const updateSetting = (k: string, v: string) => setSettings({ ...settings, [k]: v });

  const saveSettings = () => {
    Store.setSettings(settings);
    Alert.alert("Success", "Profile settings saved");
  };

  const login = () => {
    const ok = Store.users[user] === pass;
    if (ok) {
        setIsAuthenticated(true);
        // Alert.alert("Login", "Authenticated");
    }
    else Alert.alert("Login", "Invalid credentials");
  };

  const signup = () => {
      if (!user || !pass || !email) {
          return Alert.alert("Error", "Please fill all fields");
      }
      if (pass !== confirmPass) {
          return Alert.alert("Error", "Passwords do not match");
      }
      
      // Register user
      Store.setUser(user, pass);
      
      // Update profile settings with signup info
      const newSettings = { 
          ...settings, 
          admin_name: user, 
          company_contact: email 
      };
      setSettings(newSettings);
      Store.setSettings(newSettings);

      setIsAuthenticated(true);
      Alert.alert("Success", "Account created and logged in!");
  };

  const changePassword = () => {
      // Simple stub for now - normally you'd want current/new/confirm
      if (!pass) return Alert.alert("Error", "Enter new password in the field above");
      Store.setUser(user, pass);
      Alert.alert("Success", "Password updated for " + user);
  };

  const pickLogo = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({ type: "image/*" });
        if (result.canceled) return;
        const file = result.assets?.[0];
        if (!file?.uri) return;
        const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
        const uri = `data:image/png;base64,${base64}`;
        setLogoPreview(uri);
        updateSetting("company_logo", uri); // Store base64 in settings (careful with size)
    } catch (e) {
        console.log(e);
    }
  };

  const pickSignature = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({ type: "image/*" });
        if (result.canceled) return;
        const file = result.assets?.[0];
        if (!file?.uri) return;
        const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
        const uri = `data:image/png;base64,${base64}`;
        setSignaturePreview(uri);
        updateSetting("admin_signature_image", uri);
    } catch (e) {
        console.log(e);
    }
  };

  const importSpreadsheet = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
        type: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.oasis.opendocument.spreadsheet", "application/vnd.ms-excel"]
        });
        if (result.canceled) return;
        const file = result.assets?.[0];
        if (!file?.uri) return;
        const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
        const rows = ImportExport.parseWorkbookBase64(base64);
        Store.importCSV(rows, "Spreadsheet");
        Alert.alert("Import", `Imported ${rows.length} rows from ${file.name || "file"}`);
    } catch (e: any) {
        Alert.alert("Error", e.message);
    }
  };

  const saveToStorage = async (content: string, filename: string, mime: string) => {
      try {
           // Save directly to application sandbox (internal storage) without asking for folder
           const uri = FileSystem.documentDirectory + filename;
           await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
           
           Alert.alert("Export Success", "File saved internally.\n" + filename + "\n\nUse 'Share' to send it elsewhere.");
           // Optional: Offer to share immediately
           // await Sharing.shareAsync(uri);
      } catch (e: any) {
          Alert.alert("Error", e.message);
      }
  };

  const handleExportSubmit = async (filename: string) => {
    setExportModalVisible(false);
    const finalName = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`;
    const records = await Store.list({});
    const csv = Store.exportCSV(records);
    saveToStorage(csv, finalName, "text/csv");
  };

  const exportCsv = () => {
    setExportModalVisible(true);
  };

  const backup = async () => {
    navigation.navigate("Backup");
  };

  if (!isAuthenticated) {
      return (
        <View style={styles.authContainer}>
            {/* Ambient Background Blobs */}
            <View style={[styles.blob, { top: -100, left: -50, backgroundColor: "#4F46E5" }]} />
            <View style={[styles.blob, { bottom: -100, right: -50, backgroundColor: "#EC4899" }]} />
            <View style={[styles.blob, { top: height/3, left: width/2, width: 200, height: 200, backgroundColor: "#8B5CF6", opacity: 0.4 }]} />

            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />

            {/* Info Button */}
            <TouchableOpacity 
                style={{
                    position: 'absolute',
                    top: 50,
                    right: 20,
                    zIndex: 50,
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.3)'
                }}
                onPress={() => setInfoModalVisible(true)}
            >
                <Ionicons name="information" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Home Button for Non-Logged Users */}
            <TouchableOpacity 
                style={{
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
                }}
                onPress={() => navigation.navigate("Home")}
            >
                <Ionicons name="home" size={24} color="#fff" />
            </TouchableOpacity>

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

  return (
    <View style={{ flex: 1, backgroundColor: "#F3F4F6" }}>
      <AppHeader title="Settings" subtitle="Preferences & Data" />
      <ScrollView 
        style={{ flex: 1, padding: 20 }}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
      
      <View style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>
        <TouchableOpacity onPress={() => setInfoModalVisible(true)}>
            <Ionicons name="information-circle-outline" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>PROFILE SETTINGS</Text>
      
      <View style={styles.modernCard}>
        <View style={styles.fieldRow}>
            <View style={styles.fieldIcon}>
                <Ionicons name="business-outline" size={20} color="#4F46E5" />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Company Name</Text>
                <TextInput 
                    value={settings.company_name} 
                    onChangeText={t => updateSetting("company_name", t)} 
                    style={styles.cleanInput}
                    placeholder="Enter Company Name" 
                />
            </View>
        </View>
        <View style={styles.separator} />
        
        <View style={styles.fieldRow}>
            <View style={styles.fieldIcon}>
                <Ionicons name="person-circle-outline" size={20} color="#4F46E5" />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Admin Name</Text>
                <TextInput 
                    value={settings.admin_name} 
                    onChangeText={t => updateSetting("admin_name", t)} 
                    style={styles.cleanInput}
                    placeholder="Your Name" 
                />
            </View>
        </View>
        <View style={styles.separator} />
        
        <View style={styles.fieldRow}>
            <View style={styles.fieldIcon}>
                <Ionicons name="briefcase-outline" size={20} color="#4F46E5" />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Role / Title</Text>
                <TextInput 
                    value={settings.admin_role} 
                    onChangeText={t => updateSetting("admin_role", t)} 
                    style={styles.cleanInput} 
                    placeholder="e.g. Finance Manager"
                />
            </View>
        </View>
        <View style={styles.separator} />

        <View style={styles.fieldRow}>
            <View style={styles.fieldIcon}>
                <Ionicons name="call-outline" size={20} color="#4F46E5" />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Contact Info</Text>
                <TextInput 
                    value={settings.company_contact} 
                    onChangeText={t => updateSetting("company_contact", t)} 
                    style={styles.cleanInput} 
                    placeholder="Email or Phone"
                />
            </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>REPORTING CUSTOMIZATION</Text>
      <View style={styles.modernCard}>
         <View style={styles.fieldRow}>
             <View style={{ flex: 1 }}>
                 <Text style={styles.fieldLabel}>Signature Footer Text</Text>
                 <TextInput 
                     value={settings.admin_signature} 
                     onChangeText={t => updateSetting("admin_signature", t)} 
                     style={styles.cleanInput} 
                     placeholder="e.g. Authorized Signatory"
                 />
             </View>
         </View>
         
         <View style={{ marginTop: 15, flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={pickSignature} style={styles.uploadButton}>
                <Ionicons name="image-outline" size={18} color="#4F46E5" />
                <Text style={styles.uploadButtonText}>Upload Signature</Text>
            </TouchableOpacity>
            {(signaturePreview || settings.admin_signature_image) && (
                <View style={styles.previewBox}>
                    <Image source={{ uri: signaturePreview || settings.admin_signature_image }} style={{ width: 80, height: 30, resizeMode: "contain" }} />
                </View>
            )}
         </View>

         <View style={{ height: 20 }} />
         <Text style={styles.fieldLabel}>PDF Page Format</Text>
         <View style={{ flexDirection: "row", marginTop: 10 }}>
            {['A4', 'A5'].map((size) => (
                <TouchableOpacity 
                    key={size}
                    onPress={() => updateSetting("pdf_page_size", size as any)}
                    style={[
                        styles.sizeOption, 
                        settings.pdf_page_size === size && styles.sizeOptionActive
                    ]}
                >
                    <Text style={[
                        styles.sizeOptionText,
                        settings.pdf_page_size === size && styles.sizeOptionTextActive
                    ]}>{size}</Text>
                </TouchableOpacity>
            ))}
         </View>

         <View style={{ marginTop: 20, flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={pickLogo} style={styles.uploadButton}>
                <Ionicons name="images-outline" size={18} color="#4F46E5" />
                <Text style={styles.uploadButtonText}>Upload Logo</Text>
            </TouchableOpacity>
            {(logoPreview || settings.company_logo) && (
                <View style={styles.previewBox}>
                    <Image source={{ uri: logoPreview || settings.company_logo }} style={{ width: 30, height: 30, resizeMode: "contain" }} />
                </View>
            )}
         </View>

         <TouchableOpacity onPress={saveSettings} style={styles.saveButton}>
             <Text style={styles.saveButtonText}>Save Profile Changes</Text>
         </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>SECURITY</Text>
      <View style={styles.modernCard}>
          <View style={styles.fieldRow}>
              <View style={styles.fieldIcon}>
                  <Ionicons name="key-outline" size={20} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Change Password</Text>
                  <TextInput 
                      value={pass} 
                      onChangeText={setPass} 
                      placeholder="Enter new password" 
                      secureTextEntry 
                      style={styles.cleanInput} 
                  />
              </View>
              <TouchableOpacity onPress={changePassword} style={styles.smallActionButton}>
                  <Text style={styles.smallActionText}>Update</Text>
              </TouchableOpacity>
          </View>
      </View>

      <Text style={styles.sectionTitle}>DATA MANAGEMENT</Text>
      <View style={styles.modernCard}>
          <TouchableOpacity onPress={importSpreadsheet} style={styles.actionItem}>
            <View style={[styles.actionIconBox, { backgroundColor: "#ECFDF5" }]}>
                <Ionicons name="cloud-upload-outline" size={22} color="#10B981" />
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.actionTitle}>Import Data</Text>
                <Text style={styles.actionSubtitle}>Support for XLSX, ODS</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity onPress={exportCsv} style={styles.actionItem}>
            <View style={[styles.actionIconBox, { backgroundColor: "#EFF6FF" }]}>
                <Ionicons name="download-outline" size={22} color="#3B82F6" />
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.actionTitle}>Export CSV</Text>
                <Text style={styles.actionSubtitle}>Download expense records</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity onPress={backup} style={styles.actionItem}>
            <View style={[styles.actionIconBox, { backgroundColor: "#FFFBEB" }]}>
                <Ionicons name="server-outline" size={22} color="#F59E0B" />
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.actionTitle}>Full Backup</Text>
                <Text style={styles.actionSubtitle}>Save JSON backup file</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>
      </View>
      
      <View style={{ height: 60 }} />
      </ScrollView>

      <InputModal
        visible={exportModalVisible}
        title="Export CSV"
        placeholder="Enter filename"
        initialValue={`expenses_${Date.now()}`}
        onClose={() => setExportModalVisible(false)}
        onSubmit={handleExportSubmit}
        submitLabel="Export"
      />

      <InfoModal 
        visible={infoModalVisible} 
        onClose={() => setInfoModalVisible(false)} 
        logoUri={settings.company_logo} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
    // Modern "2026" Auth Styles
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

    // Settings Screen Styles
    sectionTitle: { fontSize: 13, fontWeight: "700", color: "#6B7280", marginTop: 24, marginBottom: 12, paddingLeft: 4, letterSpacing: 1 },
    modernCard: { 
        backgroundColor: "#fff", borderRadius: 20, padding: 20, 
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 
    },
    fieldRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
    fieldIcon: { 
        width: 36, height: 36, borderRadius: 10, backgroundColor: "#EEF2FF", 
        justifyContent: "center", alignItems: "center", marginRight: 16 
    },
    fieldLabel: { fontSize: 12, color: "#6B7280", fontWeight: "600", marginBottom: 2 },
    cleanInput: { 
        fontSize: 16, color: "#1F2937", fontWeight: "500", paddingVertical: 4, 
        borderBottomWidth: 1, borderBottomColor: "transparent" 
    },
    separator: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 12, marginLeft: 52 },
    
    uploadButton: { 
        flexDirection: "row", alignItems: "center", backgroundColor: "#EEF2FF", 
        paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 12 
    },
    uploadButtonText: { color: "#4F46E5", fontWeight: "600", fontSize: 13, marginLeft: 6 },
    previewBox: { padding: 4, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 6, backgroundColor: "#fff" },
    
    sizeOption: { 
        flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10, 
        backgroundColor: "#F3F4F6", marginHorizontal: 4, borderWidth: 1, borderColor: "transparent"
    },
    sizeOptionActive: { backgroundColor: "#fff", borderColor: "#4F46E5", shadowColor: "#4F46E5", shadowOpacity: 0.1, shadowRadius: 4, elevation: 1 },
    sizeOptionText: { color: "#6B7280", fontWeight: "600" },
    sizeOptionTextActive: { color: "#4F46E5" },

    saveButton: { 
        backgroundColor: "#111827", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 24,
        shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 5, elevation: 2
    },
    saveButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },

    smallActionButton: { backgroundColor: "#F59E0B", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    smallActionText: { color: "#fff", fontSize: 12, fontWeight: "700" },

    actionItem: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
    actionIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    actionTitle: { fontSize: 16, fontWeight: "600", color: "#1F2937" },
    actionSubtitle: { fontSize: 12, color: "#9CA3AF", marginTop: 1 }
});
