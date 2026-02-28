import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

interface AuthState {
  session: Session | null;
  user: User | null;
  role: "parent" | "student" | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setRole: (role: "parent" | "student") => void;
  signUp: (
    email: string,
    password: string,
    role: "parent" | "student",
    name: string
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  role: null,
  loading: true,

  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      role: (session?.user?.user_metadata?.role as "parent" | "student") ?? null,
    }),

  setRole: (role) => set({ role }),

  signUp: async (email, password, role, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role, name },
      },
    });
    if (error) throw error;
    if (data.session) {
      get().setSession(data.session);
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    get().setSession(data.session);
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, role: null });
  },

  initialize: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    get().setSession(session);
    set({ loading: false });

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      get().setSession(session);
    });
  },
}));
