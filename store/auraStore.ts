import { create } from "zustand";
import { supabase } from "../lib/supabase";

interface AuraState {
  balance: number;
  invested: number;
  lastCompoundAt: string | null;
  transactions: AuraTransaction[];
  loading: boolean;

  fetchBalance: (userId: string) => Promise<void>;
  fetchTransactions: (userId: string) => Promise<void>;
  drainAura: (userId: string, amount: number, appName: string) => Promise<void>;
  earnAura: (userId: string, amount: number, description: string) => Promise<void>;
  investAura: (userId: string, amount: number) => Promise<void>;
  withdrawAura: (userId: string, amount: number) => Promise<void>;
  compoundAura: (userId: string) => Promise<number>;
}

export interface AuraTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: "reward" | "drain" | "invest" | "compound" | "penalty" | "withdraw";
  description: string;
  created_at: string;
}

export const useAuraStore = create<AuraState>((set, get) => ({
  balance: 0,
  invested: 0,
  lastCompoundAt: null,
  transactions: [],
  loading: true,

  fetchBalance: async (userId: string) => {
    const { data, error } = await supabase
      .from("aura_balance")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      // If no balance record exists, create one
      if (error.code === "PGRST116") {
        const { data: newData } = await supabase
          .from("aura_balance")
          .insert({ user_id: userId, balance: 500, invested: 0 })
          .select()
          .single();
        if (newData) {
          set({
            balance: newData.balance,
            invested: newData.invested,
            lastCompoundAt: newData.last_compound_at,
            loading: false,
          });
        }
        return;
      }
      console.error("Error fetching aura balance:", error);
      set({ loading: false });
      return;
    }

    set({
      balance: data.balance,
      invested: data.invested,
      lastCompoundAt: data.last_compound_at,
      loading: false,
    });
  },

  fetchTransactions: async (userId: string) => {
    const { data, error } = await supabase
      .from("aura_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching transactions:", error);
      return;
    }

    set({ transactions: data ?? [] });
  },

  drainAura: async (userId: string, amount: number, appName: string) => {
    const currentBalance = get().balance;
    const newBalance = Math.max(0, currentBalance - amount);
    const actualDrain = currentBalance - newBalance;

    if (actualDrain <= 0) return;

    // Update balance
    await supabase
      .from("aura_balance")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    // Record transaction
    await supabase.from("aura_transactions").insert({
      user_id: userId,
      amount: -actualDrain,
      type: "drain",
      description: `Screen time: ${appName}`,
    });

    set({ balance: newBalance });
  },

  earnAura: async (userId: string, amount: number, description: string) => {
    const newBalance = get().balance + amount;

    await supabase
      .from("aura_balance")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    await supabase.from("aura_transactions").insert({
      user_id: userId,
      amount,
      type: "reward",
      description,
    });

    set({ balance: newBalance });
  },

  investAura: async (userId: string, amount: number) => {
    const currentBalance = get().balance;
    if (amount > currentBalance - get().invested) return;

    const newInvested = get().invested + amount;

    await supabase
      .from("aura_balance")
      .update({
        invested: newInvested,
        last_compound_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    await supabase.from("aura_transactions").insert({
      user_id: userId,
      amount: -amount,
      type: "invest",
      description: `Invested ${amount} aura for compound growth`,
    });

    set({ invested: newInvested });
  },

  withdrawAura: async (userId: string, amount: number) => {
    const currentInvested = get().invested;
    if (amount > currentInvested) return;

    const newInvested = currentInvested - amount;

    await supabase
      .from("aura_balance")
      .update({
        invested: newInvested,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    await supabase.from("aura_transactions").insert({
      user_id: userId,
      amount,
      type: "withdraw",
      description: `Withdrew ${amount} aura from investment`,
    });

    set({ invested: newInvested });
  },

  compoundAura: async (userId: string) => {
    const { data, error } = await supabase.rpc("compound_aura", {
      p_user_id: userId,
    });

    if (error) {
      console.error("Compound error:", error);
      return 0;
    }

    const interest = data ?? 0;
    if (interest > 0) {
      await get().fetchBalance(userId);
    }
    return interest;
  },
}));
