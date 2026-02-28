import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useFamilyStore } from "../../store/familyStore";
import { Colors, Fonts, Radii, Shadows } from "../../constants";

function LinkIcon({ size = 48, color = Colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ArrowRightIcon({ size = 16, color = Colors.textInverse }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14M12 5l7 7-7 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function RefreshIcon({ size = 16, color = Colors.textInverse }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M23 4v6h-6M1 20v-6h6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CopyIcon({ size = 18, color = Colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={9} y={9} width={13} height={13} rx={2} ry={2} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function LinkAccountScreen() {
  const [code, setCode] = useState("");
  const [codeFocused, setCodeFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, role } = useAuthStore();
  const { generateInviteCode, acceptInvite, inviteCode } = useFamilyStore();
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 460, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 14, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleGenerateCode = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const code = await generateInviteCode(user.id);
      Alert.alert("Invite Code", `Share this code with your child:\n\n${code}`);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!user || !code.trim()) {
      Alert.alert("Error", "Please enter an invite code");
      return;
    }
    setLoading(true);
    try {
      const success = await acceptInvite(user.id, code.trim());
      if (success) {
        Alert.alert("Success", "You are now linked to your parent!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", "Invalid or expired invite code");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (role === "parent") {
      router.replace("/(parent)");
    } else {
      router.replace("/(student)");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: Colors.background }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Teal header hero */}
        <View
          style={{
            backgroundColor: Colors.primary,
            paddingTop: 64,
            paddingBottom: 40,
            paddingHorizontal: 28,
            overflow: "hidden",
            alignItems: "center",
          }}
        >
          <View style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.07)" }} />
          <View style={{ position: "absolute", bottom: -60, left: -20, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.05)" }} />
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <LinkIcon size={36} color={Colors.textInverse} />
          </View>
          <Text style={{ fontFamily: Fonts.heading, fontSize: 26, color: Colors.textInverse, textAlign: "center" }}>
            {role === "parent" ? "Link Your Child" : "Link to Parent"}
          </Text>
          <Text style={{ fontFamily: Fonts.body, fontSize: 14, color: "rgba(255,255,255,0.75)", textAlign: "center", marginTop: 8, lineHeight: 20 }}>
            {role === "parent"
              ? "Generate a code for your child to enter after they sign up"
              : "Enter the code your parent shared with you"}
          </Text>
        </View>

        <Animated.View
          style={{
            flex: 1,
            padding: 24,
            gap: 16,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {role === "parent" ? (
            <>
              {inviteCode && (
                <View
                  style={{
                    backgroundColor: Colors.card,
                    borderRadius: Radii.xl,
                    padding: 28,
                    alignItems: "center",
                    borderWidth: 2,
                    borderColor: Colors.primaryLight,
                    ...Shadows.sm,
                  }}
                >
                  <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 13, color: Colors.textSecondary, letterSpacing: 1, textTransform: "uppercase" }}>
                    Your Invite Code
                  </Text>
                  <Text
                    style={{
                      fontFamily: Fonts.mono,
                      color: Colors.primary,
                      fontSize: 36,
                      letterSpacing: 10,
                      marginTop: 10,
                      marginBottom: 4,
                    }}
                  >
                    {inviteCode}
                  </Text>
                  <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.textLight, marginTop: 8 }}>
                    Share this code with your child
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handleGenerateCode}
                disabled={loading}
                activeOpacity={0.85}
                style={{
                  backgroundColor: loading ? Colors.textLight : Colors.accent,
                  borderRadius: Radii.xl,
                  padding: 17,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  ...Shadows.md,
                }}
              >
                <RefreshIcon size={16} color={Colors.textInverse} />
                <Text style={{ fontFamily: Fonts.heading, fontSize: 16, color: Colors.textInverse }}>
                  {loading ? "Generating…" : inviteCode ? "Generate New Code" : "Generate Invite Code"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={{ backgroundColor: Colors.card, borderRadius: Radii.xl, padding: 20, ...Shadows.sm }}>
                <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 13, color: Colors.textSecondary, marginBottom: 12, letterSpacing: 0.5 }}>
                  Enter 6-digit code
                </Text>
                <TextInput
                  placeholder="• • • • • •"
                  placeholderTextColor={Colors.textLight}
                  value={code}
                  onChangeText={(t) => setCode(t.toUpperCase())}
                  onFocus={() => setCodeFocused(true)}
                  onBlur={() => setCodeFocused(false)}
                  maxLength={6}
                  autoCapitalize="characters"
                  style={{
                    fontFamily: Fonts.mono,
                    color: Colors.primary,
                    backgroundColor: Colors.background,
                    borderRadius: Radii.md,
                    paddingHorizontal: 20,
                    paddingVertical: 18,
                    fontSize: 28,
                    textAlign: "center",
                    letterSpacing: 12,
                    borderWidth: 2,
                    borderColor: codeFocused ? Colors.primary : Colors.border,
                  }}
                />
              </View>

              <TouchableOpacity
                onPress={handleAcceptInvite}
                disabled={loading || code.length < 6}
                activeOpacity={0.85}
                style={{
                  backgroundColor: loading || code.length < 6 ? Colors.textLight : Colors.accent,
                  borderRadius: Radii.xl,
                  padding: 17,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  ...Shadows.md,
                }}
              >
                <ArrowRightIcon size={16} color={Colors.textInverse} />
                <Text style={{ fontFamily: Fonts.heading, fontSize: 16, color: Colors.textInverse }}>
                  {loading ? "Linking…" : "Link Account"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={handleSkip} style={{ paddingVertical: 14, alignItems: "center" }}>
            <Text style={{ fontFamily: Fonts.body, fontSize: 15, color: Colors.textSecondary }}>
              Skip for now →
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
