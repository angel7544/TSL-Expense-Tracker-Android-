import React, { useState, useEffect, useRef } from "react";
import { View, ActivityIndicator, TouchableOpacity, StyleSheet, Text, Modal, AppState } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { enableScreens } from "react-native-screens";
import { Ionicons } from "@expo/vector-icons";
import HomeScreen from "./src/screens/HomeScreen";
import ListScreen from "./src/screens/ListScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import ChartsScreen from "./src/screens/ChartsScreen";
import ReportScreen from "./src/screens/ReportScreen";
import AuthScreen from "./src/screens/AuthScreen";
import { AddRecordModal } from "./src/components/AddRecordModal";
import { Store } from "./src/data/Store";
import { UIContext } from "./src/context/UIContext";
import BackupScreen from "./src/screens/BackupScreen";
import LockScreen from "./src/screens/LockScreen";

const CustomTabBarButton = ({ children, onPress }: any) => (
    <TouchableOpacity
        style={{
            top: -20,
            justifyContent: 'center',
            alignItems: 'center',
            width: 50, // allocate space in flex layout
        }}
        onPress={onPress}
    >
        <View style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: '#8B5CF6', // Purple-ish
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#8B5CF6',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 5
        }}>
            {children}
        </View>
    </TouchableOpacity>
);

function MyTabBar({ state, descriptors, navigation, onAddPress }: any) {
    const focusedRoute = state.routes[state.index];
    const focusedDescriptor = descriptors[focusedRoute.key];
    const focusedOptions = focusedDescriptor.options;

    if (focusedOptions.tabBarStyle?.display === "none") {
        return null;
    }

    return (
      <View style={{
        flexDirection: 'row',
        position: 'absolute',
        bottom: 3,
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
        // borderTopWidth: 0, // not needed for View
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {state.routes.map((route: any, index: number) => {
            // Logic to render Home, then Add, then others
            // Routes: Home (0), Charts (1), List (2), Report (3), Settings (4), Backup (5)
            // We want Add between Home and Charts.
            
            // Render the current route tab
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
    
            const color = isFocused ? "#8B5CF6" : "#CDCDE0";
            const icon = options.tabBarIcon ? options.tabBarIcon({ focused: isFocused, color, size: 24 }) : null;
            
            const TabItem = (
                <TouchableOpacity
                    key={route.key}
                    onPress={onPress}
                    style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}
                >
                    {icon}
                </TouchableOpacity>
            );

            // If it's the List item, render List then Add Button
            if (route.name === 'List') {
                return (
                    <React.Fragment key={route.key}>
                        {TabItem}
                        <CustomTabBarButton onPress={onAddPress}>
                            <Ionicons name="add" size={32} color="white" />
                        </CustomTabBarButton>
                    </React.Fragment>
                );
            }

            return TabItem;
        })}
      </View>
    );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(Store.isAuthenticated);
  const [isLocked, setIsLocked] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    async function prepare() {
      try {
        enableScreens();
        await Store.init();
        setIsAuthenticated(Store.isAuthenticated);
        if (Store.isAuthenticated && Store.settings.lock_enabled) {
            setIsLocked(true);
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setReady(true);
      }
    }
    prepare();

    const unsub = Store.subscribe(() => {
        setIsAuthenticated(Store.isAuthenticated);
        // If user logs out, unlock (so they see login screen)
        if (!Store.isAuthenticated) {
            setIsLocked(false);
        }
    });

    const subscription = AppState.addEventListener('change', nextAppState => {
        if (
            appState.current.match(/inactive|background/) &&
            nextAppState === 'active'
        ) {
            // App has come to the foreground
            if (Store.isAuthenticated && Store.settings.lock_enabled) {
                setIsLocked(true);
            }
        }
        appState.current = nextAppState;
    });

    return () => {
        unsub();
        subscription.remove();
    };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  if (isLocked && isAuthenticated) {
      return <LockScreen onUnlock={() => setIsLocked(false)} />;
  }

  const Tab = createMaterialTopTabNavigator();
  
  return (
    <UIContext.Provider value={{ showAddModal: () => setAddModalVisible(true) }}>
        <NavigationContainer>
        <Tab.Navigator
            tabBarPosition="bottom"
            tabBar={props => <MyTabBar {...props} onAddPress={() => setAddModalVisible(true)} />}
            screenOptions={{
                swipeEnabled: true,
                tabBarShowLabel: false,
                tabBarIndicatorStyle: { height: 0 }, // Hide default indicator
                // Animation settings usually default to pager swipe which is what we want
            }}
        >
           
            <Tab.Screen 
                name="Home" 
                component={HomeScreen} 
                options={{
                    tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
                }}
            />
            {/* Add screen removed from navigator to avoid swipe landing on it */}
            <Tab.Screen 
                name="Charts" 
                component={ChartsScreen} 
                options={{
                    tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? "pie-chart" : "pie-chart-outline"} size={24} color={color} />
                }}
            />
            
            <Tab.Screen 
                name="List" 
                component={ListScreen} 
                options={{
                    tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? "wallet" : "wallet-outline"} size={24} color={color} />
                }}
            />
            
            <Tab.Screen 
                name="Report" 
                component={ReportScreen} 
                options={{
                    tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? "document-text" : "document-text-outline"} size={24} color={color} />
                }}
            />
         
            {isAuthenticated ? (
            <Tab.Screen 
                name="Settings" 
                component={SettingsScreen} 
                options={{
                    tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
                }}
            />
            ) : (
            <Tab.Screen 
                name="Login" 
                component={AuthScreen} 
                options={{
                    tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? "log-in" : "log-in-outline"} size={24} color={color} />,
                    tabBarStyle: { display: "none" },
                }}
            />
            )}
            {isAuthenticated && (
            <Tab.Screen 
                name="Backup" 
                component={BackupScreen} 
                options={{
                    tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? "cloud-upload" : "cloud-upload-outline"} size={24} color={color} />
                }}
            />
            )}
        </Tab.Navigator>
        </NavigationContainer>
        
        <AddRecordModal 
            visible={addModalVisible} 
            onClose={() => setAddModalVisible(false)} 
            onSave={() => setAddModalVisible(false)}
        />
        {/* <Modal visible={authModalVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => Store.setAuthModalVisible(false)}>
            <AuthScreen onClose={() => Store.setAuthModalVisible(false)} />
        </Modal> */}
    </UIContext.Provider>
  );
}
