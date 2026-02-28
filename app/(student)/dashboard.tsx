import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import { useAuthStore } from "../../store/authStore";
import { useAuraStore, type AuraTransaction } from "../../store/auraStore";

export default function AuraDashboard() {
  const user = useAuthStore((s) => s.user);
  const {
    balance,
    invested,
    transactions,
    fetchBalance,
    fetchTransactions,
    investAura,
    withdrawAura,
    compoundAura,
  } = useAuraStore();

  const [investAmount, setInvestAmount] = useState("");
  const [showInvest, setShowInvest] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [simulationDays, setSimulationDays] = useState(30);

  const userId = user?.id;

  useEffect(() => {
    if (userId) {
      fetchBalance(userId);
      fetchTransactions(userId);
    }
  }, [userId]);

  const onRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    await Promise.all([
      fetchBalance(userId),
      fetchTransactions(userId),
      compoundAura(userId),
    ]);
    setRefreshing(false);
  }, [userId]);

  const handleInvest = async () => {
    if (!userId) return;
    const amount = parseFloat(investAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Error", "Enter a valid amount");
      return;
    }
    const available = balance - invested;
    if (amount > available) {
      Alert.alert("Error", `You only have ${Math.round(available)} available aura to invest`);
      return;
    }
    await investAura(userId, amount);
    setInvestAmount("");
    setShowInvest(false);
    Alert.alert("Invested!", `${amount} aura is now growing at 2% daily compound interest`);
  };

  const handleWithdraw = async () => {
    if (!userId || invested <= 0) return;
    Alert.alert(
      "Withdraw Investment",
      `Withdraw all ${Math.round(invested)} invested aura back to available balance?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Withdraw",
          onPress: async () => {
            await withdrawAura(userId, invested);
            Alert.alert("Withdrawn", "Investment returned to available balance");
          },
        },
      ]
    );
  };

  // Compound simulation
  const simulateCompound = (principal: number, days: number): number[] => {
    const rate = 0.02; // 2% daily
    const values: number[] = [principal];
    let current = principal;
    for (let d = 1; d <= days; d++) {
      current = current * (1 + rate);
      values.push(Math.round(current));
    }
    return values;
  };

  const simValues = simulateCompound(invested || 100, simulationDays);
  const finalValue = simValues[simValues.length - 1];
  const growth = finalValue - (invested || 100);

  const available = Math.max(0, balance - invested);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "reward":
      case "compound":
        return "#00C853";
      case "drain":
      case "penalty":
        return "#e94560";
      case "invest":
        return "#6C63FF";
      case "withdraw":
        return "#FFD700";
      default:
        return "#a0aec0";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "reward":
        return "📚";
      case "drain":
        return "📱";
      case "invest":
        return "📈";
      case "compound":
        return "💰";
      case "penalty":
        return "⚠️";
      case "withdraw":
        return "💸";
      default:
        return "•";
    }
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
        Aura Dashboard ✨
      </Text>
      <Text style={{ fontSize: 14, color: "#a0aec0", marginTop: 4 }}>
        Invest, grow, and track your Aura
      </Text>

      {/* Balance Card */}
      <View
        style={{
          backgroundColor: "#16213e",
          borderRadius: 16,
          padding: 24,
          marginTop: 20,
          borderWidth: 1,
          borderColor: "#2d3748",
        }}
      >
        <Text style={{ color: "#a0aec0", fontSize: 14 }}>Total Aura</Text>
        <Text style={{ color: "#FFD700", fontSize: 40, fontWeight: "bold", marginTop: 4 }}>
          {Math.round(balance)} ✨
        </Text>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 16,
          }}
        >
          <View>
            <Text style={{ color: "#a0aec0", fontSize: 12 }}>Available</Text>
            <Text style={{ color: "#00C853", fontWeight: "bold", fontSize: 18 }}>
              {Math.round(available)}
            </Text>
          </View>
          <View>
            <Text style={{ color: "#a0aec0", fontSize: 12 }}>Invested</Text>
            <Text style={{ color: "#6C63FF", fontWeight: "bold", fontSize: 18 }}>
              {Math.round(invested)}
            </Text>
          </View>
          <View>
            <Text style={{ color: "#a0aec0", fontSize: 12 }}>Daily Return</Text>
            <Text style={{ color: "#00C853", fontWeight: "bold", fontSize: 18 }}>
              +{invested > 0 ? Math.round(invested * 0.02) : 0}
            </Text>
          </View>
        </View>
      </View>

      {/* Invest / Withdraw Buttons */}
      <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
        <TouchableOpacity
          onPress={() => setShowInvest(!showInvest)}
          style={{
            flex: 1,
            backgroundColor: "#6C63FF",
            padding: 14,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>📈 Invest</Text>
        </TouchableOpacity>
        {invested > 0 && (
          <TouchableOpacity
            onPress={handleWithdraw}
            style={{
              flex: 1,
              backgroundColor: "#16213e",
              padding: 14,
              borderRadius: 12,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#2d3748",
            }}
          >
            <Text style={{ color: "#FFD700", fontWeight: "bold" }}>💸 Withdraw</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Invest Input */}
      {showInvest && (
        <View
          style={{
            backgroundColor: "#16213e",
            borderRadius: 12,
            padding: 16,
            marginTop: 12,
            borderWidth: 1,
            borderColor: "#6C63FF",
          }}
        >
          <Text style={{ color: "#a0aec0", fontSize: 13, marginBottom: 8 }}>
            Available to invest: {Math.round(available)} aura
          </Text>
          <TextInput
            placeholder="Amount to invest"
            placeholderTextColor="#a0aec0"
            value={investAmount}
            onChangeText={setInvestAmount}
            keyboardType="numeric"
            style={{
              backgroundColor: "#0f0f23",
              color: "#FFD700",
              padding: 14,
              borderRadius: 8,
              fontSize: 18,
              fontWeight: "bold",
              textAlign: "center",
            }}
          />
          <TouchableOpacity
            onPress={handleInvest}
            style={{
              backgroundColor: "#6C63FF",
              padding: 12,
              borderRadius: 8,
              alignItems: "center",
              marginTop: 12,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              Confirm Investment
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Compound Simulator */}
      <View
        style={{
          backgroundColor: "#16213e",
          borderRadius: 16,
          padding: 20,
          marginTop: 24,
          borderWidth: 1,
          borderColor: "#2d3748",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
          📊 Compound Simulator
        </Text>
        <Text style={{ color: "#a0aec0", fontSize: 12, marginTop: 4 }}>
          See how your investment grows at 2% daily
        </Text>

        {/* Day selector */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
          {[7, 30, 90, 365].map((days) => (
            <TouchableOpacity
              key={days}
              onPress={() => setSimulationDays(days)}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 8,
                alignItems: "center",
                backgroundColor: simulationDays === days ? "#6C63FF" : "#0f0f23",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "bold" }}>
                {days}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Simulation Result */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 16,
            backgroundColor: "#0f0f23",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: "#a0aec0", fontSize: 11 }}>Starting</Text>
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
              {invested || 100}
            </Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: "#a0aec0", fontSize: 11 }}>After {simulationDays}d</Text>
            <Text style={{ color: "#FFD700", fontWeight: "bold", fontSize: 16 }}>
              {finalValue}
            </Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: "#a0aec0", fontSize: 11 }}>Growth</Text>
            <Text style={{ color: "#00C853", fontWeight: "bold", fontSize: 16 }}>
              +{growth}
            </Text>
          </View>
        </View>

        {/* Visual bar chart */}
        <View style={{ flexDirection: "row", alignItems: "flex-end", height: 80, marginTop: 16, gap: 2 }}>
          {simValues
            .filter((_, i) => {
              const step = Math.max(1, Math.floor(simValues.length / 20));
              return i % step === 0 || i === simValues.length - 1;
            })
            .map((val, i, arr) => {
              const maxVal = arr[arr.length - 1] || 1;
              const height = Math.max(4, (val / maxVal) * 72);
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height,
                    backgroundColor: i === arr.length - 1 ? "#FFD700" : "#6C63FF",
                    borderRadius: 2,
                  }}
                />
              );
            })}
        </View>
      </View>

      {/* Transaction History */}
      <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold", marginTop: 24 }}>
        Recent Transactions
      </Text>
      {transactions.length === 0 ? (
        <Text style={{ color: "#a0aec0", marginTop: 8 }}>No transactions yet</Text>
      ) : (
        transactions.slice(0, 20).map((tx) => (
          <View
            key={tx.id}
            style={{
              backgroundColor: "#16213e",
              borderRadius: 10,
              padding: 14,
              marginTop: 8,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <Text style={{ fontSize: 18 }}>{getTypeIcon(tx.type)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fff", fontSize: 13 }} numberOfLines={1}>
                  {tx.description}
                </Text>
                <Text style={{ color: "#4a5568", fontSize: 11, marginTop: 2 }}>
                  {new Date(tx.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
            <Text
              style={{
                color: getTypeColor(tx.type),
                fontWeight: "bold",
                fontSize: 15,
              }}
            >
              {tx.amount > 0 ? "+" : ""}
              {Math.round(tx.amount)}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}
