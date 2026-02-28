import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Animated,
} from "react-native";
import Svg, { Path, Circle, Polyline, Line, Rect } from "react-native-svg";
import { useAuthStore } from "../../store/authStore";
import { useAuraStore, type AuraTransaction } from "../../store/auraStore";
import { Colors, Fonts, Radii, Shadows } from "../../constants";

// ── Icons ───────────────────────────────────────────────────────────────────

const TrendUpIcon = ({ size = 18, color = Colors.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="17 6 23 6 23 12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const BookIcon = ({ size = 18, color = Colors.success }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const PhoneIcon = ({ size = 18, color = Colors.error }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="5" y="2" width="14" height="20" rx="2" ry="2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="12" y1="18" x2="12.01" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const ArrowDownIcon = ({ size = 18, color = Colors.gold }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Polyline points="19 12 12 19 5 12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const RepeatIcon = ({ size = 18, color = Colors.success }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline points="17 1 21 5 17 9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3 11V9a4 4 0 0 1 4-4h14" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="7 23 3 19 7 15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M21 13v2a4 4 0 0 1-4 4H3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const AlertIcon = ({ size = 18, color = Colors.warning }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="12" y1="17" x2="12.01" y2="17" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

// ── Helpers ──────────────────────────────────────────────────────────────────

const getTypeAccent = (type: string) => {
  switch (type) {
    case "reward": return Colors.success;
    case "compound": return Colors.success;
    case "drain": return Colors.error;
    case "penalty": return Colors.warning;
    case "invest": return Colors.primary;
    case "withdraw": return Colors.gold;
    default: return Colors.textLight;
  }
};

const getTxIcon = (type: string) => {
  switch (type) {
    case "reward": return <BookIcon />;
    case "drain": return <PhoneIcon />;
    case "invest": return <TrendUpIcon />;
    case "compound": return <RepeatIcon />;
    case "penalty": return <AlertIcon />;
    case "withdraw": return <ArrowDownIcon />;
    default: return <TrendUpIcon color={Colors.textLight} />;
  }
};

// ── Component ────────────────────────────────────────────────────────────────

export default function AuraDashboard() {
  const user = useAuthStore((s) => s.user);
  const { balance, invested, transactions, fetchBalance, fetchTransactions, investAura, withdrawAura, compoundAura } = useAuraStore();

  const [investAmount, setInvestAmount] = useState("");
  const [showInvest, setShowInvest] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [simulationDays, setSimulationDays] = useState(30);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const userId = user?.id;

  useEffect(() => {
    if (userId) {
      fetchBalance(userId);
      fetchTransactions(userId);
    }
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 14, useNativeDriver: true }),
    ]).start();
  }, [userId]);

  const onRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    await Promise.all([fetchBalance(userId), fetchTransactions(userId), compoundAura(userId)]);
    setRefreshing(false);
  }, [userId]);

  const handleInvest = async () => {
    if (!userId) return;
    const amount = parseFloat(investAmount);
    if (isNaN(amount) || amount <= 0) { Alert.alert("Invalid amount", "Enter a valid number."); return; }
    const available = balance - invested;
    if (amount > available) { Alert.alert("Insufficient aura", `Only ${Math.round(available)} available.`); return; }
    await investAura(userId, amount);
    setInvestAmount("");
    setShowInvest(false);
    Alert.alert("Invested", `${Math.round(amount)} aura now growing at 2% daily.`);
  };

  const handleWithdraw = async () => {
    if (!userId || invested <= 0) return;
    Alert.alert("Withdraw Investment", `Return ${Math.round(invested)} aura to available balance?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Withdraw", onPress: async () => { await withdrawAura(userId, invested); Alert.alert("Done", "Investment returned."); } },
    ]);
  };

  const simulateCompound = (principal: number, days: number): number[] => {
    const rate = 0.02;
    const values: number[] = [principal];
    let current = principal;
    for (let d = 1; d <= days; d++) { current = current * (1 + rate); values.push(Math.round(current)); }
    return values;
  };

  const simValues = simulateCompound(invested || 100, simulationDays);
  const finalValue = simValues[simValues.length - 1];
  const growth = finalValue - (invested || 100);
  const available = Math.max(0, balance - invested);

  const chartBars = simValues.filter((_, i) => {
    const step = Math.max(1, Math.floor(simValues.length / 20));
    return i % step === 0 || i === simValues.length - 1;
  });
  const maxBar = chartBars[chartBars.length - 1] || 1;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero Balance Card ── */}
      <Animated.View
        style={{
          backgroundColor: Colors.primary,
          paddingTop: 56,
          paddingBottom: 40,
          paddingHorizontal: 24,
          overflow: "hidden",
          opacity: fadeAnim,
        }}
      >
        {/* Decorative circles */}
        <View style={{ position: "absolute", top: -60, right: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: "rgba(255,255,255,0.07)" }} />
        <View style={{ position: "absolute", bottom: -30, left: -20, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.05)" }} />

        <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: "rgba(255,255,255,0.6)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
          Total Aura
        </Text>
        <Text style={{ fontFamily: Fonts.heading, fontSize: 52, color: Colors.textInverse, letterSpacing: -1 }}>
          {Math.round(balance).toLocaleString()}
        </Text>

        {/* Stats Row */}
        <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
          {[
            { label: "Available", value: Math.round(available), color: Colors.accentLight },
            { label: "Invested", value: Math.round(invested), color: "rgba(255,255,255,0.15)" },
            { label: "Daily +", value: invested > 0 ? Math.round(invested * 0.02) : 0, color: "rgba(255,255,255,0.15)" },
          ].map((stat) => (
            <View
              key={stat.label}
              style={{
                flex: 1,
                backgroundColor: stat.color,
                borderRadius: Radii.md,
                padding: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ fontFamily: Fonts.heading, fontSize: 18, color: Colors.textInverse }}>
                {stat.value}
              </Text>
              <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2, letterSpacing: 0.3 }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View style={{ padding: 20, gap: 16, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* ── Invest / Withdraw Buttons ── */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            onPress={() => setShowInvest(!showInvest)}
            activeOpacity={0.85}
            style={{
              flex: 1,
              backgroundColor: Colors.accent,
              paddingVertical: 14,
              borderRadius: Radii.md,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              ...Shadows.md,
            }}
          >
            <TrendUpIcon color={Colors.textInverse} />
            <Text style={{ fontFamily: Fonts.heading, fontSize: 14, letterSpacing: 0.5, color: Colors.textInverse }}>
              INVEST
            </Text>
          </TouchableOpacity>

          {invested > 0 && (
            <TouchableOpacity
              onPress={handleWithdraw}
              activeOpacity={0.85}
              style={{
                flex: 1,
                backgroundColor: Colors.card,
                paddingVertical: 14,
                borderRadius: Radii.md,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
                borderWidth: 1.5,
                borderColor: Colors.border,
                ...Shadows.sm,
              }}
            >
              <ArrowDownIcon color={Colors.gold} />
              <Text style={{ fontFamily: Fonts.heading, fontSize: 14, letterSpacing: 0.5, color: Colors.gold }}>
                WITHDRAW
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Invest Input Panel ── */}
        {showInvest && (
          <View style={{ backgroundColor: Colors.card, borderRadius: Radii.lg, padding: 20, borderWidth: 1.5, borderColor: Colors.primaryLight, ...Shadows.md }}>
            <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.textSecondary, marginBottom: 12 }}>
              {Math.round(available)} aura available to invest
            </Text>
            <TextInput
              placeholder="Amount"
              placeholderTextColor={Colors.textLight}
              value={investAmount}
              onChangeText={setInvestAmount}
              keyboardType="numeric"
              style={{
                backgroundColor: Colors.background,
                color: Colors.primary,
                padding: 14,
                borderRadius: Radii.md,
                fontFamily: Fonts.heading,
                fontSize: 24,
                textAlign: "center",
                letterSpacing: 1,
              }}
            />
            <TouchableOpacity
              onPress={handleInvest}
              activeOpacity={0.85}
              style={{ backgroundColor: Colors.primary, padding: 14, borderRadius: Radii.md, alignItems: "center", marginTop: 12 }}
            >
              <Text style={{ fontFamily: Fonts.heading, fontSize: 14, letterSpacing: 0.5, color: Colors.textInverse }}>
                CONFIRM
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Compound Simulator ── */}
        <View style={{ backgroundColor: Colors.card, borderRadius: Radii.lg, padding: 20, ...Shadows.sm }}>
          <Text style={{ fontFamily: Fonts.heading, fontSize: 16, color: Colors.text, marginBottom: 4 }}>
            Growth Simulator
          </Text>
          <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.textSecondary, marginBottom: 16 }}>
            2% daily compound interest
          </Text>

          {/* Day tabs */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            {[7, 30, 90, 365].map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => setSimulationDays(d)}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: Radii.sm,
                  alignItems: "center",
                  backgroundColor: simulationDays === d ? Colors.primary : Colors.background,
                }}
              >
                <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 13, color: simulationDays === d ? Colors.textInverse : Colors.textSecondary }}>
                  {d}d
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Metrics */}
          <View style={{ flexDirection: "row", backgroundColor: Colors.background, borderRadius: Radii.md, padding: 16, marginBottom: 16 }}>
            {[
              { label: "Start", value: invested || 100, color: Colors.text },
              { label: `Day ${simulationDays}`, value: finalValue, color: Colors.primary },
              { label: "Growth", value: `+${growth}`, color: Colors.success },
            ].map((m) => (
              <View key={m.label} style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontFamily: Fonts.heading, fontSize: 17, color: m.color }}>{m.value}</Text>
                <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: Colors.textLight, marginTop: 2 }}>{m.label}</Text>
              </View>
            ))}
          </View>

          {/* Bar chart */}
          <View style={{ flexDirection: "row", alignItems: "flex-end", height: 72, gap: 2 }}>
            {chartBars.map((val, i, arr) => {
              const h = Math.max(4, (val / maxBar) * 64);
              const isLast = i === arr.length - 1;
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: h,
                    borderRadius: 3,
                    backgroundColor: isLast ? Colors.accent : Colors.primaryLight,
                    opacity: isLast ? 1 : 0.6 + (i / arr.length) * 0.4,
                  }}
                />
              );
            })}
          </View>
        </View>

        {/* ── Transactions ── */}
        <Text style={{ fontFamily: Fonts.heading, fontSize: 18, color: Colors.text, marginTop: 4 }}>
          Transactions
        </Text>

        {transactions.length === 0 ? (
          <View style={{ backgroundColor: Colors.card, borderRadius: Radii.lg, padding: 32, alignItems: "center", ...Shadows.sm }}>
            <Text style={{ fontFamily: Fonts.body, fontSize: 15, color: Colors.textLight }}>No transactions yet</Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {transactions.slice(0, 20).map((tx) => {
              const accent = getTypeAccent(tx.type);
              return (
                <View
                  key={tx.id}
                  style={{
                    backgroundColor: Colors.card,
                    borderRadius: Radii.md,
                    padding: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    borderLeftWidth: 3,
                    borderLeftColor: accent,
                    ...Shadows.sm,
                  }}
                >
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: Colors.background,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}>
                    {getTxIcon(tx.type)}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 14, color: Colors.text }} numberOfLines={1}>
                      {tx.description}
                    </Text>
                    <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textLight, marginTop: 2 }}>
                      {new Date(tx.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: Fonts.heading, fontSize: 15, color: accent }}>
                    {tx.amount > 0 ? "+" : ""}{Math.round(tx.amount)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </Animated.View>
    </ScrollView>
  );
}
