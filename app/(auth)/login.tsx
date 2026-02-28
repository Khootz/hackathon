import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Link } from "expo-router";
import { useAuthStore } from "../../store/authStore";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const signIn = useAuthStore((s) => s.signIn);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (error: any) {
      Alert.alert("Login Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        style={{ backgroundColor: "#0f0f23" }}
      >
        <View style={{ paddingHorizontal: 24, gap: 16 }}>
          {/* Logo / Title */}
          <View style={{ alignItems: "center", marginBottom: 40 }}>
            <Text
              style={{
                fontSize: 48,
                fontWeight: "bold",
                color: "#6C63FF",
              }}
            >
              AuraMax
            </Text>
            <Text style={{ fontSize: 16, color: "#a0aec0", marginTop: 8 }}>
              Transform screen time into growth time
            </Text>
          </View>

          {/* Email */}
          <TextInput
            placeholder="Email"
            placeholderTextColor="#a0aec0"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={{
              backgroundColor: "#16213e",
              color: "#fff",
              padding: 16,
              borderRadius: 12,
              fontSize: 16,
              borderWidth: 1,
              borderColor: "#2d3748",
            }}
          />

          {/* Password */}
          <TextInput
            placeholder="Password"
            placeholderTextColor="#a0aec0"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={{
              backgroundColor: "#16213e",
              color: "#fff",
              padding: 16,
              borderRadius: 12,
              fontSize: 16,
              borderWidth: 1,
              borderColor: "#2d3748",
            }}
          />

          {/* Login Button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={{
              backgroundColor: loading ? "#4a4a8a" : "#6C63FF",
              padding: 16,
              borderRadius: 12,
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <Text
              style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Text>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              marginTop: 16,
            }}
          >
            <Text style={{ color: "#a0aec0", fontSize: 15 }}>
              Don't have an account?{" "}
            </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity>
                <Text
                  style={{
                    color: "#6C63FF",
                    fontSize: 15,
                    fontWeight: "bold",
                  }}
                >
                  Sign Up
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
