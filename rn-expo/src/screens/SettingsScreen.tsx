import React, { useState, useEffect, useContext, useMemo } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, StyleSheet, Platform, Image, Dimensions, KeyboardAvoidingView, Switch, GestureResponderEvent } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Store } from "../data/Store";
import { ImportExport } from "../services/ImportExport";
import { AppHeader } from "../components/AppHeader";
import { InputModal } from "../components/InputModal";
import { InfoModal } from "../components/InfoModal";
import { UIContext } from "../context/UIContext";
import { Palettes } from "../constants/Theme";

const { width, height } = Dimensions.get("window");

export default function SettingsScreen({ navigation }: any) {
  const { theme, showOnboarding } = useContext(UIContext);
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [settings, setSettings] = useState(Store.getSettings());
  const [pass, setPass] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(Store.isAuthenticated);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinMode, setPinMode] = useState<'enable' | 'change'>('enable');
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [availableDbs, setAvailableDbs] = useState<any[]>([]);

  useEffect(() => {
      const unsub = Store.subscribe(() => {
          setIsAuthenticated(Store.isAuthenticated);
      });
      checkBiometrics();
      Store.getRecentDatabases().then(setAvailableDbs);
      return unsub;
  }, []);

  const checkBiometrics = async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricsAvailable(hasHardware && isEnrolled);
  };

  const updateSetting = (k: string, v: string | boolean) => setSettings({ ...settings, [k]: v });

  const saveSettings = () => {
    Store.setSettings(settings);
    Alert.alert("Success", "Profile settings saved");
  };

  const logout = () => {
      Store.setAuthenticated(false);
      // Alert.alert("Logged Out", "You have been logged out.");
  };

  const openLogin = () => {
      // Store.setAuthModalVisible(true);
      // No longer used since we have a dedicated Login tab
  };

  const changePassword = () => {
      // Simple stub for now - normally you'd want current/new/confirm
      if (!pass) return Alert.alert("Error", "Enter new password in the field above");
      Store.setUser(settings.admin_name, pass);
      Alert.alert("Success", "Password updated for " + settings.admin_name);
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

  const toggleLock = (value: boolean) => {
    if (value) {
      setPinMode('enable');
      setPinModalVisible(true);
    } else {
      const newSettings = { ...settings, lock_enabled: false };
      setSettings(newSettings);
      Store.setSettings(newSettings);
    }
  };

  const toggleBiometrics = (value: boolean) => {
      const newSettings = { ...settings, biometrics_enabled: value };
      setSettings(newSettings);
      Store.setSettings(newSettings);
  };

  const toggleAutoBackup = (value: boolean) => {
      const newSettings = { ...settings, backup_enabled: value };
      setSettings(newSettings);
      Store.setSettings(newSettings);
      if (value) {
          // Check immediately if we should run a backup
          setTimeout(() => Store.runScheduledBackupIfDue(), 1000);
      }
  };

  const changeBackupFrequency = (value: 'daily' | 'weekly' | 'monthly') => {
      const newSettings = { ...settings, backup_frequency: value };
      setSettings(newSettings);
      Store.setSettings(newSettings);
  };

  const changeBackupTime = (value: string) => {
      const newSettings = { ...settings, backup_time: value };
      setSettings(newSettings);
      Store.setSettings(newSettings);
      // Check if the new time makes it due immediately
      setTimeout(() => Store.runScheduledBackupIfDue(), 1000);
  };

  const manualBackupNow = async () => {
      try {
          const result = await Store.runManualBackupNow();
          if (result && typeof result.created === "number") {
              if (result.created > 0) {
                  const message = result.failed && result.failed > 0
                      ? `Created ${result.created} backup(s).\nFailed: ${result.failed}.`
                      : `Created ${result.created} backup(s).`;
                  Alert.alert("Backup Complete", message);
              } else {
                  Alert.alert("Backup", "No backups were created.");
              }
          } else {
              Alert.alert("Backup Complete", "Backup finished.");
          }
      } catch (e: any) {
          Alert.alert("Error", e.message || "Failed to create backup");
      }
  };

  const changePin = () => {
    setPinMode('change');
    setPinModalVisible(true);
  };

  const handlePinSubmit = (pin: string) => {
    if (pin.length !== 4) {
      Alert.alert("Error", "PIN must be 4 digits");
      return;
    }
    
    const newSettings = { 
      ...settings, 
      lock_enabled: true, 
      lock_pin: pin 
    };
    setSettings(newSettings);
    Store.setSettings(newSettings);
    
    setPinModalVisible(false);
    Alert.alert("Success", pinMode === 'enable' ? "App Lock enabled" : "PIN updated");
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Settings" subtitle="App Preferences" />
      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
      
      <View style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>
        <TouchableOpacity onPress={() => setInfoModalVisible(true)}>
            <Ionicons name="information-circle-outline" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>PROFILE SETTINGS</Text>
      
      <View style={styles.modernCard}>
        <View style={styles.fieldRow}>
            <View style={styles.fieldIcon}>
                <Ionicons name="business-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Company Name</Text>
                <TextInput 
                    value={settings.company_name} 
                    onChangeText={t => updateSetting("company_name", t)} 
                    style={styles.cleanInput}
                    placeholder="Enter Company Name" 
                    placeholderTextColor={theme.colors.placeholder}
                />
            </View>
        </View>
        <View style={styles.separator} />

        <View style={styles.fieldRow}>
            <View style={styles.fieldIcon}>
                <Ionicons name="location-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Company Address</Text>
                <TextInput 
                    value={settings.company_address} 
                    onChangeText={t => updateSetting("company_address", t)} 
                    style={styles.cleanInput} 
                    placeholder="Address"
                    placeholderTextColor={theme.colors.placeholder}
                />
            </View>
        </View>
        <View style={styles.separator} />
        
        <View style={styles.fieldRow}>
            <View style={styles.fieldIcon}>
                <Ionicons name="person-circle-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Admin Name</Text>
                <TextInput 
                    value={settings.admin_name} 
                    onChangeText={t => updateSetting("admin_name", t)} 
                    style={styles.cleanInput}
                    placeholder="Your Name" 
                    placeholderTextColor={theme.colors.placeholder}
                />
            </View>
        </View>
        <View style={styles.separator} />
        
        <View style={styles.fieldRow}>
            <View style={styles.fieldIcon}>
                <Ionicons name="briefcase-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Role / Title</Text>
                <TextInput 
                    value={settings.admin_role} 
                    onChangeText={t => updateSetting("admin_role", t)} 
                    style={styles.cleanInput} 
                    placeholder="e.g. Finance Manager"
                    placeholderTextColor={theme.colors.placeholder}
                />
            </View>
        </View>
        <View style={styles.separator} />

        <View style={styles.fieldRow}>
            <View style={styles.fieldIcon}>
                <Ionicons name="call-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Contact Info</Text>
                <TextInput 
                    value={settings.company_contact} 
                    onChangeText={t => updateSetting("company_contact", t)} 
                    style={styles.cleanInput} 
                    placeholder="Email or Phone"
                    placeholderTextColor={theme.colors.placeholder}
                />
            </View>
        </View>
        <View style={styles.separator} />

        <View style={styles.fieldRow}>
            <View style={styles.fieldIcon}>
                <Ionicons name="receipt-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Company GSTIN</Text>
                <TextInput 
                    value={settings.company_gst} 
                    onChangeText={t => updateSetting("company_gst", t)} 
                    style={styles.cleanInput} 
                    placeholder="GST Number"
                    placeholderTextColor={theme.colors.placeholder}
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
                     placeholderTextColor={theme.colors.placeholder}
                 />
             </View>
         </View>
         
         <View style={{ marginTop: 15, flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={pickSignature} style={styles.uploadButton}>
                <Ionicons name="image-outline" size={18} color={theme.colors.primary} />
                <Text style={styles.uploadButtonText}>Upload Signature</Text>
            </TouchableOpacity>
            {(signaturePreview || settings.admin_signature_image) && (
                <View style={styles.previewBox}>
                    <Image source={{ uri: signaturePreview || settings.admin_signature_image }} style={{ width: 80, height: 30, resizeMode: "contain" }} />
                </View>
            )}
         </View>

         <View style={{ height: 20 }} />
         <Text style={styles.fieldLabel}>Default Start Screen</Text>
         <View style={{ flexDirection: "row", marginTop: 10 }}>
            {['finance', 'planner'].map((mode) => (
                <TouchableOpacity 
                    key={mode}
                    onPress={() => updateSetting("default_view", mode as any)}
                    style={[
                        styles.sizeOption, 
                        settings.default_view === mode && styles.sizeOptionActive
                    ]}
                >
                    <Text style={[
                        styles.sizeOptionText,
                        settings.default_view === mode && styles.sizeOptionTextActive
                    ]}>{mode === 'finance' ? 'Expense Tracker' : 'Planner'}</Text>
                </TouchableOpacity>
            ))}
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
                <Ionicons name="images-outline" size={18} color={theme.colors.primary} />
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

      <Text style={styles.sectionTitle}>APPEARANCE</Text>
      <View style={styles.modernCard}>
        <View style={styles.fieldRow}>
            <View style={styles.fieldIcon}>
                <Ionicons name="color-palette-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Navigation Style</Text>
                <Text style={styles.actionSubtitle}>Choose your bottom bar look</Text>
            </View>
        </View>
        
        <View style={{ flexDirection: 'row', marginTop: 12, gap: 10, marginBottom: 16 }}>
            {['classic', 'glass'].map((style) => (
                <TouchableOpacity 
                    key={style}
                    style={[
                        styles.dbOption, 
                        { flex: 1, marginBottom: 0 },
                        (settings.navbar_style === style || (!settings.navbar_style && style === 'classic')) && styles.dbOptionActive
                    ]}
                    onPress={() => {
                        const newSettings = { ...settings, navbar_style: style as 'classic' | 'glass' };
                        setSettings(newSettings);
                        Store.setSettings(newSettings);
                    }}
                >
                    <Text style={[
                        styles.dbOptionText, 
                        { textAlign: 'center' },
                        (settings.navbar_style === style || (!settings.navbar_style && style === 'classic')) && styles.dbOptionTextActive
                    ]}>
                        {style.charAt(0).toUpperCase() + style.slice(1)}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
        
        <View style={styles.separator} />
        
        <View style={styles.fieldRow}>
            <View style={styles.fieldIcon}>
                <Ionicons name="color-filter-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>App Theme</Text>
                <Text style={styles.actionSubtitle}>Select your primary color</Text>
            </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12, marginBottom: 4 }}>
            {Object.keys(Palettes).map((p) => (
                <TouchableOpacity
                    key={p}
                    onPress={() => {
                        const newSettings = { ...settings, theme_name: p as any };
                        setSettings(newSettings);
                        Store.setSettings(newSettings);
                    }}
                    style={{
                        width: 38, height: 38, borderRadius: 20,
                        backgroundColor: Palettes[p as keyof typeof Palettes].primary,
                        justifyContent: 'center', alignItems: 'center',
                        borderWidth: (settings.theme_name || 'indigo') === p ? 3 : 0,
                        borderColor: theme.colors.text
                    }}
                >
                    {(settings.theme_name || 'indigo') === p && <Ionicons name="checkmark" size={24} color="#fff" />}
                </TouchableOpacity>
            ))}
        </View>

        <View style={styles.separator} />

        <View style={styles.fieldRow}>
            <View style={styles.fieldIcon}>
                <Ionicons name={(settings.theme_mode || 'light') === 'dark' ? "moon" : "sunny"} size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Dark Mode</Text>
                <Text style={styles.actionSubtitle}>Switch between light and dark themes</Text>
            </View>
             <Switch 
                value={(settings.theme_mode || 'light') === 'dark'}
                onValueChange={(v) => {
                    const newSettings = { ...settings, theme_mode: (v ? 'dark' : 'light') as 'dark' | 'light' };
                    setSettings(newSettings);
                    Store.setSettings(newSettings);
                }}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={"#fff"}
            />
        </View>
      </View>

      <Text style={styles.sectionTitle}>SECURITY</Text>
      <View style={styles.modernCard}>
          <View style={styles.fieldRow}>
              <View style={styles.fieldIcon}>
                  <Ionicons name="lock-closed-outline" size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>App Lock</Text>
                  <Text style={styles.actionSubtitle}>Require PIN to open app</Text>
              </View>
              <Switch 
                  value={settings.lock_enabled} 
                  onValueChange={toggleLock}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={"#fff"}
              />
          </View>

          {settings.lock_enabled && (
            <>
                <View style={styles.separator} />
                <TouchableOpacity onPress={changePin} style={styles.fieldRow}>
                    <View style={styles.fieldIcon}>
                        <Ionicons name="keypad-outline" size={20} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Change PIN</Text>
                        <Text style={styles.actionSubtitle}>Update your 4-digit PIN</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
                </TouchableOpacity>

                {biometricsAvailable && (
                    <>
                        <View style={styles.separator} />
                        <View style={styles.fieldRow}>
                            <View style={styles.fieldIcon}>
                                <Ionicons name="finger-print-outline" size={20} color={theme.colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.fieldLabel}>Biometrics</Text>
                                <Text style={styles.actionSubtitle}>Use Fingerprint/FaceID</Text>
                            </View>
                            <Switch 
                                value={!!settings.biometrics_enabled} 
                                onValueChange={toggleBiometrics}
                                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                                thumbColor={"#fff"}
                            />
                        </View>
                    </>
                )}
            </>
          )}

          <View style={styles.separator} />

          <View style={styles.fieldRow}>
              <View style={styles.fieldIcon}>
                  <Ionicons name="key-outline" size={20} color={theme.colors.primary} />
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

      <Text style={styles.sectionTitle}>DATABASE</Text>
      <View style={styles.modernCard}>
          <View style={styles.fieldRow}>
              <View style={styles.fieldIcon}>
                  <Ionicons name="server-outline" size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Primary Database</Text>
                  <Text style={styles.actionSubtitle}>Database to load on startup</Text>
                  
                  <View style={{marginTop: 12}}>
                      <TouchableOpacity 
                          style={[styles.dbOption, (!settings.primary_db || settings.primary_db === 'tsl_expenses.db') && styles.dbOptionActive]}
                          onPress={() => {
                              const newSettings = { ...settings, primary_db: 'tsl_expenses.db' };
                              setSettings(newSettings);
                              Store.setSettings(newSettings);
                          }}
                      >
                          <Text style={[styles.dbOptionText, (!settings.primary_db || settings.primary_db === 'tsl_expenses.db') && styles.dbOptionTextActive]}>Default (tsl_expenses.db)</Text>
                          {(!settings.primary_db || settings.primary_db === 'tsl_expenses.db') && <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />}
                      </TouchableOpacity>
                      
                      {availableDbs.filter(d => d.dbName !== 'tsl_expenses.db').map(db => (
                          <TouchableOpacity 
                              key={db.dbName}
                              style={[styles.dbOption, settings.primary_db === db.dbName && styles.dbOptionActive]}
                              onPress={() => {
                                  const newSettings = { ...settings, primary_db: db.dbName };
                                  setSettings(newSettings);
                                  Store.setSettings(newSettings);
                              }}
                          >
                              <Text style={[styles.dbOptionText, settings.primary_db === db.dbName && styles.dbOptionTextActive]} numberOfLines={1}>
                                {db.name} ({db.dbName})
                              </Text>
                              {settings.primary_db === db.dbName && <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />}
                          </TouchableOpacity>
                      ))}
                  </View>
              </View>
          </View>
      </View>

      <Text style={styles.sectionTitle}>DATA MANAGEMENT</Text>
      <View style={styles.modernCard}>
          <View style={styles.fieldRow}>
              <View style={styles.fieldIcon}>
                  <Ionicons name="refresh-outline" size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Automatic Backups</Text>
                  <Text style={styles.actionSubtitle}>Backup current database on a schedule</Text>
              </View>
              <Switch 
                  value={!!settings.backup_enabled}
                  onValueChange={toggleAutoBackup}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={"#fff"}
              />
          </View>

          {settings.backup_enabled && (
              <>
                  <View style={styles.separator} />
                  <View style={styles.fieldRow}>
                      <View style={styles.fieldIcon}>
                          <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                          <Text style={styles.fieldLabel}>Backup Frequency</Text>
                          <View style={{ flexDirection: "row", marginTop: 8 }}>
                              {(['daily', 'weekly', 'monthly'] as const).map(option => (
                                  <TouchableOpacity
                                      key={option}
                                      onPress={() => changeBackupFrequency(option)}
                                      style={[
                                          styles.sizeOption,
                                          (settings.backup_frequency || 'monthly') === option && styles.sizeOptionActive
                                      ]}
                                  >
                                      <Text
                                          style={[
                                              styles.sizeOptionText,
                                              (settings.backup_frequency || 'monthly') === option && styles.sizeOptionTextActive
                                          ]}
                                      >
                                          {option === 'daily' ? 'Daily' : option === 'weekly' ? 'Weekly' : 'Monthly'}
                                      </Text>
                                  </TouchableOpacity>
                              ))}
                          </View>
                      </View>
                  </View>

                  <View style={styles.separator} />
                  <View style={styles.fieldRow}>
                      <View style={styles.fieldIcon}>
                          <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                          <Text style={styles.fieldLabel}>Backup Time</Text>
                          <TextInput
                              style={styles.cleanInput}
                              value={settings.backup_time || "00:00"}
                              onChangeText={changeBackupTime}
                              placeholder="HH:mm"
                              keyboardType="numbers-and-punctuation"
                          />
                      </View>
                  </View>
              </>
          )}

          <View style={styles.separator} />

          <TouchableOpacity onPress={manualBackupNow} style={styles.actionItem}>
            <View style={[styles.actionIconBox, { backgroundColor: theme.colors.lighter }]}>
                <Ionicons name="cloud-upload-outline" size={22} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.actionTitle}>Run Backup Now</Text>
                <Text style={styles.actionSubtitle}>Create JSON backups immediately</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
          </TouchableOpacity>

          <TouchableOpacity onPress={importSpreadsheet} style={styles.actionItem}>
            <View style={[styles.actionIconBox, { backgroundColor: theme.colors.lighter }]}>
                <Ionicons name="cloud-upload-outline" size={22} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.actionTitle}>Import Data</Text>
                <Text style={styles.actionSubtitle}>Support for XLSX, ODS</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity onPress={exportCsv} style={styles.actionItem}>
            <View style={[styles.actionIconBox, { backgroundColor: theme.colors.lighter }]}>
                <Ionicons name="download-outline" size={22} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.actionTitle}>Export CSV</Text>
                <Text style={styles.actionSubtitle}>Download expense records</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity onPress={backup} style={styles.actionItem}>
            <View style={[styles.actionIconBox, { backgroundColor: theme.colors.lighter }]}>
                <Ionicons name="server-outline" size={22} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.actionTitle}>Full Backup</Text>
                <Text style={styles.actionSubtitle}>Save JSON backup file</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
          </TouchableOpacity>
      </View>
      
      <View style={{ height: 10 }} />

      {isAuthenticated && (
          <>
            <TouchableOpacity onPress={logout} style={[styles.saveButton, { backgroundColor: '#EF4444', marginTop: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'center' }]}>
                <Text style={styles.saveButtonText}>LOG OUT</Text>
                <Ionicons name="log-out-outline" size={20} color="#fff" style={{marginLeft: 8}} />
            </TouchableOpacity>

            <TouchableOpacity onPress={showOnboarding} style={[styles.saveButton, { backgroundColor: '#8B5CF6', marginTop: 10, marginBottom: 0, flexDirection: 'row', justifyContent: 'center' }]}>
                <Text style={styles.saveButtonText}>APP TOUR</Text>
                <Ionicons name="help-circle-outline" size={20} color="#fff" style={{marginLeft: 8}} />
            </TouchableOpacity>
          </>
      )}

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

      <InputModal
        visible={pinModalVisible}
        title={pinMode === 'enable' ? "Set App PIN" : "Change PIN"}
        message="Enter a 4-digit numeric PIN"
        placeholder="1234"
        initialValue=""
        onClose={() => setPinModalVisible(false)}
        onSubmit={handlePinSubmit}
        submitLabel="Save"
        secureTextEntry={true}
        keyboardType="numeric"
        maxLength={4}
      />

      <InfoModal 
        visible={infoModalVisible} 
        onClose={() => setInfoModalVisible(false)} 
        logoUri={settings.company_logo} 
      />
    </View>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { flex: 1, padding: 20 },

    // Modern "2026" Auth Styles
    authContainer: { flex: 1, backgroundColor: theme.colors.background, position: "relative" },
    blob: { position: "absolute", width: 300, height: 300, borderRadius: 150 },
    logoContainer: { 
        width: 80, height: 80, borderRadius: 24, 
        backgroundColor: theme.mode === 'dark' ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", 
        justifyContent: "center", alignItems: "center", marginBottom: 20,
        borderWidth: 1, borderColor: theme.mode === 'dark' ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
    },
    authTitle: { fontSize: 32, fontWeight: "800", color: theme.colors.text, letterSpacing: 0.5 },
    authSubtitle: { fontSize: 14, color: theme.colors.subtext, marginTop: 8, textAlign: "center", maxWidth: "80%" },
    authFormCard: { 
        width: "100%", backgroundColor: theme.colors.card, 
        borderRadius: 24, padding: 24, 
        borderWidth: 1, borderColor: theme.colors.border,
        shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20
    },
    inputGroup: { 
        flexDirection: "row", alignItems: "center", 
        backgroundColor: theme.colors.background, 
        borderRadius: 16, marginBottom: 16, paddingHorizontal: 16, height: 56,
        borderWidth: 1, borderColor: theme.colors.border
    },
    inputIcon: { marginRight: 12 },
    modernInput: { flex: 1, color: theme.colors.text, fontSize: 16 },
    gradientButton: { 
        backgroundColor: theme.colors.primary, flexDirection: "row", justifyContent: "center", alignItems: "center",
        height: 56, borderRadius: 16, marginTop: 8,
        shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6
    },
    gradientButtonText: { color: "#fff", fontWeight: "700", fontSize: 16, marginRight: 8 },
    switchAuthText: { color: theme.colors.subtext, fontSize: 14 },

    // Settings Screen Styles
    sectionTitle: { fontSize: 13, fontWeight: "700", color: theme.colors.subtext, marginTop: 24, marginBottom: 12, paddingLeft: 4, letterSpacing: 1 },
    modernCard: { 
        backgroundColor: theme.colors.card, borderRadius: 20, padding: 20, 
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
        borderWidth: 1, borderColor: theme.colors.border
    },
    fieldRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
    fieldIcon: { 
        width: 36, height: 36, borderRadius: 10, backgroundColor: theme.colors.background, 
        justifyContent: "center", alignItems: "center", marginRight: 16 
    },
    fieldLabel: { fontSize: 12, color: theme.colors.subtext, fontWeight: "600", marginBottom: 2 },
    cleanInput: { 
        fontSize: 16, color: theme.colors.text, fontWeight: "500", paddingVertical: 4, 
        borderBottomWidth: 1, borderBottomColor: "transparent" 
    },
    separator: { height: 1, backgroundColor: theme.colors.border, marginVertical: 12, marginLeft: 52 },
    
    uploadButton: { 
        flexDirection: "row", alignItems: "center", backgroundColor: theme.colors.background, 
        paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 12 
    },
    uploadButtonText: { color: theme.colors.primary, fontWeight: "600", fontSize: 13, marginLeft: 6 },
    previewBox: { padding: 4, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 6, backgroundColor: theme.colors.card },
    
    sizeOption: { 
        flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10, 
        backgroundColor: theme.colors.background, marginHorizontal: 4, borderWidth: 1, borderColor: "transparent"
    },
    sizeOptionActive: { backgroundColor: theme.colors.card, borderColor: theme.colors.primary, shadowColor: theme.colors.primary, shadowOpacity: 0.1, shadowRadius: 4, elevation: 1, borderWidth: 1 },
    sizeOptionText: { color: theme.colors.subtext, fontWeight: "600" },
    sizeOptionTextActive: { color: theme.colors.primary },

    saveButton: { 
        backgroundColor: theme.colors.text, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 24,
        shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 5, elevation: 2
    },
    saveButtonText: { color: theme.colors.background, fontWeight: "600", fontSize: 15 },

    smallActionButton: { backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    smallActionText: { color: "#fff", fontSize: 12, fontWeight: "700" },

    actionItem: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
    actionIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    actionTitle: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
    actionSubtitle: { fontSize: 12, color: theme.colors.subtext, marginTop: 1 },

    dbOption: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8,
        backgroundColor: theme.colors.background, marginBottom: 8, borderWidth: 1, borderColor: 'transparent'
    },
    dbOptionActive: {
        backgroundColor: theme.colors.card, borderColor: theme.colors.primary
    },
    dbOptionText: { fontSize: 12, color: theme.colors.subtext, fontWeight: '500', flex: 1 },
    dbOptionTextActive: { color: theme.colors.primary, fontWeight: '700' },
});
