import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function StudentLayout() {
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
          title: "Home",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="learning"
        options={{
          title: "Learn",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📚</Text>,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Aura",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>✨</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}
