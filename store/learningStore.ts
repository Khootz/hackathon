import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { generateQuiz } from "../lib/openrouter";

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface LearningModule {
  id: string;
  user_id: string;
  subject: string;
  interest: string;
  title: string;
  quiz_data: { title: string; questions: QuizQuestion[] };
  score: number | null;
  total_questions: number | null;
  aura_reward: number;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

interface LearningState {
  modules: LearningModule[];
  currentModule: LearningModule | null;
  generating: boolean;
  loading: boolean;

  fetchModules: (userId: string) => Promise<void>;
  generateModule: (
    userId: string,
    subject: string,
    interest: string
  ) => Promise<LearningModule | null>;
  completeModule: (
    moduleId: string,
    userId: string,
    score: number,
    total: number
  ) => Promise<number>;
  setCurrentModule: (module: LearningModule | null) => void;
}

export const useLearningStore = create<LearningState>((set, get) => ({
  modules: [],
  currentModule: null,
  generating: false,
  loading: true,

  fetchModules: async (userId: string) => {
    const { data, error } = await supabase
      .from("learning_modules")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching modules:", error);
      set({ loading: false });
      return;
    }

    set({ modules: data ?? [], loading: false });
  },

  generateModule: async (userId: string, subject: string, interest: string) => {
    set({ generating: true });
    try {
      const quiz = await generateQuiz(subject, interest);

      // Calculate reward: 50-200 based on question count
      const questionCount = quiz.questions?.length ?? 5;
      const auraReward = Math.min(200, Math.max(50, questionCount * 30));

      const { data, error } = await supabase
        .from("learning_modules")
        .insert({
          user_id: userId,
          subject,
          interest,
          title: quiz.title ?? `${subject} × ${interest}`,
          quiz_data: quiz,
          total_questions: questionCount,
          aura_reward: auraReward,
        })
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        modules: [data, ...state.modules],
        currentModule: data,
        generating: false,
      }));

      return data;
    } catch (error) {
      console.error("Error generating module:", error);
      set({ generating: false });
      return null;
    }
  },

  completeModule: async (
    moduleId: string,
    userId: string,
    score: number,
    total: number
  ) => {
    // Calculate reward based on accuracy
    const accuracy = total > 0 ? score / total : 0;
    const baseReward =
      get().currentModule?.aura_reward ??
      get().modules.find((m) => m.id === moduleId)?.aura_reward ??
      100;
    const actualReward = Math.round(baseReward * accuracy);

    await supabase
      .from("learning_modules")
      .update({
        completed: true,
        score,
        total_questions: total,
        completed_at: new Date().toISOString(),
        aura_reward: actualReward,
      })
      .eq("id", moduleId);

    // Update local state
    set((state) => ({
      modules: state.modules.map((m) =>
        m.id === moduleId
          ? { ...m, completed: true, score, total_questions: total, aura_reward: actualReward }
          : m
      ),
      currentModule: null,
    }));

    return actualReward;
  },

  setCurrentModule: (module: LearningModule | null) => {
    set({ currentModule: module });
  },
}));
