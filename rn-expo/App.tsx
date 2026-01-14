import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, TouchableOpacity, StyleSheet, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { enableScreens } from "react-native-screens";
import { Ionicons } from "@expo/vector-icons";
import HomeScreen from "./src/screens/HomeScreen";
import ListScreen from "./src/screens/ListScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import ChartsScreen from "./src/screens/ChartsScreen";
import ReportScreen from "./src/screens/ReportScreen";
import { AddRecordModal } from "./src/components/AddRecordModal";
import { Store } from "./src/data/Store";
import { UIContext } from "./src/context/UIContext";

const CustomTabBarButton = ({ children, onPress }: any) => (
    <TouchableOpacity
        style={{
            top: -20,
            justifyContent: 'center',
            alignItems: 'center',
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

export default function App() {
  const [ready, setReady] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        enableScreens();
        await Store.init();
      } catch (e) {
        console.warn(e);
      } finally {
        setReady(true);
      }
    }
    prepare();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  const Tab = createBottomTabNavigator();
  
  return (
    <UIContext.Provider value={{ showAddModal: () => setAddModalVisible(true) }}>
        <NavigationContainer>
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                    position: 'absolute',
                    bottom:3,
                    left: 20,
                    right: 20,
                    elevation: 0,
                    backgroundColor: '#ffffff',
                    borderRadius: 25,
                    height:65,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 5 },
                    shadowOpacity: 0.1,
                    shadowRadius: 10,
                    borderTopWidth: 0
                },
                tabBarActiveTintColor: "#8B5CF6",
                tabBarInactiveTintColor: "#CDCDE0",
            }}
        >
           
            <Tab.Screen 
                name="Home" 
                component={HomeScreen} 
                options={{
                    tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
                }}
            />
             <Tab.Screen 
                name="Add" 
                component={View} // Placeholder
                options={{
                    tabBarIcon: ({ focused }) => <Ionicons name="add" size={32} color="white" />,
                    tabBarButton: (props) => <CustomTabBarButton {...props} onPress={() => setAddModalVisible(true)} />
                }}
            />
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
            <Tab.Screen 
                name="Settings" 
                component={SettingsScreen} 
                options={{
                    tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
                }}
            />
        </Tab.Navigator>
        </NavigationContainer>
        
        <AddRecordModal 
            visible={addModalVisible} 
            onClose={() => setAddModalVisible(false)} 
            onSave={() => setAddModalVisible(false)}
        />
    </UIContext.Provider>
  );
}
