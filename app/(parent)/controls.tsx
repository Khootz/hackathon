import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  RefreshControl,
} from "react-native";
import { useAuthStore } from "../../store/authStore";
import { useFamilyStore } from "../../store/familyStore";
import { supabase } from "../../lib/supabase";

interface AppControl {
  id: string;
  parent_id: string;
  child_id: string;
  app_name: string;
  drain_rate: number;
  is_monitored: boolean;
  is_locked: boolean;
  daily_limit_minutes: number | null;
}

const DEFAULT_APPS = [
  { name: "Clash Royale", icon: "🎮", defaultDrain: 2 },
  { name: "YouTube", icon: "📺", defaultDrain: 1.5 },
  { name: "Instagram", icon: "📸", defaultDrain: 1 },
  { name: "TikTok", icon: "🎵", defaultDrain: 2 },
  { name: "Minecraft", icon: "⛏️", defaultDrain: 1 },
];

export default function ControlsPanel() {
  const user = useAuthStore((s) => s.user);
  const { children, fetchChildren } = useFamilyStore();

  const [controls, setControls] = useState<AppControl[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [newAppName, setNewAppName] = useState("");
  const [newDrainRate, setNewDrainRate] = useState("1");

  const userId = user?.id;

  const loadControls = useCallback(async () => {
    if (!userId) return;
    await fetchChildren(userId);

    const childList = useFamilyStore.getState().children;
    if (childList.length > 0 && !selectedChild) {
      setSelectedChild(childList[0].id);
    }

    const targetChild = selectedChild || childList[0]?.id;
    if (!targetChild) return;

    const { data } = await supabase
      .from("app_controls")
      .select("*")
      .eq("parent_id", userId)
      .eq("child_id", targetChild);

    setControls(data ?? []);
  }, [userId, selectedChild]);

  useEffect(() => {
    loadControls();
  }, [loadControls]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadControls();
    setRefreshing(false);
  }, [loadControls]);

  const handleAddApp = async () => {
    if (!userId || !selectedChild || !newAppName.trim()) {
      Alert.alert("Error", "Enter an app name");
      return;
    }

    const drainRate = parseFloat(newDrainRate) || 1;

    const { data, error } = await supabase
      .from("app_controls")
      .upsert(
        {
          parent_id: userId,
          child_id: selectedChild,
          app_name: newAppName.trim(),
          drain_rate: drainRate,
          is_monitored: true,
          is_locked: false,
        },
        { onConflict: "parent_id,child_id,app_name" }
      )
      .select()
      .single();

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    if (data) {
      setControls((prev) => {
        const existing = prev.findIndex((c) => c.app_name === data.app_name);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = data;
          return updated;
        }
        return [...prev, data];
      });
    }

    setNewAppName("");
    setNewDrainRate("1");
  };

  const handleToggleMonitoring = async (control: AppControl) => {
    const newValue = !control.is_monitored;

    await supabase
      .from("app_controls")
      .update({ is_monitored: newValue })
      .eq("id", control.id);

    setControls((prev) =>
      prev.map((c) => (c.id === control.id ? { ...c, is_monitored: newValue } : c))
    );
  };

  const handleUpdateDrainRate = async (control: AppControl, rate: string) => {
    const newRate = parseFloat(rate) || 1;

    await supabase
      .from("app_controls")
      .update({ drain_rate: newRate })
      .eq("id", control.id);

    setControls((prev) =>
      prev.map((c) => (c.id === control.id ? { ...c, drain_rate: newRate } : c))
    );
  };

  const handleToggleLock = async (control: AppControl) => {
    const newValue = !control.is_locked;

    await supabase
      .from("app_controls")
      .update({ is_locked: newValue })
      .eq("id", control.id);

    setControls((prev) =>
      prev.map((c) => (c.id === control.id ? { ...c, is_locked: newValue } : c))
    );
  };

  const handleSetupDefaults = async () => {
    if (!userId || !selectedChild) return;

    for (const app of DEFAULT_APPS) {
      await supabase
        .from("app_controls")
        .upsert(
          {
            parent_id: userId,
            child_id: selectedChild,
            app_name: app.name,
            drain_rate: app.defaultDrain,
            is_monitored: true,
            is_locked: false,
          },
          { onConflict: "parent_id,child_id,app_name" }
        );
    }

    await loadControls();
    Alert.alert("Done", "Default app controls have been configured");
  };

  const getAppIcon = (name: string) => {
    const icons: Record<string, string> = {
      "Clash Royale": "🎮",
      YouTube: "📺",
      Instagram: "📸",
      TikTok: "🎵",
      Minecraft: "⛏️",
    };
    return icons[name] || "📱";
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0f0f23" }}
      contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />
      }
    >
      <Text style={{ fontSize: 24, fontWeight: "bold", color: "#fff" }}>
        Controls 🎛️
      </Text>
      <Text style={{ fontSize: 14, color: "#a0aec0", marginTop: 4 }}>
        Manage monitored apps and drain rates
      </Text>

      {/* Child selector */}
      {children.length > 1 && (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
          {children.map((child) => (
            <TouchableOpacity
              key={child.id}
              onPress={() => setSelectedChild(child.id)}
              style={{
                padding: 10,
                paddingHorizontal: 16,
                borderRadius: 20,
                backgroundColor: selectedChild === child.id ? "#6C63FF" : "#16213e",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 13 }}>
                {child.name || "Child"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {children.length === 0 ? (
        <View
          style={{
            backgroundColor: "#16213e",
            borderRadius: 12,
            padding: 24,
            marginTop: 24,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 48 }}>🔗</Text>
          <Text style={{ color: "#fff", fontWeight: "bold", marginTop: 8 }}>
            Link a child first
          </Text>
          <Text style={{ color: "#a0aec0", fontSize: 13, marginTop: 4 }}>
            Go to Dashboard to generate an invite code
          </Text>
        </View>
      ) : (
        <>
          {/* Quick setup */}
          {controls.length === 0 && (
            <TouchableOpacity
              onPress={handleSetupDefaults}
              style={{
                backgroundColor: "#6C63FF",
                borderRadius: 12,
                padding: 16,
                marginTop: 20,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                ⚡ Quick Setup Default Apps
              </Text>
              <Text style={{ color: "#c4c0ff", fontSize: 12, marginTop: 4 }}>
                Configure common apps with default drain rates
              </Text>
            </TouchableOpacity>
          )}

          {/* Existing Controls */}
          {controls.map((control) => (
            <View
              key={control.id}
              style={{
                backgroundColor: "#16213e",
                borderRadius: 12,
                padding: 16,
                marginTop: 12,
                borderWidth: 1,
                borderColor: control.is_locked
                  ? "#6b21a8"
                  : control.is_monitored
                  ? "#2d3748"
                  : "#4a5568",
                opacity: control.is_monitored ? 1 : 0.6,
              }}
            >
              {/* Row: icon + name + monitor switch */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                  <Text style={{ fontSize: 24 }}>
                    {control.is_locked ? "🔒" : getAppIcon(control.app_name)}
                  </Text>
                  <View>
                    <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
                      {control.app_name}
                    </Text>
                    {control.is_locked && (
                      <Text style={{ color: "#9f7aea", fontSize: 11 }}>Locked for child</Text>
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {/* Lock / Unlock button */}
                  <TouchableOpacity
                    onPress={() => handleToggleLock(control)}
                    style={{
                      backgroundColor: control.is_locked ? "#4a1d96" : "#1a2a1a",
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: control.is_locked ? "#7c3aed" : "#2d3748",
                    }}
                  >
                    <Text
                      style={{
                        color: control.is_locked ? "#c4b5fd" : "#a0aec0",
                        fontSize: 12,
                        fontWeight: "bold",
                      }}
                    >
                      {control.is_locked ? "🔒 Unlock" : "🔓 Lock"}
                    </Text>
                  </TouchableOpacity>
                  {/* Monitor toggle */}
                  <Switch
                    value={control.is_monitored}
                    onValueChange={() => handleToggleMonitoring(control)}
                    trackColor={{ false: "#4a5568", true: "#6C63FF" }}
                    thumbColor="#fff"
                  />
                </View>
              </View>

              {/* Drain rate row */}
              {control.is_monitored && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 12,
                    gap: 8,
                  }}
                >
                  <Text style={{ color: "#a0aec0", fontSize: 13 }}>Drain rate:</Text>
                  {[0.5, 1, 1.5, 2, 3].map((rate) => (
                    <TouchableOpacity
                      key={rate}
                      onPress={() => handleUpdateDrainRate(control, rate.toString())}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 6,
                        backgroundColor:
                          control.drain_rate === rate ? "#6C63FF" : "#0f0f23",
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: 12 }}>{rate}x</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}

          {/* Add custom app */}
          <View
            style={{
              backgroundColor: "#16213e",
              borderRadius: 12,
              padding: 16,
              marginTop: 20,
              borderWidth: 1,
              borderColor: "#2d3748",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold", marginBottom: 12 }}>
              + Add Custom App
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                placeholder="App name"
                placeholderTextColor="#a0aec0"
                value={newAppName}
                onChangeText={setNewAppName}
                style={{
                  flex: 2,
                  backgroundColor: "#0f0f23",
                  color: "#fff",
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
              <TextInput
                placeholder="Rate"
                placeholderTextColor="#a0aec0"
                value={newDrainRate}
                onChangeText={setNewDrainRate}
                keyboardType="numeric"
                style={{
                  flex: 1,
                  backgroundColor: "#0f0f23",
                  color: "#fff",
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 14,
                  textAlign: "center",
                }}
              />
            </View>
            <TouchableOpacity
              onPress={handleAddApp}
              style={{
                backgroundColor: "#6C63FF",
                padding: 12,
                borderRadius: 8,
                alignItems: "center",
                marginTop: 12,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Add App</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}
