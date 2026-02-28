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
import { Link, useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";

export default function SignUpScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "parent">("student");
  const [loading, setLoading] = useState(false);
  const signUp = useAuthStore((s) => s.signUp);
  const router = useRouter();

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, role, name);
      // Auto-login after signup (email confirmation should be disabled in Supabase)
      // Route to link screen so parent/child can connect
      router.replace("/(auth)/link");
    } catch (error: any) {
      Alert.alert("Sign Up Failed", error.message);
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
          {/* Title */}
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <Text
              style={{ fontSize: 36, fontWeight: "bold", color: "#6C63FF" }}
            >
              Join AuraMax
            </Text>
            <Text style={{ fontSize: 16, color: "#a0aec0", marginTop: 8 }}>
              Create your account
            </Text>
          </View>

          {/* Role Selector */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              onPress={() => setRole("student")}
              style={{
                flex: 1,
                padding: 16,
                borderRadius: 12,
                alignItems: "center",
                backgroundColor:
                  role === "student" ? "#6C63FF" : "#16213e",
                borderWidth: 1,
                borderColor:
                  role === "student" ? "#6C63FF" : "#2d3748",
              }}
            >
              <Text style={{ fontSize: 24 }}>🎓</Text>
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "bold",
                  marginTop: 4,
                }}
              >
                Student
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setRole("parent")}
              style={{
                flex: 1,
                padding: 16,
                borderRadius: 12,
                alignItems: "center",
                backgroundColor:
                  role === "parent" ? "#6C63FF" : "#16213e",
                borderWidth: 1,
                borderColor:
                  role === "parent" ? "#6C63FF" : "#2d3748",
              }}
            >
              <Text style={{ fontSize: 24 }}>👨‍👩‍👧</Text>
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "bold",
                  marginTop: 4,
                }}
              >
                Parent
              </Text>
            </TouchableOpacity>
          </View>

          {/* Name */}
          <TextInput
            placeholder="Full Name"
            placeholderTextColor="#a0aec0"
            value={name}
            onChangeText={setName}
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
            placeholder="Password (min 6 characters)"
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

          {/* Sign Up Button */}
          <TouchableOpacity
            onPress={handleSignUp}
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
              {loading ? "Creating Account..." : "Create Account"}
            </Text>
          </TouchableOpacity>

          {/* Login Link */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              marginTop: 16,
            }}
          >
            <Text style={{ color: "#a0aec0", fontSize: 15 }}>
              Already have an account?{" "}
            </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text
                  style={{
                    color: "#6C63FF",
                    fontSize: 15,
                    fontWeight: "bold",
                  }}
                >
                  Sign In
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
