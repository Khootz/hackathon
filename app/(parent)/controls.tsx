import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  RefreshControl,
  Animated,
} from "react-native";
import Svg, { Path, Line, Polyline, Circle, Rect } from "react-native-svg";
import { useAuthStore } from "../../store/authStore";
import { useFamilyStore } from "../../store/familyStore";
import { supabase } from "../../lib/supabase";
import { Colors, Fonts, Radii, Shadows } from "../../constants";

// ── Icons ────────────────────────────────────────────────────────────────────
const LockIcon = ({ size = 16, color = Colors.error }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke={color} strokeWidth={1.8} />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);
const UnlockIcon = ({ size = 16, color = Colors.textSecondary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke={color} strokeWidth={1.8} />
    <Path d="M7 11V7a5 5 0 0 1 9.9-1" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);
const PhoneIcon = ({ size = 18, color = Colors.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="5" y="2" width="14" height="20" rx="2" ry="2" stroke={color} strokeWidth={1.8} />
    <Line x1="12" y1="18" x2="12.01" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const ZapIcon = ({ size = 18, color = Colors.textInverse }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const PlusIcon = ({ size = 16, color = Colors.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const LinkIcon = ({ size = 28, color = Colors.accent }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ── Types ────────────────────────────────────────────────────────────────────
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
  { name: "Clash Royale", defaultDrain: 2 },
  { name: "YouTube", defaultDrain: 1.5 },
  { name: "Instagram", defaultDrain: 1 },
  { name: "TikTok", defaultDrain: 2 },
  { name: "Minecraft", defaultDrain: 1 },
];

// ── Component ────────────────────────────────────────────────────────────────
export default function ControlsPanel() {
  const user = useAuthStore((s) => s.user);
  const { children, fetchChildren } = useFamilyStore();

  const [controls, setControls] = useState<AppControl[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [newAppName, setNewAppName] = useState("");
  const [newDrainRate, setNewDrainRate] = useState("1");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const userId = user?.id;

  // Fetch children once when user id is known
  useEffect(() => {
    if (userId) fetchChildren(userId);
  }, [userId]);

  // Auto-select first child once children are loaded
  useEffect(() => {
    if (!selectedChild && children.length > 0) setSelectedChild(children[0].id);
  }, [children, selectedChild]);

  // Entrance animation — once on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 460, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 14, useNativeDriver: true }),
    ]).start();
  }, []);

  const loadControls = useCallback(async () => {
    if (!userId || !selectedChild) return;
    const { data } = await supabase.from("app_controls").select("*").eq("parent_id", userId).eq("child_id", selectedChild);
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
    if (!userId || !selectedChild || !newAppName.trim()) { Alert.alert("Error", "Enter an app name"); return; }
    const drainRate = parseFloat(newDrainRate) || 1;
    const { data, error } = await supabase.from("app_controls").upsert(
      { parent_id: userId, child_id: selectedChild, app_name: newAppName.trim(), drain_rate: drainRate, is_monitored: true, is_locked: false },
      { onConflict: "parent_id,child_id,app_name" }
    ).select().single();
    if (error) { Alert.alert("Error", error.message); return; }
    if (data) {
      setControls((prev) => {
        const idx = prev.findIndex((c) => c.app_name === data.app_name);
        if (idx >= 0) { const u = [...prev]; u[idx] = data; return u; }
        return [...prev, data];
      });
    }
    setNewAppName(""); setNewDrainRate("1");
  };

  const handleToggleMonitoring = async (control: AppControl) => {
    const v = !control.is_monitored;
    await supabase.from("app_controls").update({ is_monitored: v }).eq("id", control.id);
    setControls((prev) => prev.map((c) => (c.id === control.id ? { ...c, is_monitored: v } : c)));
  };

  const handleUpdateDrainRate = async (control: AppControl, rate: string) => {
    const r = parseFloat(rate) || 1;
    await supabase.from("app_controls").update({ drain_rate: r }).eq("id", control.id);
    setControls((prev) => prev.map((c) => (c.id === control.id ? { ...c, drain_rate: r } : c)));
  };

  const handleToggleLock = async (control: AppControl) => {
    const v = !control.is_locked;
    await supabase.from("app_controls").update({ is_locked: v }).eq("id", control.id);
    setControls((prev) => prev.map((c) => (c.id === control.id ? { ...c, is_locked: v } : c)));
  };

  const handleSetupDefaults = async () => {
    if (!userId || !selectedChild) return;
    for (const app of DEFAULT_APPS) {
      await supabase.from("app_controls").upsert(
        { parent_id: userId, child_id: selectedChild, app_name: app.name, drain_rate: app.defaultDrain, is_monitored: true, is_locked: false },
        { onConflict: "parent_id,child_id,app_name" }
      );
    }
    await loadControls();
    Alert.alert("Done", "Default app controls configured");
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ backgroundColor: Colors.primary, paddingTop: 56, paddingBottom: 28, paddingHorizontal: 24, overflow: "hidden" }}>
        <View style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.07)" }} />
        <Text style={{ fontFamily: Fonts.body, fontSize: 14, color: "rgba(255,255,255,0.6)", letterSpacing: 0.5 }}>Parent Dashboard</Text>
        <Text style={{ fontFamily: Fonts.heading, fontSize: 28, color: Colors.textInverse, marginTop: 2 }}>App Controls</Text>
        <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
          Manage monitoring and drain rates
        </Text>
      </View>

      <Animated.View style={{ padding: 20, gap: 14, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

        {/* Child selector */}
        {children.length > 1 && (
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {children.map((child) => {
              const active = selectedChild === child.id;
              return (
                <TouchableOpacity
                  key={child.id}
                  onPress={() => setSelectedChild(child.id)}
                  activeOpacity={0.8}
                  style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radii.full, backgroundColor: active ? Colors.primary : Colors.card, borderWidth: 1.5, borderColor: active ? Colors.primary : Colors.border }}
                >
                  <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 14, color: active ? Colors.textInverse : Colors.textSecondary }}>
                    {child.name || "Child"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {children.length === 0 ? (
          <View style={{ backgroundColor: Colors.card, borderRadius: Radii.xl, padding: 32, alignItems: "center", ...Shadows.sm }}>
            <LinkIcon />
            <Text style={{ fontFamily: Fonts.heading, fontSize: 16, color: Colors.text, marginTop: 12 }}>No child linked</Text>
            <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.textLight, marginTop: 4, textAlign: "center" }}>
              Go to Dashboard to generate an invite code
            </Text>
          </View>
        ) : (
          <>
            {controls.length === 0 && (
              <TouchableOpacity
                onPress={handleSetupDefaults}
                activeOpacity={0.88}
                style={{ backgroundColor: Colors.accent, borderRadius: Radii.xl, padding: 18, flexDirection: "row", alignItems: "center", gap: 14, ...Shadows.md }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                  <ZapIcon size={18} />
                </View>
                <View>
                  <Text style={{ fontFamily: Fonts.heading, fontSize: 16, color: Colors.textInverse }}>Quick Setup</Text>
                  <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>Configure default popular apps</Text>
                </View>
              </TouchableOpacity>
            )}

            {controls.map((control) => (
              <View
                key={control.id}
                style={{
                  backgroundColor: Colors.card,
                  borderRadius: Radii.lg,
                  padding: 16,
                  borderLeftWidth: 3,
                  borderLeftColor: control.is_locked ? Colors.error : control.is_monitored ? Colors.primary : Colors.borderLight,
                  opacity: control.is_monitored ? 1 : 0.65,
                  ...Shadows.sm,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: control.is_locked ? Colors.errorLight : Colors.cardTeal, alignItems: "center", justifyContent: "center" }}>
                    {control.is_locked ? <LockIcon /> : <PhoneIcon size={16} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 15, color: Colors.text }}>{control.app_name}</Text>
                    {control.is_locked && (
                      <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: Colors.error }}>Locked for child</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleToggleLock(control)}
                    activeOpacity={0.8}
                    style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radii.sm, backgroundColor: control.is_locked ? Colors.errorLight : Colors.background, borderWidth: 1, borderColor: control.is_locked ? Colors.error : Colors.border, flexDirection: "row", alignItems: "center", gap: 5 }}
                  >
                    {control.is_locked ? <LockIcon size={12} /> : <UnlockIcon size={12} />}
                    <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 11, color: control.is_locked ? Colors.error : Colors.textSecondary }}>
                      {control.is_locked ? "Unlock" : "Lock"}
                    </Text>
                  </TouchableOpacity>
                  <Switch
                    value={control.is_monitored}
                    onValueChange={() => handleToggleMonitoring(control)}
                    trackColor={{ false: Colors.borderLight, true: Colors.primary + "88" }}
                    thumbColor={control.is_monitored ? Colors.primary : Colors.textLight}
                  />
                </View>

                {control.is_monitored && (
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, gap: 6 }}>
                    <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textLight, marginRight: 4 }}>Drain:</Text>
                    {[0.5, 1, 1.5, 2, 3].map((rate) => {
                      const active = control.drain_rate === rate;
                      return (
                        <TouchableOpacity
                          key={rate}
                          onPress={() => handleUpdateDrainRate(control, rate.toString())}
                          style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radii.sm, backgroundColor: active ? Colors.primary : Colors.background, borderWidth: 1, borderColor: active ? Colors.primary : Colors.border }}
                        >
                          <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 12, color: active ? Colors.textInverse : Colors.textSecondary }}>{rate}x</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            ))}

            {/* Add custom app */}
            <View style={{ backgroundColor: Colors.card, borderRadius: Radii.xl, padding: 18, borderWidth: 1.5, borderColor: Colors.border, ...Shadows.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <PlusIcon />
                <Text style={{ fontFamily: Fonts.heading, fontSize: 15, color: Colors.text }}>Add Custom App</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  placeholder="App name"
                  placeholderTextColor={Colors.textLight}
                  value={newAppName}
                  onChangeText={setNewAppName}
                  style={{ flex: 2, backgroundColor: Colors.background, color: Colors.text, padding: 12, borderRadius: Radii.md, fontSize: 14, fontFamily: Fonts.body, borderWidth: 1.5, borderColor: newAppName ? Colors.primary : Colors.border }}
                />
                <TextInput
                  placeholder="Rate"
                  placeholderTextColor={Colors.textLight}
                  value={newDrainRate}
                  onChangeText={setNewDrainRate}
                  keyboardType="numeric"
                  style={{ flex: 1, backgroundColor: Colors.background, color: Colors.text, padding: 12, borderRadius: Radii.md, fontSize: 14, fontFamily: Fonts.body, textAlign: "center", borderWidth: 1.5, borderColor: Colors.border }}
                />
              </View>
              <TouchableOpacity
                onPress={handleAddApp}
                activeOpacity={0.87}
                style={{ backgroundColor: Colors.accent, padding: 12, borderRadius: Radii.md, alignItems: "center", marginTop: 12 }}
              >
                <Text style={{ fontFamily: Fonts.heading, fontSize: 14, color: Colors.textInverse, letterSpacing: 0.3 }}>ADD APP</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </Animated.View>
    </ScrollView>
  );
}
