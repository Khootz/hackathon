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

// ── Suspicious Activity Detection ──────────────────────────────────────────

export interface RiskEntry {
  patterns: string[];
  category: string;
  baseSeverity: "minor" | "critical";
  minMinutes: number;
  description: string;
}

export const RISK_REGISTRY: RiskEntry[] = [
  { patterns: ["tiktok", "musically"], category: "short-form-video", baseSeverity: "minor", minMinutes: 0, description: "Addictive short-form video platform" },
  { patterns: ["discord"], category: "unmoderated-chat", baseSeverity: "minor", minMinutes: 0, description: "Voice/text chat with strangers possible" },
  { patterns: ["omegle", "chatroulette", "monkey"], category: "stranger-video-chat", baseSeverity: "critical", minMinutes: 0, description: "Random stranger video chat — high risk" },
  { patterns: ["tinder", "bumble", "hinge", "grindr", "badoo"], category: "dating-app", baseSeverity: "critical", minMinutes: 0, description: "Dating / hookup platform" },
  { patterns: ["pornhub", "xvideos", "xhamster", "xnxx", "onlyfans"], category: "adult-content", baseSeverity: "critical", minMinutes: 0, description: "Explicit adult content" },
  { patterns: ["bet365", "draftkings", "fanduel", "pokerstars", "stake.com", "1xbet"], category: "gambling", baseSeverity: "critical", minMinutes: 0, description: "Online gambling / betting" },
  { patterns: ["snapchat"], category: "ephemeral-messaging", baseSeverity: "minor", minMinutes: 0, description: "Disappearing messages — hard to monitor" },
  { patterns: ["netflix", "disneyplus", "hulu", "primevideo", "hbomax"], category: "streaming-binge", baseSeverity: "minor", minMinutes: 30, description: "Extended streaming session" },
  { patterns: ["wattpad", "ao3", "archiveofourown"], category: "unmoderated-fiction", baseSeverity: "minor", minMinutes: 0, description: "User-generated fiction — may contain mature content" },
  { patterns: ["twitter", "x.com"], category: "social-media-unfiltered", baseSeverity: "minor", minMinutes: 0, description: "Unfiltered social media feed" },
  { patterns: ["reddit"], category: "forum-unmoderated", baseSeverity: "minor", minMinutes: 0, description: "Community forums with NSFW sections" },
  { patterns: ["tor", "onionbrowser", "orbot"], category: "anonymity-tool", baseSeverity: "critical", minMinutes: 0, description: "Dark web access tool" },
];

export const DetectionConfig = {
  INTERVAL_MS: 10_000,
  CONFIDENCE_THRESHOLD: 0.65,
  ALERT_COOLDOWN_MS: 15 * 60 * 1000,
  SAME_APP_SKIP_MS: 30_000,
  MAX_FLAGS_PER_DAY: 20,
};
