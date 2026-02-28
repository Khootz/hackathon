export const Colors = {
  primary: "#6C63FF",
  secondary: "#1a1a2e",
  accent: "#e94560",
  background: "#0f0f23",
  surface: "#16213e",
  surfaceLight: "#1a2744",
  text: "#FFFFFF",
  textSecondary: "#a0aec0",
  auraGold: "#FFD700",
  auraGreen: "#00C853",
  auraRed: "#FF1744",
  border: "#2d3748",
};

export const AuraRules = {
  MODULE_REWARD_MIN: 50,
  MODULE_REWARD_MAX: 200,
  SCHOOL_ASSIGNMENT_BONUS: 100,
  OVERDUE_PENALTY: -50,
  SUSPICIOUS_ACTIVITY_PENALTY: -50,
  DEFAULT_DRAIN_RATE: 1, // points per minute
  COMPOUND_RATE: 0.02, // 2% daily
};

// ── Suspicious Activity Detection ─────────────────────────────────────────────

export interface RiskEntry {
  patterns: string[];
  category: string;
  baseSeverity: "minor" | "critical";
  minMinutes: number;
  description: string;
}

export const RISK_REGISTRY: RiskEntry[] = [
  {
    patterns: ["com.zhiliaoapp.musically", "com.ss.android.ugc", "tiktok", "musically"],
    category: "Short-form Video",
    baseSeverity: "minor",
    minMinutes: 2,
    description: "Addictive short-form video with unmoderated content",
  },
  {
    patterns: ["com.discord", "discord"],
    category: "Anonymous Chat",
    baseSeverity: "minor",
    minMinutes: 3,
    description: "Chat platform with unmoderated servers and strangers",
  },
  {
    patterns: ["omegle", "ome.tv", "chatroulette", "chatspin", "emeraldchat", "monkey.cool"],
    category: "Random Stranger Chat",
    baseSeverity: "critical",
    minMinutes: 0,
    description: "Anonymous video/text chat with strangers — high risk",
  },
  {
    patterns: ["tinder", "bumble", "hinge", "grindr", "badoo"],
    category: "Dating App",
    baseSeverity: "critical",
    minMinutes: 0,
    description: "Dating app — inappropriate for minors",
  },
  {
    patterns: ["onlyfans", "xvideos", "pornhub", "xhamster", "brazzers"],
    category: "Adult Content",
    baseSeverity: "critical",
    minMinutes: 0,
    description: "Explicit adult content platform",
  },
  {
    patterns: ["stake", "bet365", "draftkings", "fanduel", "gambling", "poker", "casino"],
    category: "Gambling",
    baseSeverity: "critical",
    minMinutes: 0,
    description: "Gambling/betting platform — illegal for minors",
  },
  {
    patterns: ["com.snapchat", "snapchat"],
    category: "Ephemeral Messaging",
    baseSeverity: "minor",
    minMinutes: 5,
    description: "Disappearing messages — hard for parents to monitor",
  },
  {
    patterns: ["kick.com", "kick", "rumble", "bigo.live", "liveme"],
    category: "Unmoderated Live Streaming",
    baseSeverity: "minor",
    minMinutes: 3,
    description: "Unmoderated live streaming with stranger interactions",
  },
  {
    patterns: ["wattpad"],
    category: "Fan Fiction Platform",
    baseSeverity: "minor",
    minMinutes: 10,
    description: "User-generated fiction with potentially mature content",
  },
  {
    patterns: ["com.twitter", "twitter", "x.com"],
    category: "Social Media",
    baseSeverity: "minor",
    minMinutes: 3,
    description: "Social media with unfiltered content",
  },
  {
    patterns: ["com.reddit", "reddit"],
    category: "Social Media",
    baseSeverity: "minor",
    minMinutes: 3,
    description: "Social platform with NSFW communities",
  },
  {
    patterns: ["org.torproject", "tor browser"],
    category: "Privacy Browser",
    baseSeverity: "critical",
    minMinutes: 0,
    description: "Anonymous browser that can bypass all content filters",
  },
];

export const DetectionConfig = {
  INTERVAL_MS: 10_000,               // poll foreground app every 10 s
  CONFIDENCE_THRESHOLD: 0.65,        // minimum LLM confidence to act
  ALERT_COOLDOWN_MS: 15 * 60 * 1000, // 15 min before re-alerting same app
  SAME_APP_SKIP_MS: 30_000,          // skip re-checking same app within 30 s
  MAX_FLAGS_PER_DAY: 20,             // prevent runaway API calls
};
