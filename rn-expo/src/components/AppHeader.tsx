import React, { useState, useEffect } from "react";
import { 
  View, Text, Image, TouchableOpacity, Modal, StyleSheet, Linking, Platform, Dimensions, Alert
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";

import { Store } from "../data/Store";
import { ImportExport } from "../services/ImportExport";

export const AppHeader = ({ title, subtitle }: { title?: string, subtitle?: string }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [logoUri, setLogoUri] = useState<string | null>(null);

  useEffect(() => {
    loadLogo();
  }, [modalVisible]); // Reload when modal opens to ensure fresh settings

  const loadLogo = async () => {
    try {
        const settings = Store.getSettings();
        if (settings.company_logo) {
            setLogoUri(settings.company_logo);
            return;
        }

        if (Platform.OS !== 'web') {
           const p1 = "file:///d:/IMS/AndroidTSLEpxense/tsl_icon.png";
           const i1 = await FileSystem.getInfoAsync(p1);
           if (i1.exists) {
             const b1 = await FileSystem.readAsStringAsync(p1, { encoding: FileSystem.EncodingType.Base64 });
             setLogoUri(`data:image/png;base64,${b1}`);
           }
        }
    } catch (e) {
        console.log("Logo load error", e);
    }
  };

  const openLink = (url: string) => Linking.openURL(url).catch(err => console.error("Couldn't load page", err));

  const handleImport = async () => {
    try {
        const res = await DocumentPicker.getDocumentAsync({
            type: [
                "text/csv",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.ms-excel",
                "application/vnd.oasis.opendocument.spreadsheet",
                "*/*"
            ],
            copyToCacheDirectory: true
        });

        if (res.canceled) return;
        const file = res.assets[0];
        
        const importData = async (create: boolean) => {
            if (create) {
                const dbName = `db_${Date.now()}.db`;
                await Store.switchDatabase(dbName);
                await Store.addRecentDatabase(file.name, dbName);
            }
            
            if (file.name.toLowerCase().endsWith(".csv")) {
                const content = await FileSystem.readAsStringAsync(file.uri);
                const rows = ImportExport.parseCSV(content);
                await Store.importCSV(rows, file.name);
                Alert.alert("Success", `Imported ${rows.length} records${create ? " into new database" : ""}`);
            } else {
                const b64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
                const rows = ImportExport.parseWorkbookBase64(b64);
                await Store.importCSV(rows, file.name);
                Alert.alert("Success", `Imported ${rows.length} records${create ? " into new database" : ""}`);
            }
        };

        Alert.alert(
            "Import Mode", 
            "Create a new database for this file or merge into current?",
            [
                { text: "Merge", onPress: () => importData(false) },
                { text: "New Database", onPress: () => importData(true) },
                { text: "Cancel", style: "cancel" }
            ]
        );

    } catch (e: any) {
        Alert.alert("Import Error", e.message);
    }
  };

  const saveFile = async (content: string, filename: string, mime: string, isBase64 = false) => {
    try {
        if (Platform.OS === "android") {
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted) {
                const uri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, filename, mime);
                await FileSystem.writeAsStringAsync(uri, content, { encoding: isBase64 ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8 });
                Alert.alert("Success", "Saved to " + uri);
            } else {
                Alert.alert("Permission denied");
            }
        } else {
            const uri = FileSystem.documentDirectory + filename;
            await FileSystem.writeAsStringAsync(uri, content, { encoding: isBase64 ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8 });
            await Sharing.shareAsync(uri);
        }
    } catch (e: any) {
        Alert.alert("Save Error", e.message);
    }
  };

  const handleExport = async () => {
    Alert.alert("Export Data", "Choose format", [
        { text: "Cancel", style: "cancel" },
        { 
            text: "CSV", 
            onPress: async () => {
                const data = await Store.list({});
                const csv = Store.exportCSV(data);
                saveFile(csv, `expenses_${Date.now()}.csv`, "text/csv");
            } 
        },
        { 
            text: "Excel (XLSX)", 
            onPress: async () => {
                const data = await Store.list({});
                const b64 = ImportExport.generateExcelBase64(data);
                saveFile(b64, `expenses_${Date.now()}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", true);
            } 
        }
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
            {logoUri ? (
                <Image source={{ uri: logoUri }} style={styles.logo} />
            ) : (
                <View style={styles.logoPlaceholder}>
                    <Text style={styles.logoText}>TSL</Text>
                </View>
            )}
        </TouchableOpacity>
        <View style={styles.textContainer}>
            {title && <Text style={styles.title}>{title}</Text>}
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>

      <View style={styles.rightRow}>
        <TouchableOpacity onPress={handleImport} style={styles.iconButton}>
            <Ionicons name="file-tray-full-outline" size={24} color="#007bff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleExport} style={styles.iconButton}>
            <Ionicons name="share-social-outline" size={24} color="#007bff" />
        </TouchableOpacity>
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
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
                onPress={() => setModalVisible(false)}
            >
                <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>

            {logoUri && <Image source={{ uri: logoUri }} style={styles.modalLogo} />}
            <Text style={styles.modalTitle}>AndroidTSLExpense</Text>
            <Text style={styles.modalVersion}>Version 1.0.0</Text>
            
            <Text style={styles.devLabel}>Developed by</Text>
            <Text style={styles.devName}>Angel (Mehul) Singh</Text>
            <Text style={styles.companyName}>The Space Lab & BR31Technologies</Text>

            <View style={styles.linksContainer}>
                <TouchableOpacity onPress={() => openLink("https://br31tech.live")} style={styles.linkButton}>
                    <Ionicons name="globe-outline" size={20} color="#fff" />
                    <Text style={styles.linkText}>Website</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openLink("https://github.com/br31tech")} style={[styles.linkButton, { backgroundColor: "#333" }]}>
                    <Ionicons name="logo-github" size={20} color="#fff" />
                    <Text style={styles.linkText}>GitHub</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openLink("https://linkedin.com/in/br31tech")} style={[styles.linkButton, { backgroundColor: "#0077b5" }]}>
                    <Ionicons name="logo-linkedin" size={20} color="#fff" />
                    <Text style={styles.linkText}>LinkedIn</Text>
                </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginLeft: 8,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginRight: 16,
  },
  logoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  logoText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  textContainer: {
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  // Modal Styles
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
    shadowOffset: {
      width: 0,
      height: 2
    },
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