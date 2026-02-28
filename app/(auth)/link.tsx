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
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useFamilyStore } from "../../store/familyStore";

export default function LinkAccountScreen() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, role } = useAuthStore();
  const { generateInviteCode, acceptInvite, inviteCode } = useFamilyStore();
  const router = useRouter();

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
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        style={{ backgroundColor: "#0f0f23" }}
      >
        <View style={{ paddingHorizontal: 24, gap: 16 }}>
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <Text style={{ fontSize: 36, fontWeight: "bold", color: "#6C63FF" }}>
              {role === "parent" ? "Link Your Child" : "Link to Parent"}
            </Text>
            <Text style={{ fontSize: 16, color: "#a0aec0", marginTop: 8 }}>
              {role === "parent"
                ? "Generate a code for your child to enter"
                : "Enter the code your parent shared with you"}
            </Text>
          </View>

          {role === "parent" ? (
            <>
              {inviteCode && (
                <View
                  style={{
                    backgroundColor: "#16213e",
                    borderRadius: 16,
                    padding: 24,
                    alignItems: "center",
                    borderWidth: 2,
                    borderColor: "#6C63FF",
                  }}
                >
                  <Text style={{ color: "#a0aec0", fontSize: 14 }}>
                    Your Invite Code
                  </Text>
                  <Text
                    style={{
                      color: "#FFD700",
                      fontSize: 36,
                      fontWeight: "bold",
                      letterSpacing: 8,
                      marginTop: 8,
                    }}
                  >
                    {inviteCode}
                  </Text>
                  <Text
                    style={{ color: "#a0aec0", fontSize: 12, marginTop: 12 }}
                  >
                    Share this code with your child
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handleGenerateCode}
                disabled={loading}
                style={{
                  backgroundColor: loading ? "#4a4a8a" : "#6C63FF",
                  padding: 16,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>
                  {loading
                    ? "Generating..."
                    : inviteCode
                    ? "Generate New Code"
                    : "Generate Invite Code"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                placeholder="Enter 6-digit invite code"
                placeholderTextColor="#a0aec0"
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase())}
                maxLength={6}
                autoCapitalize="characters"
                style={{
                  backgroundColor: "#16213e",
                  color: "#FFD700",
                  padding: 20,
                  borderRadius: 12,
                  fontSize: 24,
                  fontWeight: "bold",
                  textAlign: "center",
                  letterSpacing: 8,
                  borderWidth: 1,
                  borderColor: "#2d3748",
                }}
              />

              <TouchableOpacity
                onPress={handleAcceptInvite}
                disabled={loading}
                style={{
                  backgroundColor: loading ? "#4a4a8a" : "#6C63FF",
                  padding: 16,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>
                  {loading ? "Linking..." : "Link Account"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            onPress={handleSkip}
            style={{
              padding: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#a0aec0", fontSize: 15 }}>
              Skip for now →
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
