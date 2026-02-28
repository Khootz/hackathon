import { Platform } from "react-native";

export const Colors = {
  // Brand
  primary: "#3D7A8A",
  primaryLight: "#7EC5D4",
  primaryDark: "#2A5F6E",
  accent: "#E8956D",
  accentLight: "#F5C4A8",
  accentDark: "#C96E48",

  // Backgrounds
  background: "#EBF0F4",
  backgroundAlt: "#F4F9FB",
  card: "#FFFFFF",
  cardWarm: "#FDF6F0",
  cardTeal: "#EBF6F9",

  // Text
  text: "#1C2D3A",
  textSecondary: "#6B8190",
  textLight: "#A8BCC5",
  textInverse: "#FFFFFF",

  // Semantic
  success: "#4FB87A",
  successLight: "#E6F5EE",
  warning: "#F4A261",
  warningLight: "#FEF3E8",
  error: "#E06C75",
  errorLight: "#FCEEEF",
  gold: "#D4A449",
  goldLight: "#FBF1DC",

  // UI
  border: "#D5E6ED",
  borderLight: "#EAF3F7",
  separator: "#EDF2F5",

  // Legacy aliases (kept for compatibility)
  secondary: "#2A5F6E",
  surface: "#FFFFFF",
  surfaceLight: "#EBF6F9",
  auraGold: "#D4A449",
  auraGreen: "#4FB87A",
  auraRed: "#E06C75",
};

export const Fonts = {
  heading: Platform.OS === "ios" ? "Avenir-Heavy" : "sans-serif-condensed",
  headingMedium: Platform.OS === "ios" ? "Avenir-Medium" : "sans-serif-medium",
  body: Platform.OS === "ios" ? "Avenir" : "sans-serif",
  bodyLight: Platform.OS === "ios" ? "Avenir-Light" : "sans-serif-light",
  mono: Platform.OS === "ios" ? "Menlo" : "monospace",
};

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 999,
};

export const Shadows = {
  sm: {
    shadowColor: "#1C2D3A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: "#1C2D3A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: "#1C2D3A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
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
