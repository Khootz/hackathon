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
import Svg, { Path, Circle, Rect } from "react-native-svg";
import { Link, useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { Colors, Fonts, Radii, Shadows } from "../../constants";

const StudentIcon = ({ color = Colors.textInverse }: { color?: string }) => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Path d="M12 14l9-5-9-5-9 5 9 5z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    <Path d="M12 14l6.16-3.422A12.083 12.083 0 0 1 19 18a12 12 0 0 1-14 0 12.083 12.083 0 0 1 .84-7.422L12 14z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
  </Svg>
);

const ParentIcon = ({ color = Colors.textInverse }: { color?: string }) => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth={1.8} />
    <Path d="M23 21v-2a4 4 0 0 0-3-3.87m-4-12a4 4 0 0 1 0 7.75" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function SignUpScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "parent">("student");
  const [loading, setLoading] = useState(false);
  const signUp = useAuthStore((s) => s.signUp);
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, role, name);
      router.replace("/(auth)/link");
    } catch (error: any) {
      Alert.alert("Sign up failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (active: boolean) => ({
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: active ? Colors.primary : Colors.border,
    ...Shadows.sm,
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: Colors.primary }}
    >
      {/* Decorative elements */}
      <View style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,255,255,0.07)" }} />
      <View style={{ position: "absolute", top: 40, left: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(255,255,255,0.05)" }} />

      {/* Header */}
      <Animated.View
        style={{
          paddingTop: 64,
          paddingHorizontal: 32,
          paddingBottom: 36,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <Text style={{ fontFamily: Fonts.heading, fontSize: 38, letterSpacing: 4, color: Colors.textInverse }}>
          AURAMAX
        </Text>
        <Text style={{ fontFamily: Fonts.body, fontSize: 14, color: "rgba(255,255,255,0.6)", marginTop: 4, letterSpacing: 0.3 }}>
          Create your account
        </Text>
      </Animated.View>

      {/* Form Card */}
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: Colors.background,
          borderTopLeftRadius: Radii.xxl,
          borderTopRightRadius: Radii.xxl,
          paddingHorizontal: 28,
          paddingTop: 30,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Role Selector */}
          <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textSecondary, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 }}>
            I am a
          </Text>
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
            {(["student", "parent"] as const).map((r) => {
              const selected = role === r;
              return (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRole(r)}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    paddingVertical: 18,
                    paddingHorizontal: 12,
                    borderRadius: Radii.md,
                    alignItems: "center",
                    backgroundColor: selected ? Colors.primary : Colors.card,
                    borderWidth: 1.5,
                    borderColor: selected ? Colors.primary : Colors.border,
                    gap: 8,
                    ...Shadows.sm,
                  }}
                >
                  {r === "student"
                    ? <StudentIcon color={selected ? Colors.textInverse : Colors.textSecondary} />
                    : <ParentIcon color={selected ? Colors.textInverse : Colors.textSecondary} />
                  }
                  <Text style={{
                    fontFamily: Fonts.headingMedium,
                    fontSize: 14,
                    letterSpacing: 0.5,
                    color: selected ? Colors.textInverse : Colors.textSecondary,
                  }}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Name */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textSecondary, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>
              Full Name
            </Text>
            <View style={inputStyle(!!name)}>
              <TextInput
                placeholder="Alex Johnson"
                placeholderTextColor={Colors.textLight}
                value={name}
                onChangeText={setName}
                style={{ fontFamily: Fonts.body, fontSize: 16, color: Colors.text, padding: 0 }}
              />
            </View>
          </View>

          {/* Email */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textSecondary, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>
              Email
            </Text>
            <View style={inputStyle(!!email)}>
              <TextInput
                placeholder="your@email.com"
                placeholderTextColor={Colors.textLight}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ fontFamily: Fonts.body, fontSize: 16, color: Colors.text, padding: 0 }}
              />
            </View>
          </View>

          {/* Password */}
          <View style={{ marginBottom: 28 }}>
            <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textSecondary, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>
              Password
            </Text>
            <View style={inputStyle(!!password)}>
              <TextInput
                placeholder="Min. 6 characters"
                placeholderTextColor={Colors.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={{ fontFamily: Fonts.body, fontSize: 16, color: Colors.text, padding: 0 }}
              />
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.85}
            style={{
              backgroundColor: loading ? Colors.accentLight : Colors.accent,
              paddingVertical: 16,
              borderRadius: Radii.md,
              alignItems: "center",
              ...Shadows.md,
            }}
          >
            <Text style={{ fontFamily: Fonts.heading, fontSize: 16, letterSpacing: 1, color: Colors.textInverse }}>
              {loading ? "Creating..." : "CREATE ACCOUNT"}
            </Text>
          </TouchableOpacity>

          {/* Sign In Link */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 24, paddingBottom: 40 }}>
            <Text style={{ fontFamily: Fonts.body, fontSize: 15, color: Colors.textSecondary }}>
              Have an account?{"  "}
            </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={{ fontFamily: Fonts.heading, fontSize: 15, color: Colors.primary, letterSpacing: 0.3 }}>
                  Sign in
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}
