import React, { useContext, useEffect, useState } from 'react';
import { TouchableOpacity, View, useWindowDimensions, Text } from 'react-native';
import { createMaterialTopTabNavigator, MaterialTopTabBar } from '@react-navigation/material-top-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Store } from '../../data/Store';
import HomeScreen from '../HomeScreen';
import SettingsScreen from '../SettingsScreen';
import { BudgetsScreen } from './BudgetsScreen';
import { WalletsScreen } from './WalletsScreen';
import { TodosScreen } from './TodosScreen';
import { NotesScreen } from './NotesScreen';
import { InvoicesScreen } from './InvoicesScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { UIContext } from '../../context/UIContext';

const Tab = createMaterialTopTabNavigator();

function PlannerTabBar(props: any) {
    const insets = useSafeAreaInsets();
    const { navbarStyle, state, descriptors, navigation } = props;
    const { theme } = useContext(UIContext);

    if (navbarStyle === 'glass') {
        return (
            <View style={{
                position: 'absolute',
                bottom: 25,
                left: 20,
                right: 20,
                height: 70,
                borderRadius: 35,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
                elevation: 5,
            }}>
                <View style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    borderRadius: 35,
                    overflow: 'hidden',
                }}>
                    <BlurView
                        intensity={90}
                        tint={theme.mode === 'dark' ? 'dark' : 'light'}
                        style={{ flex: 1 }}
                    />
                    <View style={{
                        position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
                        backgroundColor: theme.mode === 'dark' ? 'rgba(30,30,30,0.5)' : 'rgba(255,255,255,0.4)'
                    }} />
                </View>

                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    height: '100%',
                    paddingHorizontal: 10,
                }}>
                    {state.routes.map((route: any, index: number) => {
                        const { options } = descriptors[route.key];
                        const isFocused = state.index === index;
                        const onPress = () => {
                            const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true,
                            });
                            if (!isFocused && !event.defaultPrevented) {
                                navigation.navigate(route.name);
                            }
                        };
                        const color = isFocused ? theme.colors.primary : (theme.mode === 'dark' ? '#9CA3AF' : '#6B7280');
                        const icon = options.tabBarIcon ? options.tabBarIcon({ focused: isFocused, color, size: 24 }) : null;
                        const label = route.name;

                        return (
                            <TouchableOpacity
                                key={route.key}
                                onPress={onPress}
                                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}
                            >
                                {icon}
                                <Text style={{ fontSize: 10, color, marginTop: 4, fontWeight: isFocused ? '600' : '400' }}>{label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    }
    
    return <MaterialTopTabBar {...props} />;
}

export const PlannerNavigator = () => {
    const { width } = useWindowDimensions();
    const labelFontSize = width < 360 ? 10 : 12;
    const [navbarStyle, setNavbarStyle] = useState(Store.settings.navbar_style || 'classic');
    const { theme } = useContext(UIContext);

    useEffect(() => {
        const unsub = Store.subscribe(() => {
             setNavbarStyle(Store.settings.navbar_style || 'classic');
        });
        return unsub;
    }, []);

    return (
        <Tab.Navigator
            initialRouteName={Store.plannerInitialRoute || 'Budgets'}
            tabBarPosition="bottom"
            tabBar={props => <PlannerTabBar {...props} navbarStyle={navbarStyle} />}
            screenOptions={{
                tabBarShowLabel: true,
                tabBarScrollEnabled: false,
                tabBarIndicatorStyle: {
                    backgroundColor: theme.colors.primary,
                    height: 3,
                    borderRadius: 999,
                },
                tabBarStyle: {
                    backgroundColor: theme.colors.card,
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
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.subtext,
                tabBarPressColor: theme.mode === 'dark' ? '#374151' : '#E5E7EB',
            }}
        >
            <Tab.Screen 
                name="Budgets" 
                component={BudgetsScreen} 
                options={{
                    tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? "pie-chart" : "pie-chart-outline"} size={20} color={color} />
                }}
            />
            <Tab.Screen 
                name="Wallets" 
                component={WalletsScreen} 
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
            
        </Tab.Navigator>
    );
};
