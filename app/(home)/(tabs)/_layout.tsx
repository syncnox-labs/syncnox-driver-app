import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#5EC299",
        tabBarInactiveTintColor: "#8E9491",
        tabBarStyle: {
          backgroundColor: "#0D0F0E",
          borderTopColor: "rgba(255,255,255,0.05)",
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 88 : 65,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 28 : 10,
          elevation: 8,
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: Platform.OS === "ios" ? 0 : 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "list" : "list-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "map" : "map-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "settings" : "settings-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
