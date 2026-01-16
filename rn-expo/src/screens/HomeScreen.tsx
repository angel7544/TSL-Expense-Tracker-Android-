import React, { useState, useEffect, useRef, useContext, useMemo } from "react";
import { 
  View, Text, ScrollView, TouchableOpacity, 
  FlatList, useWindowDimensions, Animated, Platform, Alert, StyleSheet, Image, RefreshControl
} from "react-native";
import * as FileSystem from "expo-file-system";
import { Ionicons } from '@expo/vector-icons';
import { Store, ExpenseRecord } from "../data/Store";
import { useFocusEffect } from '@react-navigation/native';
import { AppHeader } from "../components/AppHeader";
import { UIContext } from "../context/UIContext";
import { getTheme } from "../constants/Theme";

export default function HomeScreen({ navigation }: { navigation: any }) {
  const { width } = useWindowDimensions();
  const { theme } = useContext(UIContext);
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [activeTab, setActiveTab] = useState<'Expense' | 'Income'>('Expense');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAllTime, setIsAllTime] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [summary, setSummary] = useState({ inc: 0, exp: 0, savings: 0, count: 0 });
  const [topCategories, setTopCategories] = useState<{category: string, amount: number}[]>([]);
  const [recentRecords, setRecentRecords] = useState<ExpenseRecord[]>([]);
  const [recentFiles, setRecentFiles] = useState<{name: string, uri: string, dbName: string}[]>([]);
  const [currentDbName, setCurrentDbName] = useState("tsl_expenses.db");

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true
    }).start();
  }, []);

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  const loadData = async () => {
    let year = currentDate.getFullYear().toString();
    let month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    
    if (isAllTime) {
        year = "All";
        month = "All";
    }

    // 1. Get Summary Data
    const allRecords = await Store.list({ year, month });
    const inc = allRecords.reduce((s, x) => s + Number(x.income_amount || 0), 0);
    const exp = allRecords.reduce((s, x) => s + Number(x.expense_amount || 0), 0);
    setSummary({ inc, exp, savings: inc - exp, count: allRecords.length });

    // 2. Get Top Categories (based on active tab)
    const cats = await Store.getCategoryTotals(year, month, activeTab.toLowerCase() as any);
    setTopCategories(cats);

    // 3. Get Recent Transactions (filtered by tab)
    const records = await Store.list({ year, month }); // Get all for the month first
    const filtered = records
        .filter(r => activeTab === 'Expense' ? Number(r.expense_amount) > 0 : Number(r.income_amount) > 0)
        .slice(0, 10); // Limit to 10
    setRecentRecords(filtered);
    
    // Load recent files
    const recent = await Store.getRecentDatabases();
    setRecentFiles(recent);
    setCurrentDbName(Store.currentDbName);
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [currentDate, activeTab, isAllTime]);

  useEffect(() => {
    const unsub = Store.subscribe(loadData);
    return unsub;
  }, [currentDate, activeTab, isAllTime]);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [currentDate, activeTab, isAllTime])
  );

  const switchDatabase = async (file: {name: string, uri: string, dbName: string}) => {
    Alert.alert("Switch Database", `Load ${file.name}?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Load", onPress: async () => {
            await Store.switchDatabase(file.dbName);
            loadData(); // Refresh
        }}
    ]);
  };

  const removeDatabase = async (dbName: string) => {
    Alert.alert("Remove Recent", "Remove this file from recent list?", [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", onPress: async () => {
            await Store.removeRecentDatabase(dbName);
            loadData();
        }}
    ]);
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  
  const currentFile = recentFiles.find(f => f.dbName === currentDbName);
  const displaySubtitle = currentDbName === 'tsl_expenses.db' ? 'Default Database' : (currentFile?.name || currentDbName);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader title="Dashboard" subtitle={displaySubtitle} showCreateDB={true} />
      
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        {/* Date Filter Controls */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 16 }}>
            <TouchableOpacity 
                style={[styles.filterBtn, !isAllTime && styles.filterBtnActive]} 
                onPress={() => setIsAllTime(false)}
            >
                <Text style={[styles.filterText, !isAllTime && styles.filterTextActive]}>Monthly</Text>
            </TouchableOpacity>
            <View style={{ width: 12 }} />
            <TouchableOpacity 
                style={[styles.filterBtn, isAllTime && styles.filterBtnActive]} 
                onPress={() => setIsAllTime(true)}
            >
                <Text style={[styles.filterText, isAllTime && styles.filterTextActive]}>All Time</Text>
            </TouchableOpacity>
        </View>

        {!isAllTime && (
            <View style={styles.monthSelector}>
                <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowBtn}>
                    <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.monthText}>{monthName} {currentDate.getFullYear()}</Text>
                <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowBtn}>
                    <Ionicons name="chevron-forward" size={24} color={theme.colors.text} />
                </TouchableOpacity>
            </View>
        )}

        {/* Toggle Switch */}
        <View style={styles.toggleContainer}>
            <TouchableOpacity 
                style={[styles.toggleButton, activeTab === 'Expense' && styles.toggleActive]} 
                onPress={() => setActiveTab('Expense')}
            >
                <Text style={[styles.toggleText, activeTab === 'Expense' && styles.toggleTextActive]}>Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.toggleButton, activeTab === 'Income' && styles.toggleActive]} 
                onPress={() => setActiveTab('Income')}
            >
                <Text style={[styles.toggleText, activeTab === 'Income' && styles.toggleTextActive]}>Income</Text>
            </TouchableOpacity>
        </View>

        {/* Summary Card */}
        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
            <Text style={styles.cardTitle}>{isAllTime ? "Total Balance (All Time)" : `${monthName} Net Balance`}</Text>
            <Text style={styles.cardAmount}>
                {summary.savings < 0 ? "-" : ""}₹{Math.abs(summary.savings).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <Text style={{ fontSize: 14, color: theme.colors.subtext }}>Total Records: <Text style={{ fontWeight: 'bold', color: theme.colors.text }}>{summary.count}</Text></Text>
            </View>

            <View style={styles.progressSection}>
                <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>Earned</Text>
                    <Text style={styles.progressValue}>₹{summary.inc.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${Math.min((summary.inc / (summary.inc + summary.exp || 1)) * 100, 100)}%`, backgroundColor: '#00C4FF' }]} />
                </View>
            </View>

            <View style={styles.progressSection}>
                <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>Spend</Text>
                    <Text style={styles.progressValue}>₹{summary.exp.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${Math.min((summary.exp / (summary.inc + summary.exp || 1)) * 100, 100)}%`, backgroundColor: '#FF6B81' }]} />
                </View>
            </View>
        </Animated.View>

        {/* Top Spending / Income */}
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top {activeTab === 'Expense' ? 'Spending' : 'Sources'}</Text>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }} style={{ marginBottom: 24 }}>
            {topCategories.length === 0 ? (
                <Text style={{ color: theme.colors.subtext, padding: 16 }}>No data for this month</Text>
            ) : topCategories.map((item, index) => (
                <View key={index} style={styles.categoryItem}>
                    <View style={styles.categoryIconBg}>
                        <Ionicons name={getCategoryIcon(item.category)} size={24} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.categoryName} numberOfLines={1}>{item.category}</Text>
                </View>
            ))}
        </ScrollView>

        {/* Recent Transactions / Monthly Budget */}
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
            {recentRecords.map((item, index) => (
                <View key={index} style={styles.transactionRow}>
                    <View style={styles.transactionIcon}>
                         <Ionicons name={activeTab === 'Expense' ? 'cart-outline' : 'cash-outline'} size={24} color={activeTab === 'Expense' ? '#FF6B81' : '#00C4FF'} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.transactionTitle}>{item.merchant_name || item.expense_category}</Text>
                        <Text style={styles.transactionSubtitle}>{item.expense_description}</Text>
                    </View>
                    <View>
                         <Text style={[styles.transactionAmount, { color: activeTab === 'Expense' ? '#FF6B81' : '#00C4FF' }]}>
                             {activeTab === 'Expense' ? `-₹${item.expense_amount}` : `+₹${item.income_amount}`}
                         </Text>
                         <Text style={styles.transactionDate}>{item.expense_date.split('-')[2]}</Text>
                    </View>
                </View>
            ))}
            {recentRecords.length === 0 && (
                 <Text style={{ color: theme.colors.subtext, textAlign: 'center', padding: 20 }}>No transactions found</Text>
            )}
        </View>

        {/* Recent Files (Legacy Support) */}
        {recentFiles.length > 0 && (
             <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
                <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Recent Databases</Text>
                {recentFiles.map((f, i) => (
                    <View key={i} style={styles.fileRow}>
                        <TouchableOpacity onPress={() => switchDatabase(f)} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <Ionicons name="server-outline" size={20} color={theme.colors.subtext} />
                            <Text style={{ marginLeft: 8, color: theme.colors.text }}>{f.name}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeDatabase(f.dbName)} style={{ padding: 4 }}>
                            <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                        </TouchableOpacity>
                    </View>
                ))}
             </View>
        )}

      </ScrollView>
    </View>
  );
}

const getCategoryIcon = (cat: string): keyof typeof Ionicons.glyphMap => {
    const map: Record<string, keyof typeof Ionicons.glyphMap> = {
        'Food': 'fast-food',
        'Transport': 'car',
        'Office': 'briefcase',
        'Education': 'school',
        'Medical': 'medkit',
        'Utilities': 'flash',
        'Entertainment': 'game-controller',
        'Shopping': 'cart',
        'Housing': 'home'
    };
    // Simple fuzzy match or default
    const key = Object.keys(map).find(k => cat.includes(k));
    return map[key || ''] || 'pricetag';
};

const getStyles = (theme: any) => StyleSheet.create({
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: theme.colors.card,
        margin: 16,
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8
    },
    toggleActive: {
        backgroundColor: theme.colors.primary,
    },
    toggleText: {
        fontSize: 16,
        color: theme.colors.subtext,
        fontWeight: '500'
    },
    toggleTextActive: {
        color: '#fff',
        fontWeight: '600'
    },
    card: {
        backgroundColor: theme.colors.card,
        marginHorizontal: 16,
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        elevation: 5,
        marginBottom: 24
    },
    cardTitle: {
        fontSize: 14,
        color: theme.colors.subtext,
        marginBottom: 8
    },
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12
    },
    monthText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginHorizontal: 16
    },
    arrowBtn: {
        padding: 4
    },
    cardAmount: {
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 24
    },
    progressSection: {
        marginBottom: 16
    },
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    progressLabel: {
        fontSize: 14,
        color: theme.colors.subtext,
        fontWeight: '500'
    },
    progressValue: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '600'
    },
    progressBarBg: {
        height: 8,
        backgroundColor: theme.mode === 'dark' ? theme.colors.border : '#f0f0f0',
        borderRadius: 4,
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4
    },
    sectionHeader: {
        paddingHorizontal: 16,
        marginBottom: 16
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text
    },
    categoryItem: {
        alignItems: 'center',
        marginRight: 20,
        width: 70
    },
    categoryIconBg: {
        width: 60,
        height: 60,
        backgroundColor: theme.mode === 'dark' ? theme.colors.border : '#F4EBFF',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8
    },
    categoryName: {
        fontSize: 12,
        color: theme.colors.text,
        fontWeight: '500',
        textAlign: 'center'
    },
    transactionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.card,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    transactionIcon: {
        width: 48,
        height: 48,
        backgroundColor: theme.mode === 'dark' ? theme.colors.border : '#FFF0F3',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center'
    },
    transactionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 4
    },
    transactionSubtitle: {
        fontSize: 12,
        color: theme.colors.subtext
    },
    transactionAmount: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'right'
    },
    transactionDate: {
        fontSize: 12,
        color: theme.colors.subtext,
        textAlign: 'right',
        marginTop: 4
    },
    fileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: theme.colors.card,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    filterBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: theme.mode === 'dark' ? theme.colors.border : '#eee'
    },
    filterBtnActive: {
        backgroundColor: theme.colors.text
    },
    filterText: {
        fontSize: 14,
        color: theme.colors.subtext,
        fontWeight: '500'
    },
    filterTextActive: {
        color: theme.colors.background
    }
});
