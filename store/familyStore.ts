import { create } from "zustand";
import { supabase } from "../lib/supabase";

interface FamilyLink {
  id: string;
  parent_id: string;
  child_id: string | null;
  invite_code: string;
  status: "pending" | "accepted";
  created_at: string;
}

interface ChildProfile {
  id: string;
  name: string;
  role: string;
  avatar_url: string | null;
  aura_balance?: {
    balance: number;
    invested: number;
  };
}

interface FamilyState {
  links: FamilyLink[];
  children: ChildProfile[];
  parentId: string | null;
  inviteCode: string | null;
  loading: boolean;

  generateInviteCode: (parentId: string) => Promise<string>;
  acceptInvite: (childId: string, code: string) => Promise<boolean>;
  fetchLinks: (userId: string, role: string) => Promise<void>;
  fetchChildren: (parentId: string) => Promise<void>;
  getLinkedParent: (childId: string) => Promise<string | null>;
  subscribeToLinkChanges: (parentId: string) => () => void;
}

function makeCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  links: [],
  children: [],
  parentId: null,
  inviteCode: null,
  loading: false,

  generateInviteCode: async (parentId: string) => {
    // Check for existing pending invite
    const { data: existing } = await supabase
      .from("family_links")
      .select("*")
      .eq("parent_id", parentId)
      .eq("status", "pending")
      .is("child_id", null)
      .limit(1)
      .maybeSingle();

    if (existing) {
      set({ inviteCode: existing.invite_code });
      return existing.invite_code;
    }

    const code = makeCode();
    const { data, error } = await supabase
      .from("family_links")
      .insert({ parent_id: parentId, invite_code: code, status: "pending" })
      .select()
      .single();

    if (error) throw error;

    set({ inviteCode: data.invite_code });
    return data.invite_code;
  },

  acceptInvite: async (childId: string, code: string) => {
    // Find the pending invite
    const { data: link, error: findError } = await supabase
      .from("family_links")
      .select("*")
      .eq("invite_code", code.toUpperCase())
      .eq("status", "pending")
      .is("child_id", null)
      .maybeSingle();

    if (findError || !link) {
      console.error("[AuraMax] acceptInvite: no matching invite found", findError);
      return false;
    }

    console.log("[AuraMax] acceptInvite: found link", link.id, "from parent", link.parent_id);

    // Accept it — use .select() to verify the row was actually updated
    const { data: updated, error } = await supabase
      .from("family_links")
      .update({ child_id: childId, status: "accepted" })
      .eq("id", link.id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[AuraMax] acceptInvite: update error", error);
      return false;
    }

    // RLS may silently block the update — verify the row came back
    if (!updated || updated.child_id !== childId) {
      console.error("[AuraMax] acceptInvite: update was blocked by RLS (0 rows affected)");
      return false;
    }

    console.log("[AuraMax] acceptInvite: success, child", childId, "linked to parent", link.parent_id);
    set({ parentId: link.parent_id });

    // Refetch links so child-side state is fully up to date
    await get().fetchLinks(childId, "student");

    return true;
  },

  fetchLinks: async (userId: string, role: string) => {
    set({ loading: true });
    const query = role === "parent"
      ? supabase.from("family_links").select("*").eq("parent_id", userId)
      : supabase.from("family_links").select("*").eq("child_id", userId);

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching links:", error);
      set({ loading: false });
      return;
    }

    set({ links: data ?? [], loading: false });

    if (role === "parent") {
      await get().fetchChildren(userId);
    } else {
      const accepted = data?.find((l) => l.status === "accepted");
      if (accepted) {
        set({ parentId: accepted.parent_id });
      }
    }
  },

  fetchChildren: async (parentId: string) => {
    const { data: links } = await supabase
      .from("family_links")
      .select("child_id")
      .eq("parent_id", parentId)
      .eq("status", "accepted");

    if (!links || links.length === 0) {
      set({ children: [] });
      return;
    }

    const childIds = links.map((l) => l.child_id).filter(Boolean);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("id", childIds);

    // Get aura balances
    const { data: balances } = await supabase
      .from("aura_balance")
      .select("user_id, balance, invested")
      .in("user_id", childIds);

    const children: ChildProfile[] = (profiles ?? []).map((p) => {
      const bal = balances?.find((b) => b.user_id === p.id);
      return {
        ...p,
        aura_balance: bal ? { balance: bal.balance, invested: bal.invested } : undefined,
      };
    });

    set({ children });
  },

  getLinkedParent: async (childId: string) => {
    const { data } = await supabase
      .from("family_links")
      .select("parent_id")
      .eq("child_id", childId)
      .eq("status", "accepted")
      .maybeSingle();

    return data?.parent_id ?? null;
  },

  subscribeToLinkChanges: (parentId: string) => {
    const channel = supabase
      .channel(`family-links-${parentId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "family_links",
          filter: `parent_id=eq.${parentId}`,
        },
        () => {
          // A child accepted an invite — refetch children
          get().fetchChildren(parentId);
          get().fetchLinks(parentId, "parent");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
