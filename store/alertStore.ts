import { create } from "zustand";
import { supabase } from "../lib/supabase";

interface SecurityAlert {
  id: string;
  child_id: string;
  parent_id: string;
  severity: "minor" | "critical";
  message: string;
  app_name: string | null;
  sent_whatsapp: boolean;
  acknowledged: boolean;
  created_at: string;
}

interface AlertState {
  alerts: SecurityAlert[];
  loading: boolean;

  fetchAlerts: (parentId: string) => Promise<void>;
  createAlert: (
    childId: string,
    parentId: string,
    severity: "minor" | "critical",
    message: string,
    appName?: string
  ) => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  fetchChildAlerts: (childId: string) => Promise<SecurityAlert[]>;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  loading: true,

  fetchAlerts: async (parentId: string) => {
    const { data, error } = await supabase
      .from("security_alerts")
      .select("*")
      .eq("parent_id", parentId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching alerts:", error);
      set({ loading: false });
      return;
    }

    set({ alerts: data ?? [], loading: false });
  },

  createAlert: async (
    childId: string,
    parentId: string,
    severity: "minor" | "critical",
    message: string,
    appName?: string
  ) => {
    const { data, error } = await supabase
      .from("security_alerts")
      .insert({
        child_id: childId,
        parent_id: parentId,
        severity,
        message,
        app_name: appName ?? null,
        sent_whatsapp: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating alert:", error);
      return;
    }

    if (data) {
      set((state) => ({ alerts: [data, ...state.alerts] }));
    }
  },

  acknowledgeAlert: async (alertId: string) => {
    await supabase
      .from("security_alerts")
      .update({ acknowledged: true })
      .eq("id", alertId);

    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === alertId ? { ...a, acknowledged: true } : a
      ),
    }));
  },

  fetchChildAlerts: async (childId: string) => {
    const { data } = await supabase
      .from("security_alerts")
      .select("*")
      .eq("child_id", childId)
      .order("created_at", { ascending: false })
      .limit(20);

    return data ?? [];
  },
}));
