import { useState } from "react";
import { View, Text, TouchableOpacity, Alert, TextInput, ScrollView } from "react-native";
import { useAuthStore } from "../../store/authStore";
import { useFamilyStore } from "../../store/familyStore";

export default function SettingsScreen() {
  const { user, signOut } = useAuthStore();
  const { acceptInvite, parentId } = useFamilyStore();
  const [code, setCode] = useState("");
  const [linking, setLinking] = useState(false);

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0f0f23" }} contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", color: "#fff" }}>
        Settings ⚙️
      </Text>

      <View
        style={{
          backgroundColor: "#16213e",
          borderRadius: 12,
          padding: 20,
          marginTop: 24,
          borderWidth: 1,
          borderColor: "#2d3748",
        }}
      >
        <Text style={{ color: "#a0aec0", fontSize: 14 }}>Name</Text>
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>
          {user?.user_metadata?.name ?? "—"}
        </Text>

        <Text style={{ color: "#a0aec0", fontSize: 14, marginTop: 16 }}>
          Email
        </Text>
        <Text style={{ color: "#fff", fontSize: 16 }}>
          {user?.email ?? "—"}
        </Text>

        <Text style={{ color: "#a0aec0", fontSize: 14, marginTop: 16 }}>
          Role
        </Text>
        <Text style={{ color: "#6C63FF", fontSize: 16, fontWeight: "bold" }}>
          {user?.user_metadata?.role ?? "—"}
        </Text>

        <Text style={{ color: "#a0aec0", fontSize: 14, marginTop: 16 }}>
          Linked Parent
        </Text>
        <Text style={{ color: parentId ? "#00C853" : "#e94560", fontSize: 16, fontWeight: "bold" }}>
          {parentId ? "✅ Connected" : "❌ Not linked"}
        </Text>
      </View>

      {/* Link to Parent */}
      {!parentId && (
        <View
          style={{
            backgroundColor: "#16213e",
            borderRadius: 12,
            padding: 20,
            marginTop: 16,
            borderWidth: 1,
            borderColor: "#6C63FF",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
            🔗 Link to Parent
          </Text>
          <Text style={{ color: "#a0aec0", fontSize: 13, marginTop: 4 }}>
            Enter the invite code your parent shared
          </Text>
          <TextInput
            placeholder="Enter code (e.g., ABC123)"
            placeholderTextColor="#a0aec0"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            maxLength={6}
            autoCapitalize="characters"
            style={{
              backgroundColor: "#0f0f23",
              color: "#FFD700",
              padding: 14,
              borderRadius: 8,
              fontSize: 20,
              fontWeight: "bold",
              textAlign: "center",
              letterSpacing: 6,
              marginTop: 12,
            }}
          />
          <TouchableOpacity
            onPress={async () => {
              if (!user || !code.trim()) return;
              setLinking(true);
              const ok = await acceptInvite(user.id, code);
              setLinking(false);
              if (ok) Alert.alert("Linked!", "You are now connected to your parent.");
              else Alert.alert("Error", "Invalid or expired code");
              setCode("");
            }}
            disabled={linking || code.length < 4}
            style={{
              backgroundColor: linking || code.length < 4 ? "#4a4a8a" : "#6C63FF",
              padding: 12,
              borderRadius: 8,
              alignItems: "center",
              marginTop: 12,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              {linking ? "Linking..." : "Link Account"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        onPress={handleSignOut}
        style={{
          backgroundColor: "#e94560",
          padding: 16,
          borderRadius: 12,
          alignItems: "center",
          marginTop: 24,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
          Sign Out
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
