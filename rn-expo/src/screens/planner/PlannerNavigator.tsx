import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Store } from '../../data/Store';
import HomeScreen from '../HomeScreen';
import SettingsScreen from '../SettingsScreen';
import { BudgetsScreen } from './BudgetsScreen';
import { TodosScreen } from './TodosScreen';
import { NotesScreen } from './NotesScreen';
import { InvoicesScreen } from './InvoicesScreen';

const Tab = createMaterialTopTabNavigator();

export const PlannerNavigator = () => {
    const { width } = useWindowDimensions();
    const labelFontSize = width < 360 ? 10 : 12;

    return (
        <Tab.Navigator
            tabBarPosition="bottom"
            screenOptions={{
                tabBarShowLabel: true,
                tabBarScrollEnabled: true,
                tabBarIndicatorStyle: {
                    backgroundColor: '#4F46E5',
                    height: 3,
                    borderRadius: 999,
                },
                tabBarStyle: {
                    backgroundColor: '#ffffff',
                    elevation: 4,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                    borderBottomWidth: 0,
                },
                tabBarLabelStyle: {
                    fontWeight: '700',
                    fontSize: labelFontSize,
                    textTransform: 'none',
                    letterSpacing: 0.4,
                },
                tabBarActiveTintColor: '#111827',
                tabBarInactiveTintColor: '#9CA3AF',
                tabBarPressColor: '#E5E7EB',
            }}
        >
            <Tab.Screen 
                name="Budgets" 
                component={BudgetsScreen} 
                options={{
                    tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? "wallet" : "wallet-outline"} size={20} color={color} />
                }}
            />
            <Tab.Screen 
                name="Todos" 
                component={TodosScreen} 
                options={{
                    tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? "checkbox" : "checkbox-outline"} size={20} color={color} />
                }}
            />
            <Tab.Screen 
                name="Notes" 
                component={NotesScreen} 
                options={{
                    tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? "document-text" : "document-text-outline"} size={20} color={color} />
                }}
            />
            <Tab.Screen 
                name="Invoices" 
                component={InvoicesScreen} 
                options={{
                    tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? "receipt" : "receipt-outline"} size={20} color={color} />
                }}
            />
            <Tab.Screen
                name="PlannerSettings"
                component={SettingsScreen}
                options={{
                    title: "Settings",
                    tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? "settings" : "settings-outline"} size={20} color={color} />
                }}
            />
        </Tab.Navigator>
    );
};
