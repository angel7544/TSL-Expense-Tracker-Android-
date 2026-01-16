import React, { useState, useEffect, useContext } from "react";
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

const { width, height } = Dimensions.get("window");

export default function SettingsScreen({ navigation }: any) {
  const { showOnboarding } = useContext(UIContext);
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
    <View style={{ flex: 1, backgroundColor: "#F3F4F6" }}>
      <AppHeader title="Settings" subtitle="App Preferences" />
      <ScrollView 
        style={{ flex: 1, padding: 20 }}
        contentContainerStyle={{ paddingBottom: 100 }}
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
                <Ionicons name="location-outline" size={20} color="#4F46E5" />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Company Address</Text>
                <TextInput 
                    value={settings.company_address} 
                    onChangeText={t => updateSetting("company_address", t)} 
                    style={styles.cleanInput} 
                    placeholder="Address"
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
        <View style={styles.separator} />

        <View style={styles.fieldRow}>
            <View style={styles.fieldIcon}>
                <Ionicons name="receipt-outline" size={20} color="#4F46E5" />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Company GSTIN</Text>
                <TextInput 
                    value={settings.company_gst} 
                    onChangeText={t => updateSetting("company_gst", t)} 
                    style={styles.cleanInput} 
                    placeholder="GST Number"
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
                  <Ionicons name="lock-closed-outline" size={20} color="#4F46E5" />
              </View>
              <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>App Lock</Text>
                  <Text style={styles.actionSubtitle}>Require PIN to open app</Text>
              </View>
              <Switch 
                  value={settings.lock_enabled} 
                  onValueChange={toggleLock}
                  trackColor={{ false: "#D1D5DB", true: "#4F46E5" }}
                  thumbColor={"#fff"}
              />
          </View>

          {settings.lock_enabled && (
            <>
                <View style={styles.separator} />
                <TouchableOpacity onPress={changePin} style={styles.fieldRow}>
                    <View style={styles.fieldIcon}>
                        <Ionicons name="keypad-outline" size={20} color="#4F46E5" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Change PIN</Text>
                        <Text style={styles.actionSubtitle}>Update your 4-digit PIN</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                </TouchableOpacity>

                {biometricsAvailable && (
                    <>
                        <View style={styles.separator} />
                        <View style={styles.fieldRow}>
                            <View style={styles.fieldIcon}>
                                <Ionicons name="finger-print-outline" size={20} color="#4F46E5" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.fieldLabel}>Biometrics</Text>
                                <Text style={styles.actionSubtitle}>Use Fingerprint/FaceID</Text>
                            </View>
                            <Switch 
                                value={!!settings.biometrics_enabled} 
                                onValueChange={toggleBiometrics}
                                trackColor={{ false: "#D1D5DB", true: "#4F46E5" }}
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

      <Text style={styles.sectionTitle}>DATABASE</Text>
      <View style={styles.modernCard}>
          <View style={styles.fieldRow}>
              <View style={styles.fieldIcon}>
                  <Ionicons name="server-outline" size={20} color="#4F46E5" />
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
                          {(!settings.primary_db || settings.primary_db === 'tsl_expenses.db') && <Ionicons name="checkmark-circle" size={18} color="#4F46E5" />}
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
                              {settings.primary_db === db.dbName && <Ionicons name="checkmark-circle" size={18} color="#4F46E5" />}
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
                  <Ionicons name="refresh-outline" size={20} color="#4F46E5" />
              </View>
              <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Automatic Backups</Text>
                  <Text style={styles.actionSubtitle}>Backup current database on a schedule</Text>
              </View>
              <Switch 
                  value={!!settings.backup_enabled}
                  onValueChange={toggleAutoBackup}
                  trackColor={{ false: "#D1D5DB", true: "#4F46E5" }}
                  thumbColor={"#fff"}
              />
          </View>

          {settings.backup_enabled && (
              <>
                  <View style={styles.separator} />
                  <View style={styles.fieldRow}>
                      <View style={styles.fieldIcon}>
                          <Ionicons name="calendar-outline" size={20} color="#4F46E5" />
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
                          <Ionicons name="time-outline" size={20} color="#4F46E5" />
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
            <View style={[styles.actionIconBox, { backgroundColor: "#E0F2FE" }]}>
                <Ionicons name="cloud-upload-outline" size={22} color="#0284C7" />
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.actionTitle}>Run Backup Now</Text>
                <Text style={styles.actionSubtitle}>Create JSON backups immediately</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>

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
    actionSubtitle: { fontSize: 12, color: "#9CA3AF", marginTop: 1 },

    dbOption: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8,
        backgroundColor: '#F9FAFB', marginBottom: 8, borderWidth: 1, borderColor: 'transparent'
    },
    dbOptionActive: {
        backgroundColor: '#EEF2FF', borderColor: '#4F46E5'
    },
    dbOptionText: { fontSize: 14, color: '#4B5563', fontWeight: '500', flex: 1 },
    dbOptionTextActive: { color: '#4F46E5', fontWeight: '700' },
});
