import { Tabs } from "expo-router";
import { Text } from "react-native";
import { Colors } from "../../constants";

export default function StudentLayout() {
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
