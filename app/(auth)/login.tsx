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
  Dimensions,
} from "react-native";
import Svg, { Circle, Path, Polyline, Line } from "react-native-svg";
import { Link } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { Colors, Fonts, Radii, Shadows } from "../../constants";

const { height } = Dimensions.get("window");

const EyeIcon = ({ size = 20, color = Colors.textLight }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.8} />
  </Svg>
);

const EyeOffIcon = ({ size = 20, color = Colors.textLight }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="1" y1="1" x2="23" y2="23" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const signIn = useAuthStore((s) => s.signIn);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (error: any) {
      Alert.alert("Sign in failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: Colors.primary }}
    >
      {/* Decorative circles */}
      <View style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(255,255,255,0.08)" }} />
      <View style={{ position: "absolute", top: 80, right: 60, width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.06)" }} />
      <View style={{ position: "absolute", top: 20, left: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.05)" }} />

      {/* Brand Header */}
      <Animated.View
        style={{
          paddingTop: 80,
          paddingHorizontal: 32,
          paddingBottom: 48,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <Text
          style={{
            fontFamily: Fonts.heading,
            fontSize: 42,
            letterSpacing: 4,
            color: Colors.textInverse,
          }}
        >
          AURAMAX
        </Text>
        <Text
          style={{
            fontFamily: Fonts.body,
            fontSize: 15,
            color: "rgba(255,255,255,0.65)",
            marginTop: 6,
            letterSpacing: 0.5,
          }}
        >
          Transform screen time into growth
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
          paddingTop: 36,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text
            style={{
              fontFamily: Fonts.heading,
              fontSize: 22,
              color: Colors.text,
              marginBottom: 28,
            }}
          >
            Sign in
          </Text>

          {/* Email Input */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textSecondary, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>
              Email
            </Text>
            <View
              style={{
                backgroundColor: Colors.card,
                borderRadius: Radii.md,
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderWidth: 1.5,
                borderColor: email ? Colors.primary : Colors.border,
                ...Shadows.sm,
              }}
            >
              <TextInput
                placeholder="your@email.com"
                placeholderTextColor={Colors.textLight}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{
                  fontFamily: Fonts.body,
                  fontSize: 16,
                  color: Colors.text,
                  padding: 0,
                }}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={{ marginBottom: 28 }}>
            <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textSecondary, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>
              Password
            </Text>
            <View
              style={{
                backgroundColor: Colors.card,
                borderRadius: Radii.md,
                paddingHorizontal: 16,
                paddingVertical: 14,
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1.5,
                borderColor: password ? Colors.primary : Colors.border,
                ...Shadows.sm,
              }}
            >
              <TextInput
                placeholder="••••••••"
                placeholderTextColor={Colors.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={{
                  flex: 1,
                  fontFamily: Fonts.body,
                  fontSize: 16,
                  color: Colors.text,
                  padding: 0,
                }}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            onPress={handleLogin}
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
            <Text
              style={{
                fontFamily: Fonts.heading,
                fontSize: 16,
                letterSpacing: 1,
                color: Colors.textInverse,
              }}
            >
              {loading ? "Signing in..." : "SIGN IN"}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 24 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
            <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.textLight, marginHorizontal: 12 }}>
              or
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
          </View>

          {/* Sign Up Link */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", paddingBottom: 40 }}>
            <Text style={{ fontFamily: Fonts.body, fontSize: 15, color: Colors.textSecondary }}>
              New to AuraMax?{"  "}
            </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity>
                <Text
                  style={{
                    fontFamily: Fonts.heading,
                    fontSize: 15,
                    color: Colors.primary,
                    letterSpacing: 0.3,
                  }}
                >
                  Create account
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}
