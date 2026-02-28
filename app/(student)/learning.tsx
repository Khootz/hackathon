import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useAuthStore } from "../../store/authStore";
import { useLearningStore, type QuizQuestion } from "../../store/learningStore";
import { useAuraStore } from "../../store/auraStore";

const SUBJECTS = [
  { label: "Math", icon: "🔢" },
  { label: "Science", icon: "🔬" },
  { label: "History", icon: "📜" },
  { label: "English", icon: "📖" },
  { label: "Geography", icon: "🌍" },
  { label: "Coding", icon: "💻" },
];

const INTERESTS = [
  "Clash Royale",
  "Minecraft",
  "Roblox",
  "YouTube",
  "Football",
  "Basketball",
  "Anime",
  "Marvel",
  "Music",
  "Space",
];

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

  // Quiz state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [earnedAura, setEarnedAura] = useState(0);

  const userId = user?.id;

  useEffect(() => {
    if (userId) fetchModules(userId);
  }, [userId]);

  const handleGenerate = async () => {
    if (!userId || !selectedSubject) return;
    const interest = customInterest || selectedInterest || "gaming";

    const module = await generateModule(userId, selectedSubject, interest);
    if (module) {
      setMode("quiz");
      setCurrentQuestion(0);
      setScore(0);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setQuizComplete(false);
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
    if (index === question.answer) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = async () => {
    if (currentQuestion + 1 >= questions.length) {
      // Quiz complete
      setQuizComplete(true);
      setMode("result");

      if (currentModule && userId) {
        const reward = await completeModule(
          currentModule.id,
          userId,
          score + (selectedAnswer === question.answer ? 1 : 0),
          questions.length
        );
        setEarnedAura(reward);
        await earnAura(userId, reward, `Completed: ${currentModule.title}`);
        await fetchBalance(userId);
      }
    } else {
      setCurrentQuestion((c) => c + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const completedModules = modules.filter((m) => m.completed);

  // ── HUB VIEW ──
  if (mode === "hub") {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: "#0f0f23" }}
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
      >
        <Text style={{ fontSize: 24, fontWeight: "bold", color: "#fff" }}>
          Learning Hub 📚
        </Text>
        <Text style={{ fontSize: 14, color: "#a0aec0", marginTop: 4 }}>
          AI-powered modules tailored to your interests
        </Text>

        <TouchableOpacity
          onPress={() => setMode("generate")}
          style={{
            backgroundColor: "#6C63FF",
            borderRadius: 12,
            padding: 20,
            marginTop: 20,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 24 }}>🚀</Text>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold", marginTop: 8 }}>
            Generate New Module
          </Text>
          <Text style={{ color: "#c4c0ff", fontSize: 13, marginTop: 4 }}>
            Earn 50-200 Aura per quiz
          </Text>
        </TouchableOpacity>

        {/* Past Modules */}
        {modules.length > 0 && (
          <>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold", marginTop: 24 }}>
              Your Modules ({completedModules.length}/{modules.length})
            </Text>
            {modules.map((mod) => (
              <TouchableOpacity
                key={mod.id}
                onPress={() => {
                  if (!mod.completed) {
                    setCurrentModule(mod);
                    setMode("quiz");
                    setCurrentQuestion(0);
                    setScore(0);
                    setSelectedAnswer(null);
                    setShowExplanation(false);
                    setQuizComplete(false);
                  }
                }}
                style={{
                  backgroundColor: "#16213e",
                  borderRadius: 12,
                  padding: 16,
                  marginTop: 12,
                  borderWidth: 1,
                  borderColor: mod.completed ? "#00C853" : "#2d3748",
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 15 }}>
                      {mod.title || `${mod.subject} × ${mod.interest}`}
                    </Text>
                    <Text style={{ color: "#a0aec0", fontSize: 12, marginTop: 4 }}>
                      {mod.subject} · {mod.interest}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    {mod.completed ? (
                      <>
                        <Text style={{ color: "#00C853", fontWeight: "bold" }}>
                          ✅ {mod.score}/{mod.total_questions}
                        </Text>
                        <Text style={{ color: "#FFD700", fontSize: 12 }}>
                          +{mod.aura_reward} ✨
                        </Text>
                      </>
                    ) : (
                      <Text style={{ color: "#6C63FF", fontWeight: "bold" }}>
                        ▶ Start
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    );
  }

  // ── GENERATE VIEW ──
  if (mode === "generate") {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: "#0f0f23" }}
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
      >
        <TouchableOpacity onPress={() => setMode("hub")}>
          <Text style={{ color: "#6C63FF", fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 24, fontWeight: "bold", color: "#fff", marginTop: 16 }}>
          Create Your Module 🎯
        </Text>

        {/* Subject Selection */}
        <Text style={{ color: "#a0aec0", fontSize: 14, marginTop: 20, marginBottom: 8 }}>
          Pick a subject:
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {SUBJECTS.map((s) => (
            <TouchableOpacity
              key={s.label}
              onPress={() => setSelectedSubject(s.label)}
              style={{
                backgroundColor: selectedSubject === s.label ? "#6C63FF" : "#16213e",
                borderRadius: 10,
                padding: 12,
                paddingHorizontal: 16,
                borderWidth: 1,
                borderColor: selectedSubject === s.label ? "#6C63FF" : "#2d3748",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 14 }}>
                {s.icon} {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Interest Selection */}
        <Text style={{ color: "#a0aec0", fontSize: 14, marginTop: 20, marginBottom: 8 }}>
          What do you like? (we'll use metaphors from it!)
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {INTERESTS.map((i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                setSelectedInterest(i);
                setCustomInterest("");
              }}
              style={{
                backgroundColor: selectedInterest === i ? "#6C63FF" : "#16213e",
                borderRadius: 10,
                padding: 10,
                paddingHorizontal: 14,
                borderWidth: 1,
                borderColor: selectedInterest === i ? "#6C63FF" : "#2d3748",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 13 }}>{i}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          placeholder="Or type your own interest..."
          placeholderTextColor="#a0aec0"
          value={customInterest}
          onChangeText={(t) => {
            setCustomInterest(t);
            setSelectedInterest("");
          }}
          style={{
            backgroundColor: "#16213e",
            color: "#fff",
            padding: 14,
            borderRadius: 10,
            fontSize: 14,
            marginTop: 12,
            borderWidth: 1,
            borderColor: "#2d3748",
          }}
        />

        <TouchableOpacity
          onPress={handleGenerate}
          disabled={generating || !selectedSubject}
          style={{
            backgroundColor: generating || !selectedSubject ? "#4a4a8a" : "#6C63FF",
            padding: 16,
            borderRadius: 12,
            alignItems: "center",
            marginTop: 24,
          }}
        >
          {generating ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
                AI is generating your quiz...
              </Text>
            </View>
          ) : (
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>
              Generate Quiz ✨
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── QUIZ VIEW ──
  if (mode === "quiz" && question) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: "#0f0f23" }}
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
      >
        {/* Progress */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <TouchableOpacity onPress={() => setMode("hub")}>
            <Text style={{ color: "#6C63FF", fontSize: 16 }}>← Exit</Text>
          </TouchableOpacity>
          <Text style={{ color: "#a0aec0", fontSize: 14 }}>
            {currentQuestion + 1} / {questions.length}
          </Text>
          <Text style={{ color: "#FFD700", fontSize: 14 }}>
            Score: {score}
          </Text>
        </View>

        {/* Progress bar */}
        <View
          style={{
            height: 4,
            backgroundColor: "#2d3748",
            borderRadius: 2,
            marginTop: 12,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: 4,
              backgroundColor: "#6C63FF",
              borderRadius: 2,
              width: `${((currentQuestion + 1) / questions.length) * 100}%`,
            }}
          />
        </View>

        <Text style={{ color: "#fff", fontSize: 20, fontWeight: "bold", marginTop: 24, lineHeight: 28 }}>
          {question.q}
        </Text>

        {/* Options */}
        {question.options.map((option, i) => {
          const isSelected = selectedAnswer === i;
          const isCorrect = i === question.answer;
          const showResult = showExplanation;

          let bgColor = "#16213e";
          let borderColor = "#2d3748";
          if (showResult && isCorrect) {
            bgColor = "#1a3a2e";
            borderColor = "#00C853";
          } else if (showResult && isSelected && !isCorrect) {
            bgColor = "#3a1a1e";
            borderColor = "#e94560";
          } else if (isSelected) {
            bgColor = "#1a2744";
            borderColor = "#6C63FF";
          }

          return (
            <TouchableOpacity
              key={i}
              onPress={() => handleAnswer(i)}
              disabled={showExplanation}
              style={{
                backgroundColor: bgColor,
                borderRadius: 12,
                padding: 16,
                marginTop: 12,
                borderWidth: 1,
                borderColor,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 15, lineHeight: 22 }}>
                {String.fromCharCode(65 + i)}. {option}
              </Text>
              {showResult && isCorrect && (
                <Text style={{ color: "#00C853", fontSize: 12, marginTop: 4 }}>✅ Correct</Text>
              )}
              {showResult && isSelected && !isCorrect && (
                <Text style={{ color: "#e94560", fontSize: 12, marginTop: 4 }}>❌ Wrong</Text>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Explanation */}
        {showExplanation && question.explanation && (
          <View
            style={{
              backgroundColor: "#1a2744",
              borderRadius: 12,
              padding: 16,
              marginTop: 16,
              borderLeftWidth: 3,
              borderLeftColor: "#6C63FF",
            }}
          >
            <Text style={{ color: "#a0aec0", fontSize: 13, lineHeight: 20 }}>
              💡 {question.explanation}
            </Text>
          </View>
        )}

        {showExplanation && (
          <TouchableOpacity
            onPress={handleNext}
            style={{
              backgroundColor: "#6C63FF",
              padding: 16,
              borderRadius: 12,
              alignItems: "center",
              marginTop: 20,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
              {currentQuestion + 1 >= questions.length ? "Finish Quiz 🎉" : "Next Question →"}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  // ── RESULT VIEW ──
  if (mode === "result") {
    const finalScore = score;
    const total = questions.length;
    const percentage = total > 0 ? Math.round((finalScore / total) * 100) : 0;

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0f0f23",
          justifyContent: "center",
          alignItems: "center",
          padding: 32,
        }}
      >
        <Text style={{ fontSize: 64 }}>
          {percentage >= 80 ? "🏆" : percentage >= 50 ? "👍" : "📚"}
        </Text>
        <Text style={{ fontSize: 32, fontWeight: "bold", color: "#fff", marginTop: 16 }}>
          Quiz Complete!
        </Text>
        <Text style={{ fontSize: 48, fontWeight: "bold", color: "#6C63FF", marginTop: 8 }}>
          {finalScore}/{total}
        </Text>
        <Text style={{ color: "#a0aec0", fontSize: 16, marginTop: 4 }}>
          {percentage}% accuracy
        </Text>

        <View
          style={{
            backgroundColor: "#16213e",
            borderRadius: 16,
            padding: 24,
            marginTop: 24,
            alignItems: "center",
            width: "100%",
            borderWidth: 1,
            borderColor: "#FFD700",
          }}
        >
          <Text style={{ color: "#a0aec0", fontSize: 14 }}>Aura Earned</Text>
          <Text style={{ color: "#FFD700", fontSize: 40, fontWeight: "bold", marginTop: 4 }}>
            +{earnedAura} ✨
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            setMode("hub");
            setCurrentModule(null);
          }}
          style={{
            backgroundColor: "#6C63FF",
            padding: 16,
            borderRadius: 12,
            alignItems: "center",
            marginTop: 24,
            width: "100%",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>
            Back to Hub 📚
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Loading fallback
  return (
    <View style={{ flex: 1, backgroundColor: "#0f0f23", justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#6C63FF" />
    </View>
  );
}
