import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Dimensions, StyleSheet, TouchableOpacity, Platform, Alert } from "react-native";
import { BarChart, PieChart } from "react-native-chart-kit";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Store } from "../data/Store";
import { AppHeader } from "../components/AppHeader";
import { useIsFocused } from "@react-navigation/native";
import { Ionicons } from '@expo/vector-icons';

export default function ChartsScreen() {
  const width = Dimensions.get("window").width;
  const isFocused = useIsFocused();
  
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  
  interface CategoryData {
    name: string;
    amount: number;
    count: number;
    color: string;
    legendFontColor: string;
    legendFontSize: number;
  }

  const [data, setData] = useState<{
    pieData: CategoryData[], 
    totalInc: number, 
    totalExp: number,
    totalBalance: number
  }>({ 
    pieData: [], 
    totalInc: 0, 
    totalExp: 0,
    totalBalance: 0 
  });

  useEffect(() => {
    load();
    const unsub = Store.subscribe(load);
    return unsub;
  }, [year, month, isFocused]);

  const load = async () => {
    try {
      const recs = await Store.list({ year, month });
      
      // 1. Process Category Data (Expense Only)
      const catMap: Record<string, { amount: number, count: number }> = {};
      let totalExp = 0;
      let totalInc = 0;

      recs.forEach(r => {
        // Calculate Totals
        const expAmt = Number(r.expense_amount || 0);
        const incAmt = Number(r.income_amount || 0);
        
        totalExp += expAmt;
        totalInc += incAmt;

        // Group Expenses by Category
        if (expAmt > 0) {
            const cat = r.expense_category || "Uncategorized";
            if (!catMap[cat]) {
                catMap[cat] = { amount: 0, count: 0 };
            }
            catMap[cat].amount += expAmt;
            catMap[cat].count += 1;
        }
      });
      
      // Modern Palette
      const colors = [
          "#4e6aff", "#FF6B81", "#FFD93D", "#6BCB77", "#A78BFA", 
          "#FF9F43", "#2D98DA", "#FC5C65", "#45AAF2", "#26DE81"
      ];

      const pieData = Object.keys(catMap)
        .map((cat, i) => ({
          name: cat,
          amount: catMap[cat].amount,
          count: catMap[cat].count,
          color: colors[i % colors.length],
          legendFontColor: "#7F7F7F",
          legendFontSize: 12
        }))
        .sort((a, b) => b.amount - a.amount); // Sort by highest expense

      setData({ 
          pieData, 
          totalInc, 
          totalExp, 
          totalBalance: totalInc - totalExp 
      });

    } catch (e) {
      console.error("Charts load error", e);
    }
  };

  const generatePDF = async () => {
      try {
          const html = `
            <html>
              <head>
                <style>
                  body { font-family: Helvetica, Arial, sans-serif; padding: 20px; }
                  h1 { color: #333; }
                  .summary { margin: 20px 0; padding: 10px; background: #f8f9fa; border-radius: 8px; }
                  .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                  .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                  .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                  .table th { background-color: #f2f2f2; }
                </style>
              </head>
              <body>
                <h1>Financial Report</h1>
                <h3>Period: ${month}/${year}</h3>
                
                <div class="summary">
                  <div class="row"><strong>Total Income:</strong> <span>₹${data.totalInc.toLocaleString('en-IN')}</span></div>
                  <div class="row"><strong>Total Expense:</strong> <span>₹${data.totalExp.toLocaleString('en-IN')}</span></div>
                  <div class="row"><strong>Net Balance:</strong> <span>₹${data.totalBalance.toLocaleString('en-IN')}</span></div>
                </div>

                <h2>Category Breakdown</h2>
                <table class="table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Transactions</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.pieData.map(c => `
                      <tr>
                        <td>${c.name}</td>
                        <td>${c.count}</td>
                        <td>₹${c.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </body>
            </html>
          `;

          const { uri } = await Print.printToFileAsync({ html });
          await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      } catch (e: any) {
          Alert.alert("Error", e.message);
      }
  };

  const changeMonth = (delta: number) => {
      let m = parseInt(month) + delta;
      let y = parseInt(year);
      if (m > 12) { m = 1; y++; }
      if (m < 1) { m = 12; y--; }
      setMonth(m.toString().padStart(2, '0'));
      setYear(y.toString());
  };

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
        'Housing': 'home',
        'Travel': 'airplane',
        'Personal': 'person'
    };
    const key = Object.keys(map).find(k => cat.includes(k));
    return map[key || ''] || 'pricetag';
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      <AppHeader title="Analytics" subtitle="Financial Overview" />
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Filter & PDF Row */}
        <View style={styles.filterRow}>
            <View style={styles.monthSelector}>
                <TouchableOpacity onPress={() => changeMonth(-1)}>
                    <Ionicons name="chevron-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.monthText}>{new Date(Number(year), Number(month)-1).toLocaleString('default', { month: 'long', year: 'numeric' })}</Text>
                <TouchableOpacity onPress={() => changeMonth(1)}>
                    <Ionicons name="chevron-forward" size={24} color="#333" />
                </TouchableOpacity>
            </View>
            
            <TouchableOpacity onPress={generatePDF} style={styles.pdfButton}>
                <Ionicons name="document-text-outline" size={20} color="#fff" />
                <Text style={styles.pdfButtonText}>PDF</Text>
            </TouchableOpacity>
        </View>

        {/* Activity / Balance Section */}
        <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View>
                    <Text style={styles.cardTitle}>Activity</Text>
                    <Text style={styles.balanceLabel}>Total Balance</Text>
                    <Text style={[styles.balanceValue, { color: data.totalBalance >= 0 ? '#2ecc71' : '#e74c3c' }]}>
                        ₹{data.totalBalance.toLocaleString('en-IN')}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.dot, { backgroundColor: '#2ecc71' }]} />
                        <Text style={styles.legendText}>Earned</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.dot, { backgroundColor: '#FFD93D' }]} />
                        <Text style={styles.legendText}>Spend</Text>
                    </View>
                </View>
            </View>

            <BarChart
                data={{
                labels: ["Income", "Expense"],
                datasets: [{ data: [data.totalInc, data.totalExp] }]
                }}
                width={width - 64} // Card padding (24*2) + Margin (16*2) approx adjustment
                height={220}
                yAxisLabel="₹"
                yAxisSuffix=""
                chartConfig={{
                backgroundColor: "#fff",
                backgroundGradientFrom: "#fff",
                backgroundGradientTo: "#fff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
                barPercentage: 0.7,
                fillShadowGradient: '#2ecc71',
                fillShadowGradientOpacity: 1,
                }}
                withInnerLines={true}
                showValuesOnTopOfBars
                fromZero
                style={{ borderRadius: 16 }}
            />
        </View>

        {/* Expense Summary Section */}
        <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.cardTitle}>Summary</Text>
                <View style={{ backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                    <Text style={{ fontSize: 12, color: '#666' }}>This Month</Text>
                </View>
            </View>
            
            {data.pieData.length > 0 ? (
                <View style={{ alignItems: 'center', position: 'relative' }}>
                    <PieChart
                        data={data.pieData}
                        width={width - 48}
                        height={240}
                        chartConfig={{
                            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        }}
                        accessor={"amount"}
                        backgroundColor={"transparent"}
                        paddingLeft={"80"} // Center the pie
                        absolute
                        hasLegend={false}
                    />
                    
                    {/* Donut Hole Simulation */}
                    <View style={{ 
                        position: 'absolute', 
                        top: 60, 
                        left: '50%',
                        marginLeft: -60,
                        width: 120,
                        height: 120,
                        backgroundColor: 'white',
                        borderRadius: 60,
                        alignItems: 'center', 
                        justifyContent: 'center',
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        elevation: 2
                    }}>
                        <Text style={{ fontSize: 12, color: '#888' }}>Total</Text>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>
                            ₹{data.totalExp.toLocaleString('en-IN', { notation: "compact", compactDisplay: "short" })}
                        </Text>
                    </View>
                </View>
            ) : (
                <Text style={{ textAlign: 'center', color: '#999', padding: 20 }}>No expenses recorded</Text>
            )}

            {/* Custom List of Categories */}
            <View style={{ marginTop: 20 }}>
                {data.pieData.map((item, index) => (
                    <View key={index} style={styles.categoryRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                                <Ionicons name={getCategoryIcon(item.name)} size={20} color={item.color} />
                            </View>
                            <View style={{ marginLeft: 12 }}>
                                <Text style={styles.categoryName}>{item.name}</Text>
                                <Text style={styles.transactionCount}>{item.count} transactions</Text>
                            </View>
                        </View>
                        <Text style={styles.categoryAmount}>₹{item.amount.toLocaleString('en-IN')}</Text>
                    </View>
                ))}
            </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        elevation: 4,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    balanceLabel: {
        fontSize: 14,
        color: '#666',
        marginTop: 4
    },
    balanceValue: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 2
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 6
    },
    legendText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500'
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center'
    },
    categoryName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333'
    },
    transactionCount: {
        fontSize: 12,
        color: '#999',
        marginTop: 2
    },
    categoryAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333'
    },
    filterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginTop: 16
    },
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        elevation: 2
    },
    monthText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginHorizontal: 12,
        minWidth: 120,
        textAlign: 'center'
    },
    pdfButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF6B81',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        shadowColor: '#FF6B81',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        elevation: 4
    },
    pdfButtonText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 6
    }
});
