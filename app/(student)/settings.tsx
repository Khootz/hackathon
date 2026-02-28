import { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert, TextInput, ScrollView, Animated } from "react-native";
import Svg, { Path, Circle, Polyline, Line } from "react-native-svg";
import { useAuthStore } from "../../store/authStore";
import { useFamilyStore } from "../../store/familyStore";
import { Colors, Fonts, Radii, Shadows } from "../../constants";

// ── Icons ───────────────────────────────────────────────────────────────────
const UserIcon = ({ size = 28, color = Colors.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={1.8} />
  </Svg>
);
const LinkIcon = ({ size = 18, color = Colors.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const CheckIcon = ({ size = 14, color = Colors.success }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline points="20 6 9 17 4 12" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const LogOutIcon = ({ size = 16, color = Colors.error }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="16 17 21 12 16 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="21" y1="12" x2="9" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const MailIcon = ({ size = 14, color = Colors.textLight }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="22,6 12,13 2,6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function SettingsScreen() {
  const { user, signOut } = useAuthStore();
  const { acceptInvite, parentId } = useFamilyStore();
  const [code, setCode] = useState("");
  const [linking, setLinking] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 460, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 14, useNativeDriver: true }),
    ]).start();
  }, []);

  const name = user?.user_metadata?.name ?? "";
  const initials = name ? name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() : "?";
  const role = (user?.user_metadata?.role ?? "student") as string;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero Header ── */}
      <View style={{ backgroundColor: Colors.primary, paddingTop: 56, paddingBottom: 40, alignItems: "center", overflow: "hidden" }}>
        <View style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,255,255,0.07)" }} />
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 14, borderWidth: 2, borderColor: "rgba(255,255,255,0.3)" }}>
          <Text style={{ fontFamily: Fonts.heading, fontSize: 26, color: Colors.textInverse }}>{initials}</Text>
        </View>
        <Text style={{ fontFamily: Fonts.heading, fontSize: 22, color: Colors.textInverse }}>{name || "Student"}</Text>
        <View style={{ backgroundColor: "rgba(255,255,255,0.15)", paddingVertical: 3, paddingHorizontal: 14, borderRadius: Radii.full, marginTop: 6 }}>
          <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 12, color: "rgba(255,255,255,0.85)", letterSpacing: 1 }}>
            {role.toUpperCase()}
          </Text>
        </View>
      </View>

      <Animated.View style={{ padding: 20, gap: 16, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

        {/* ── Profile Card ── */}
        <View style={{ backgroundColor: Colors.card, borderRadius: Radii.xl, padding: 20, gap: 0, ...Shadows.sm }}>
          <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 12, color: Colors.textLight, letterSpacing: 0.8, marginBottom: 14 }}>
            ACCOUNT INFO
          </Text>
          {[
            { label: "Name", value: name || "—" },
            { label: "Email", value: user?.email ?? "—" },
          ].map((row, i) => (
            <View key={row.label} style={{ paddingVertical: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: Colors.separator }}>
              <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textLight, marginBottom: 3 }}>{row.label}</Text>
              <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 15, color: Colors.text }}>{row.value}</Text>
            </View>
          ))}

          <View style={{ paddingVertical: 14, borderTopWidth: 1, borderTopColor: Colors.separator, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textLight, marginBottom: 3 }}>Parent Link</Text>
              <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 15, color: parentId ? Colors.success : Colors.error }}>
                {parentId ? "Connected" : "Not linked"}
              </Text>
            </View>
            {parentId && (
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.successLight, alignItems: "center", justifyContent: "center" }}>
                <CheckIcon />
              </View>
            )}
          </View>
        </View>

        {/* ── Link to Parent ── */}
        {!parentId && (
          <View style={{ backgroundColor: Colors.card, borderRadius: Radii.xl, padding: 20, borderWidth: 1.5, borderColor: Colors.border, ...Shadows.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <LinkIcon />
              <Text style={{ fontFamily: Fonts.heading, fontSize: 16, color: Colors.text }}>Link to Parent</Text>
            </View>
            <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.textSecondary, marginBottom: 14 }}>
              Enter the invite code your parent shared with you
            </Text>
            <TextInput
              placeholder="ABC123"
              placeholderTextColor={Colors.textLight}
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              style={{
                backgroundColor: Colors.background,
                color: Colors.primary,
                padding: 16,
                borderRadius: Radii.md,
                fontSize: 24,
                fontFamily: Fonts.mono,
                textAlign: "center",
                letterSpacing: 8,
                borderWidth: 1.5,
                borderColor: code.length > 0 ? Colors.primary : Colors.borderLight,
              }}
            />
            <TouchableOpacity
              onPress={async () => {
                if (!user || !code.trim()) return;
                setLinking(true);
                const ok = await acceptInvite(user.id, code);
                setLinking(false);
                if (ok) Alert.alert("Linked!", "You are now connected to your parent.");
                else Alert.alert("Error", "Invalid or expired code.");
                setCode("");
              }}
              disabled={linking || code.length < 4}
              activeOpacity={0.85}
              style={{
                backgroundColor: linking || code.length < 4 ? Colors.borderLight : Colors.accent,
                padding: 14,
                borderRadius: Radii.md,
                alignItems: "center",
                marginTop: 12,
              }}
            >
              <Text style={{ fontFamily: Fonts.heading, fontSize: 14, letterSpacing: 0.5, color: linking || code.length < 4 ? Colors.textLight : Colors.textInverse }}>
                {linking ? "LINKING..." : "CONFIRM CODE"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Sign Out ── */}
        <TouchableOpacity
          onPress={() => Alert.alert("Sign Out", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Sign Out", style: "destructive", onPress: signOut },
          ])}
          activeOpacity={0.85}
          style={{
            backgroundColor: Colors.errorLight,
            paddingVertical: 16,
            borderRadius: Radii.xl,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 10,
            marginTop: 4,
          }}
        >
          <LogOutIcon />
          <Text style={{ fontFamily: Fonts.heading, fontSize: 14, letterSpacing: 0.5, color: Colors.error }}>
            SIGN OUT
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}
