import "../global.css";
import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../store/authStore";
import { View, ActivityIndicator } from "react-native";
import { Colors } from "../constants";

export default function RootLayout() {
  const { session, role, loading, initialize } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      // Not signed in → go to login
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      // Signed in → route based on role
      if (role === "parent") {
        router.replace("/(parent)");
      } else if (role === "student") {
        router.replace("/(student)");
      }
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Slot />
    </>
  );
}
