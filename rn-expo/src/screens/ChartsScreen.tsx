import React, { useState, useEffect, useContext, useMemo } from "react";
import { View, Text, ScrollView, Dimensions, StyleSheet, TouchableOpacity, Platform, Alert } from "react-native";
import { BarChart, PieChart } from "react-native-chart-kit";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Store } from "../data/Store";
import { AppHeader } from "../components/AppHeader";
import { useIsFocused } from "@react-navigation/native";
import { Ionicons } from '@expo/vector-icons';
import { UIContext } from "../context/UIContext";

export default function ChartsScreen() {
  const { theme } = useContext(UIContext);
  const styles = useMemo(() => getStyles(theme), [theme]);
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
    walletPieData: CategoryData[],
    totalInc: number, 
    totalExp: number,
    totalBalance: number
  }>({ 
    pieData: [], 
    walletPieData: [],
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
      const walletMap: Record<string, { amount: number, count: number }> = {};
      let totalExp = 0;
      let totalInc = 0;

      recs.forEach(r => {
        // Calculate Totals
        const expAmt = Number(r.expense_amount || 0);
        const incAmt = Number(r.income_amount || 0);
        
        totalExp += expAmt;
        totalInc += incAmt;

        // Group Expenses by Category & Wallet
        if (expAmt > 0) {
            const cat = r.expense_category || "Uncategorized";
            if (!catMap[cat]) {
                catMap[cat] = { amount: 0, count: 0 };
            }
            catMap[cat].amount += expAmt;
            catMap[cat].count += 1;

            const wallet = r.paid_through || "Unknown";
            if (!walletMap[wallet]) {
                walletMap[wallet] = { amount: 0, count: 0 };
            }
            walletMap[wallet].amount += expAmt;
            walletMap[wallet].count += 1;
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
          legendFontColor: theme.colors.subtext,
          legendFontSize: 12
        }))
        .sort((a, b) => b.amount - a.amount);

      const walletPieData = Object.keys(walletMap)
        .map((w, i) => ({
          name: w,
          amount: walletMap[w].amount,
          count: walletMap[w].count,
          color: colors[(i + 3) % colors.length],
          legendFontColor: theme.colors.subtext,
          legendFontSize: 12
        }))
        .sort((a, b) => b.amount - a.amount);

      setData({ 
          pieData, 
          walletPieData,
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
          const settings = Store.getSettings();
          const maxVal = Math.max(data.totalInc, data.totalExp) || 1;
          const incPct = Math.round((data.totalInc / maxVal) * 100);
          const expPct = Math.round((data.totalExp / maxVal) * 100);

          // Calculate Pie Chart Gradient
          let currentDeg = 0;
          const pieGradient = data.pieData.map(item => {
              const pct = data.totalExp > 0 ? (item.amount / data.totalExp) : 0;
              const deg = pct * 360;
              const start = currentDeg;
              const end = currentDeg + deg;
              currentDeg = end;
              return `${item.color} ${start}deg ${end}deg`;
          }).join(', ');
          
          const pieStyle = data.totalExp > 0 
            ? `background: conic-gradient(${pieGradient});`
            : `background: #eee;`;

          const html = `
            <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                <style>
                  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; background: #fff; }
                  
                  /* Header */
                  .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #4e6aff; padding-bottom: 20px; }
                  .report-title { font-size: 28px; font-weight: 800; color: #1a1a1a; letter-spacing: -0.5px; margin: 0; }
                  .report-meta { color: #666; font-size: 14px; margin-top: 5px; }
                  .company-info { text-align: right; font-size: 12px; color: #555; }
                  .company-name { font-weight: bold; font-size: 16px; color: #333; margin-bottom: 4px; }
                  
                  /* Summary Cards */
                  .summary-cards { display: flex; gap: 20px; margin-bottom: 40px; }
                  .card { flex: 1; padding: 20px; background: #f8f9fa; border-radius: 12px; border: 1px solid #e9ecef; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
                  .card-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
                  .card-value { font-size: 24px; font-weight: 700; margin-top: 6px; font-family: monospace; }
                  .income { color: #10b981; }
                  .expense { color: #ef4444; }
                  .balance { color: #3b82f6; }

                  .section-title { font-size: 18px; font-weight: 700; color: #1f2937; margin: 40px 0 20px 0; display: flex; align-items: center; }
                  .section-title::before { content: ''; width: 4px; height: 18px; background: #4e6aff; margin-right: 10px; border-radius: 2px; }
                  
                  /* Charts Layout */
                  .charts-row { display: flex; gap: 40px; margin-bottom: 40px; align-items: flex-start; }
                  
                  /* Bar Chart */
                  .bar-container { flex: 1; padding: 20px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; display: flex; justify-content: space-around; align-items: flex-end; height: 200px; }
                  .bar-group { display: flex; flex-direction: column; align-items: center; width: 40%; height: 100%; justify-content: flex-end; }
                  .bar { width: 100%; border-radius: 6px 6px 0 0; position: relative; transition: height 0.3s; min-height: 4px; }
                  .bar-value { position: absolute; top: -25px; width: 100%; text-align: center; font-weight: bold; font-size: 14px; }
                  .bar-label { margin-top: 12px; font-weight: 600; color: #4b5563; font-size: 14px; }

                  /* Pie Chart */
                  .pie-container { width: 200px; height: 200px; border-radius: 50%; position: relative; }
                  .pie-hole { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100px; height: 100px; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-direction: column; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
                  .pie-total-label { font-size: 10px; color: #999; text-transform: uppercase; }
                  .pie-total-value { font-size: 16px; font-weight: bold; color: #333; }

                  /* Category List */
                  .cat-list { margin-top: 8px; }
                  .cat-row { display: flex; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f3f4f6; }
                  .cat-row:last-child { border-bottom: none; }
                  .cat-icon { width: 12px; height: 12px; border-radius: 3px; margin-right: 12px; }
                  .cat-info { flex: 1; }
                  .cat-name { font-size: 14px; font-weight: 600; color: #374151; }
                  .cat-meta { font-size: 11px; color: #9ca3af; }
                  .cat-amount { font-size: 14px; font-weight: 700; color: #1f2937; }
                  .cat-pct { font-size: 12px; color: #6b7280; width: 45px; text-align: right; }

                  /* Footer */
                  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: flex-end; }
                  .footer-info { font-size: 11px; color: #9ca3af; line-height: 1.5; }
                  .watermark { font-size: 10px; color: #d1d5db; font-style: italic; }
                </style>
              </head>
              <body>
                <div class="header-row">
                    <div>
                        <h1 class="report-title">Financial Report</h1>
                        <div class="report-meta">Period: ${new Date(Number(year), Number(month)-1).toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
                    </div>
                    <div class="company-info">
                        <div class="company-name">${settings.company_name || 'Expense Manager'}</div>
                        <div>${settings.admin_name} | ${settings.admin_role}</div>
                        ${settings.company_contact ? `<div>Contact: ${settings.company_contact}</div>` : ''}
                    </div>
                </div>
                
                <div class="summary-cards">
                    <div class="card">
                        <div class="card-label">Total Income</div>
                        <div class="card-value income">₹${data.totalInc.toLocaleString('en-IN')}</div>
                    </div>
                    <div class="card">
                        <div class="card-label">Total Expense</div>
                        <div class="card-value expense">₹${data.totalExp.toLocaleString('en-IN')}</div>
                    </div>
                    <div class="card">
                        <div class="card-label">Net Balance</div>
                        <div class="card-value balance">₹${data.totalBalance.toLocaleString('en-IN')}</div>
                    </div>
                </div>

                <h2 class="section-title">Visual Overview</h2>
                <div class="charts-row">
                    <!-- Bar Chart -->
                    <div class="bar-container">
                        <div class="bar-group">
                             <div class="bar" style="height: ${incPct}%; background: #10b981;">
                                <div class="bar-value">₹${(data.totalInc/1000).toFixed(1)}k</div>
                             </div>
                             <div class="bar-label">Income</div>
                        </div>
                        <div class="bar-group">
                             <div class="bar" style="height: ${expPct}%; background: #ef4444;">
                                <div class="bar-value">₹${(data.totalExp/1000).toFixed(1)}k</div>
                             </div>
                             <div class="bar-label">Expense</div>
                        </div>
                    </div>

                    <!-- Pie Chart -->
                     <div style="flex: 1; display: flex; justify-content: center; align-items: center;">
                        <div class="pie-container" style="${pieStyle}">
                            <div class="pie-hole">
                                <div class="pie-total-label">Total Exp</div>
                                <div class="pie-total-value">₹${(data.totalExp/1000).toFixed(1)}k</div>
                            </div>
                        </div>
                    </div>
                </div>

                <h2 class="section-title">Expense Breakdown</h2>
                <div class="cat-list">
                    ${data.pieData.map(item => {
                        const pct = data.totalExp > 0 ? (item.amount / data.totalExp) * 100 : 0;
                        return `
                        <div class="cat-row">
                            <div class="cat-icon" style="background: ${item.color}"></div>
                            <div class="cat-info">
                                <div class="cat-name">${item.name}</div>
                                <div class="cat-meta">${item.count} transactions</div>
                            </div>
                            <div class="cat-amount">₹${item.amount.toLocaleString('en-IN')}</div>
                            <div class="cat-pct">${pct.toFixed(1)}%</div>
                        </div>
                        `;
                    }).join('')}
                </div>

                <div class="footer">
                    <div class="footer-info">
                        Generated by ${settings.admin_name}<br/>
                        ${settings.admin_role}<br/>
                        ${new Date().toLocaleString()}
                    </div>
                    <div class="watermark">
                        Confidential • Internal Use Only
                    </div>
                </div>
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
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader title="Analytics" subtitle="Financial Overview" />
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        {/* Filter & PDF Row */}
        <View style={styles.filterRow}>
            <View style={styles.monthSelector}>
                <TouchableOpacity onPress={() => changeMonth(-1)}>
                    <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.monthText}>{new Date(Number(year), Number(month)-1).toLocaleString('default', { month: 'long', year: 'numeric' })}</Text>
                <TouchableOpacity onPress={() => changeMonth(1)}>
                    <Ionicons name="chevron-forward" size={24} color={theme.colors.text} />
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
                    <Text style={[styles.balanceValue, { color: data.totalBalance >= 0 ? (theme.colors.success || '#2ecc71') : (theme.colors.danger || '#e74c3c') }]}>
                        ₹{data.totalBalance.toLocaleString('en-IN')}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.dot, { backgroundColor: theme.colors.success || '#2ecc71' }]} />
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
                backgroundColor: theme.colors.card,
                backgroundGradientFrom: theme.colors.card,
                backgroundGradientTo: theme.colors.card,
                decimalPlaces: 0,
                color: (opacity = 1) => theme.mode === 'dark' ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => theme.mode === 'dark' ? `rgba(156, 163, 175, ${opacity})` : `rgba(107, 114, 128, ${opacity})`,
                barPercentage: 0.7,
                fillShadowGradient: theme.colors.danger || '#e74c3c',
                fillShadowGradientOpacity: 1,
                propsForBackgroundLines: {
                    strokeDasharray: "",
                    stroke: theme.colors.border
                },
                propsForLabels: {
                    fontSize: 12,
                }
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
                <View style={{ backgroundColor: theme.colors.input, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                    <Text style={{ fontSize: 12, color: theme.colors.subtext }}>This Month</Text>
                </View>
            </View>
            
            {data.pieData.length > 0 ? (
                <View style={{ alignItems: 'center', position: 'relative' }}>
                    <PieChart
                        data={data.pieData}
                        width={width - 48}
                        height={240}
                        chartConfig={{
                            color: (opacity = 1) => theme.mode === 'dark' ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
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
                        backgroundColor: theme.colors.card,
                        borderRadius: 60,
                        alignItems: 'center', 
                        justifyContent: 'center',
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        elevation: 2
                    }}>
                        <Text style={{ fontSize: 12, color: theme.colors.subtext }}>Total</Text>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.text }}>
                            ₹{data.totalExp.toLocaleString('en-IN', { notation: "compact", compactDisplay: "short" })}
                        </Text>
                    </View>
                </View>
            ) : (
                <Text style={{ textAlign: 'center', color: theme.colors.subtext, padding: 20 }}>No expenses recorded</Text>
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

        {/* Wallet Usage Section */}
        <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.cardTitle}>Wallet Usage</Text>
            </View>
            
            {data.walletPieData.length > 0 ? (
                <View style={{ alignItems: 'center', position: 'relative' }}>
                    <PieChart
                        data={data.walletPieData}
                        width={width - 48}
                        height={240}
                        chartConfig={{
                            color: (opacity = 1) => theme.mode === 'dark' ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
                        }}
                        accessor={"amount"}
                        backgroundColor={"transparent"}
                        paddingLeft={"80"}
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
                        backgroundColor: theme.colors.card,
                        borderRadius: 60,
                        alignItems: 'center', 
                        justifyContent: 'center',
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        elevation: 2
                    }}>
                        <Text style={{ fontSize: 10, color: theme.colors.subtext, textTransform: 'uppercase' }}>Total Exp</Text>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.text }}>
                             ₹{(data.totalExp/1000).toFixed(1)}k
                        </Text>
                    </View>
                </View>
            ) : (
                <Text style={{ textAlign: 'center', color: theme.colors.subtext, padding: 20 }}>No wallet usage recorded</Text>
            )}

            {/* Wallet List */}
            <View style={{ marginTop: 20 }}>
                {data.walletPieData.map((item, index) => (
                    <View key={index} style={styles.categoryRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                                <Ionicons name="wallet-outline" size={20} color={item.color} />
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

const getStyles = (theme: any) => StyleSheet.create({
    card: {
        backgroundColor: theme.colors.card,
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        elevation: 4,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    balanceLabel: {
        fontSize: 14,
        color: theme.colors.subtext,
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
        color: theme.colors.subtext,
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
        color: theme.colors.text
    },
    transactionCount: {
        fontSize: 12,
        color: theme.colors.subtext,
        marginTop: 2
    },
    categoryAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text
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
        backgroundColor: theme.colors.card,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        elevation: 2,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    monthText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginHorizontal: 12,
        minWidth: 120,
        textAlign: 'center'
    },
    pdfButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        shadowColor: theme.colors.primary,
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
