import { Tabs } from "expo-router";
import Svg, { Path, Circle, Line, Rect } from "react-native-svg";
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
          tabBarIcon: ({ color }) => (
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Line x1="18" y1="20" x2="18" y2="10" stroke={color} strokeWidth={2} strokeLinecap="round" />
              <Line x1="12" y1="20" x2="12" y2="4" stroke={color} strokeWidth={2} strokeLinecap="round" />
              <Line x1="6" y1="20" x2="6" y2="14" stroke={color} strokeWidth={2} strokeLinecap="round" />
            </Svg>
          ),
        }}
      />
      <Tabs.Screen
        name="monitor"
        options={{
          title: "Activity",
          tabBarIcon: ({ color }) => (
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.8} />
            </Svg>
          ),
        }}
      />
      <Tabs.Screen
        name="controls"
        options={{
          title: "Controls",
          tabBarIcon: ({ color }) => (
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth={1.8} />
              <Rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth={1.8} />
              <Rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth={1.8} />
              <Rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth={1.8} />
            </Svg>
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color }) => (
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          ),
        }}
      />
    </Tabs>
  );
}
