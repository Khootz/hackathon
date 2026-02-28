import { Tabs } from "expo-router";
import { Text } from "react-native";
import { Colors } from "../../constants";

export default function ParentLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: Colors.card, borderTopColor: Colors.borderLight, borderTopWidth: 1 },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
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
