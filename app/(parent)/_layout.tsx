import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function ParentLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#0f0f23" },
        headerTintColor: "#fff",
        tabBarStyle: { backgroundColor: "#0f0f23", borderTopColor: "#2d3748" },
        tabBarActiveTintColor: "#6C63FF",
        tabBarInactiveTintColor: "#a0aec0",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📊</Text>,
        }}
      />
      <Tabs.Screen
        name="monitor"
        options={{
          title: "Activity",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👁️</Text>,
        }}
      />
      <Tabs.Screen
        name="controls"
        options={{
          title: "Controls",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🎛️</Text>,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🔔</Text>,
        }}
      />
    </Tabs>
  );
}
