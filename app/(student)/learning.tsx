import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
} from "react-native";
import Svg, { Path, Circle, Polyline, Line, Rect } from "react-native-svg";
import { useAuthStore } from "../../store/authStore";
import { useLearningStore, type QuizQuestion } from "../../store/learningStore";
import { useAuraStore } from "../../store/auraStore";
import { Colors, Fonts, Radii, Shadows } from "../../constants";

// ── Subjects & Interests ─────────────────────────────────────────────────────
const SUBJECTS = [
  { label: "Math" },
  { label: "Science" },
  { label: "History" },
  { label: "English" },
  { label: "Geography" },
  { label: "Coding" },
];

const INTERESTS = [
  "Clash Royale", "Minecraft", "Roblox", "YouTube",
  "Football", "Basketball", "Anime", "Marvel", "Music", "Space",
];

// ── Icons ────────────────────────────────────────────────────────────────────
const ZapIcon = ({ size = 20, color = Colors.textInverse }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const ArrowLeftIcon = ({ size = 18, color = Colors.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="19" y1="12" x2="5" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Polyline points="12 19 5 12 12 5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const CheckIcon = ({ size = 14, color = Colors.success }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline points="20 6 9 17 4 12" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const XIcon = ({ size = 14, color = Colors.error }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
  </Svg>
);
const StarIcon = ({ size = 18, color = Colors.gold }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Polyline points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke={color} strokeWidth={1} />
  </Svg>
);
const BookIcon = ({ size = 18, color = Colors.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const LightbulbIcon = ({ size = 16, color = Colors.gold }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 21h6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M12 3a6 6 0 0 1 6 6c0 2.22-1.21 4.16-3 5.2V17H9v-2.8C7.21 13.16 6 11.22 6 9a6 6 0 0 1 6-6z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ── Main Component ────────────────────────────────────────────────────────────
type ScreenMode = "hub" | "generate" | "quiz" | "result";

export default function LearningHub() {
  const user = useAuthStore((s) => s.user);
  const { modules, currentModule, generating, loading, fetchModules, generateModule, completeModule, setCurrentModule } =
    useLearningStore();
  const { earnAura, fetchBalance } = useAuraStore();

  const [mode, setMode] = useState<ScreenMode>("hub");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedInterest, setSelectedInterest] = useState("");
  const [customInterest, setCustomInterest] = useState("");

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [earnedAura, setEarnedAura] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const userId = user?.id;

  useEffect(() => {
    if (userId) fetchModules(userId);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 460, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 14, useNativeDriver: true }),
    ]).start();
  }, [userId]);

  const resetAnim = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(24);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 15, useNativeDriver: true }),
    ]).start();
  };

  const switchMode = (next: ScreenMode) => { setMode(next); resetAnim(); };

  const handleGenerate = async () => {
    if (!userId || !selectedSubject) return;
    const interest = customInterest || selectedInterest || "gaming";
    const module = await generateModule(userId, selectedSubject, interest);
    if (module) {
      setCurrentQuestion(0);
      setScore(0);
      setSelectedAnswer(null);
      setShowExplanation(false);
      switchMode("quiz");
    } else {
      Alert.alert("Error", "Failed to generate quiz. Check your OpenRouter API key.");
    }
  };

  const questions: QuizQuestion[] = currentModule?.quiz_data?.questions ?? [];
  const question = questions[currentQuestion];

  const handleAnswer = (index: number) => {
    if (showExplanation) return;
    setSelectedAnswer(index);
    setShowExplanation(true);
    if (index === question.answer) setScore((s) => s + 1);
  };

  const handleNext = async () => {
    if (currentQuestion + 1 >= questions.length) {
      const finalScore = score + (selectedAnswer === question.answer ? 0 : 0);
      if (currentModule && userId) {
        const reward = await completeModule(currentModule.id, userId, score, questions.length);
        setEarnedAura(reward);
        await earnAura(userId, reward, `Completed: ${currentModule.title}`);
        await fetchBalance(userId);
      }
      switchMode("result");
    } else {
      setCurrentQuestion((c) => c + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const completedModules = modules.filter((m) => m.completed);

  // ─────────────────────────────────────────────────────────────────────────
  // HUB VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (mode === "hub") {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.background }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ backgroundColor: Colors.primary, paddingTop: 56, paddingBottom: 32, paddingHorizontal: 24, overflow: "hidden" }}>
          <View style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.07)" }} />
          <Text style={{ fontFamily: Fonts.body, fontSize: 14, color: "rgba(255,255,255,0.6)", letterSpacing: 0.5 }}>Learning Hub</Text>
          <Text style={{ fontFamily: Fonts.heading, fontSize: 28, color: Colors.textInverse, marginTop: 2 }}>Your Modules</Text>
          <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
            {completedModules.length} of {modules.length} completed
          </Text>
        </View>

        <Animated.View style={{ padding: 20, gap: 14, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Generate CTA */}
          <TouchableOpacity
            onPress={() => switchMode("generate")}
            activeOpacity={0.88}
            style={{ backgroundColor: Colors.accent, borderRadius: Radii.xl, padding: 24, flexDirection: "row", alignItems: "center", gap: 16, ...Shadows.md }}
          >
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
              <ZapIcon />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: Fonts.heading, fontSize: 17, color: Colors.textInverse }}>Generate New Module</Text>
              <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
                Earn 50-200 Aura per quiz
              </Text>
            </View>
          </TouchableOpacity>

          {/* Modules list */}
          {modules.length > 0 && (
            <View style={{ gap: 10 }}>
              <Text style={{ fontFamily: Fonts.heading, fontSize: 17, color: Colors.text }}>History</Text>
              {modules.map((mod) => (
                <TouchableOpacity
                  key={mod.id}
                  onPress={() => {
                    if (!mod.completed) {
                      setCurrentModule(mod);
                      setCurrentQuestion(0);
                      setScore(0);
                      setSelectedAnswer(null);
                      setShowExplanation(false);
                      switchMode("quiz");
                    }
                  }}
                  activeOpacity={mod.completed ? 1 : 0.85}
                  style={{
                    backgroundColor: Colors.card,
                    borderRadius: Radii.lg,
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    borderLeftWidth: 3,
                    borderLeftColor: mod.completed ? Colors.success : Colors.primary,
                    ...Shadows.sm,
                  }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: mod.completed ? Colors.successLight : Colors.cardTeal, alignItems: "center", justifyContent: "center" }}>
                    {mod.completed ? <CheckIcon size={16} /> : <BookIcon size={16} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 14, color: Colors.text }} numberOfLines={1}>
                      {mod.title || `${mod.subject} × ${mod.interest}`}
                    </Text>
                    <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textLight, marginTop: 2 }}>
                      {mod.subject} · {mod.interest}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    {mod.completed ? (
                      <>
                        <Text style={{ fontFamily: Fonts.heading, fontSize: 14, color: Colors.success }}>{mod.score}/{mod.total_questions}</Text>
                        <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: Colors.gold }}>+{mod.aura_reward} aura</Text>
                      </>
                    ) : (
                      <Text style={{ fontFamily: Fonts.heading, fontSize: 12, color: Colors.primary, letterSpacing: 0.5 }}>RESUME</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {modules.length === 0 && !loading && (
            <View style={{ backgroundColor: Colors.card, borderRadius: Radii.xl, padding: 32, alignItems: "center", ...Shadows.sm }}>
              <BookIcon size={32} color={Colors.textLight} />
              <Text style={{ fontFamily: Fonts.heading, fontSize: 16, color: Colors.text, marginTop: 12 }}>No modules yet</Text>
              <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.textLight, marginTop: 4, textAlign: "center" }}>
                Generate your first AI-powered quiz above
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GENERATE VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (mode === "generate") {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.background }}
        contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => switchMode("hub")} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 24, alignSelf: "flex-start" }}>
          <ArrowLeftIcon />
          <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 14, color: Colors.primary }}>Back</Text>
        </TouchableOpacity>

        <Text style={{ fontFamily: Fonts.heading, fontSize: 24, color: Colors.text, marginBottom: 4 }}>Create a Module</Text>
        <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.textSecondary, marginBottom: 24 }}>
          Pick a subject and something you enjoy — we'll connect the two.
        </Text>

        {/* Subject Grid */}
        <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 12, color: Colors.textLight, letterSpacing: 0.8, marginBottom: 10 }}>SUBJECT</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
          {SUBJECTS.map((s) => {
            const active = selectedSubject === s.label;
            return (
              <TouchableOpacity
                key={s.label}
                onPress={() => setSelectedSubject(s.label)}
                activeOpacity={0.8}
                style={{
                  backgroundColor: active ? Colors.primary : Colors.card,
                  borderRadius: Radii.md,
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                  borderWidth: 1.5,
                  borderColor: active ? Colors.primary : Colors.border,
                  ...Shadows.sm,
                }}
              >
                <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 14, color: active ? Colors.textInverse : Colors.text }}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Interests */}
        <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 12, color: Colors.textLight, letterSpacing: 0.8, marginBottom: 10 }}>YOUR INTEREST</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {INTERESTS.map((i) => {
            const active = selectedInterest === i;
            return (
              <TouchableOpacity
                key={i}
                onPress={() => { setSelectedInterest(i); setCustomInterest(""); }}
                activeOpacity={0.8}
                style={{
                  backgroundColor: active ? Colors.accent + "22" : Colors.card,
                  borderRadius: Radii.full,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderWidth: 1.5,
                  borderColor: active ? Colors.accent : Colors.border,
                }}
              >
                <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: active ? Colors.accent : Colors.textSecondary }}>
                  {i}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          placeholder="or type your own interest..."
          placeholderTextColor={Colors.textLight}
          value={customInterest}
          onChangeText={(t) => { setCustomInterest(t); setSelectedInterest(""); }}
          style={{
            backgroundColor: Colors.card,
            color: Colors.text,
            padding: 14,
            borderRadius: Radii.md,
            fontSize: 14,
            fontFamily: Fonts.body,
            borderWidth: 1.5,
            borderColor: customInterest ? Colors.primary : Colors.border,
            marginBottom: 28,
          }}
        />

        <TouchableOpacity
          onPress={handleGenerate}
          disabled={generating || !selectedSubject}
          activeOpacity={0.87}
          style={{
            backgroundColor: generating || !selectedSubject ? Colors.borderLight : Colors.accent,
            padding: 16,
            borderRadius: Radii.xl,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 10,
          }}
        >
          {generating ? (
            <>
              <ActivityIndicator color={Colors.textInverse} size="small" />
              <Text style={{ fontFamily: Fonts.heading, fontSize: 15, color: Colors.textInverse, letterSpacing: 0.5 }}>
                GENERATING QUIZ...
              </Text>
            </>
          ) : (
            <>
              <ZapIcon color={generating || !selectedSubject ? Colors.textLight : Colors.textInverse} />
              <Text style={{ fontFamily: Fonts.heading, fontSize: 15, color: generating || !selectedSubject ? Colors.textLight : Colors.textInverse, letterSpacing: 0.5 }}>
                GENERATE QUIZ
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // QUIZ VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (mode === "quiz" && question) {
    const progress = (currentQuestion + 1) / questions.length;
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.background }}
        contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <TouchableOpacity onPress={() => switchMode("hub")} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <ArrowLeftIcon />
            <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 14, color: Colors.primary }}>Exit</Text>
          </TouchableOpacity>
          <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.textSecondary }}>
            {currentQuestion + 1} / {questions.length}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <StarIcon size={14} />
            <Text style={{ fontFamily: Fonts.heading, fontSize: 15, color: Colors.gold }}>{score}</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={{ height: 5, backgroundColor: Colors.borderLight, borderRadius: 3, marginBottom: 24, overflow: "hidden" }}>
          <Animated.View style={{ height: 5, backgroundColor: Colors.primary, borderRadius: 3, width: `${progress * 100}%` }} />
        </View>

        {/* Question card */}
        <View style={{ backgroundColor: Colors.card, borderRadius: Radii.xl, padding: 22, marginBottom: 16, ...Shadows.md }}>
          <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 12, color: Colors.textLight, letterSpacing: 0.8, marginBottom: 10 }}>QUESTION {currentQuestion + 1}</Text>
          <Text style={{ fontFamily: Fonts.heading, fontSize: 18, color: Colors.text, lineHeight: 26 }}>
            {question.q}
          </Text>
        </View>

        {/* Options */}
        <View style={{ gap: 10, marginBottom: 16 }}>
          {question.options.map((option, i) => {
            const isSelected = selectedAnswer === i;
            const isCorrect = i === question.answer;
            const revealed = showExplanation;

            let bgColor = Colors.card;
            let borderColor = Colors.border;
            let textColor = Colors.text;

            if (revealed && isCorrect) { bgColor = Colors.successLight; borderColor = Colors.success; textColor = Colors.success; }
            else if (revealed && isSelected && !isCorrect) { bgColor = Colors.errorLight; borderColor = Colors.error; textColor = Colors.error; }
            else if (isSelected) { bgColor = Colors.cardTeal; borderColor = Colors.primary; textColor = Colors.primary; }

            return (
              <TouchableOpacity
                key={i}
                onPress={() => handleAnswer(i)}
                disabled={showExplanation}
                activeOpacity={0.8}
                style={{ backgroundColor: bgColor, borderRadius: Radii.lg, padding: 16, borderWidth: 1.5, borderColor, flexDirection: "row", alignItems: "center", gap: 12, ...Shadows.sm }}
              >
                <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor, alignItems: "center", justifyContent: "center" }}>
                  {revealed && isCorrect ? <CheckIcon /> : revealed && isSelected ? <XIcon /> : (
                    <Text style={{ fontFamily: Fonts.heading, fontSize: 12, color: borderColor }}>
                      {String.fromCharCode(65 + i)}
                    </Text>
                  )}
                </View>
                <Text style={{ fontFamily: Fonts.body, fontSize: 14, color: textColor, flex: 1, lineHeight: 20 }}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Explanation */}
        {showExplanation && question.explanation && (
          <View style={{ backgroundColor: Colors.goldLight, borderRadius: Radii.lg, padding: 16, marginBottom: 16, flexDirection: "row", gap: 10, borderLeftWidth: 3, borderLeftColor: Colors.gold }}>
            <View style={{ paddingTop: 1 }}>
              <LightbulbIcon />
            </View>
            <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.text, flex: 1, lineHeight: 20 }}>
              {question.explanation}
            </Text>
          </View>
        )}

        {showExplanation && (
          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={0.87}
            style={{ backgroundColor: Colors.primary, padding: 16, borderRadius: Radii.xl, alignItems: "center" }}
          >
            <Text style={{ fontFamily: Fonts.heading, fontSize: 15, color: Colors.textInverse, letterSpacing: 0.5 }}>
              {currentQuestion + 1 >= questions.length ? "FINISH QUIZ" : "NEXT QUESTION"}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RESULT VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (mode === "result") {
    const total = questions.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const great = percentage >= 80;
    const ok = percentage >= 50;

    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, padding: 24, justifyContent: "center", alignItems: "center" }}>
        {/* Score ring */}
        <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: Colors.card, alignItems: "center", justifyContent: "center", marginBottom: 24, ...Shadows.lg, borderWidth: 4, borderColor: great ? Colors.success : ok ? Colors.gold : Colors.error }}>
          <Text style={{ fontFamily: Fonts.heading, fontSize: 32, color: great ? Colors.success : ok ? Colors.gold : Colors.error }}>{score}</Text>
          <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.textLight }}>/{total}</Text>
        </View>

        <Text style={{ fontFamily: Fonts.heading, fontSize: 28, color: Colors.text, textAlign: "center" }}>
          {great ? "Outstanding!" : ok ? "Well done!" : "Keep going!"}
        </Text>
        <Text style={{ fontFamily: Fonts.body, fontSize: 15, color: Colors.textSecondary, marginTop: 4 }}>
          {percentage}% accuracy
        </Text>

        {/* Aura earned */}
        <View style={{ backgroundColor: Colors.goldLight, borderRadius: Radii.xl, paddingVertical: 20, paddingHorizontal: 40, marginTop: 28, alignItems: "center", borderWidth: 1.5, borderColor: Colors.gold + "66", ...Shadows.sm }}>
          <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.gold, marginBottom: 4, letterSpacing: 0.5 }}>AURA EARNED</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <StarIcon size={24} />
            <Text style={{ fontFamily: Fonts.heading, fontSize: 42, color: Colors.gold }}>+{earnedAura}</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => { setMode("hub"); setCurrentModule(null); resetAnim(); }}
          activeOpacity={0.87}
          style={{ backgroundColor: Colors.primary, paddingVertical: 16, paddingHorizontal: 40, borderRadius: Radii.xl, marginTop: 28, width: "100%", alignItems: "center" }}
        >
          <Text style={{ fontFamily: Fonts.heading, fontSize: 15, color: Colors.textInverse, letterSpacing: 0.5 }}>BACK TO HUB</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Fallback
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}
