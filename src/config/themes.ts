// ============================================
// MERKEZI TEMA YAPILANDIRMASI
// ENV'den NEXT_PUBLIC_USER_THEME değişkeni ile seçilir
// Değerler: "casinodostlar" | "lykibom" | "site1" | "site2"
// ============================================

export type ThemeName = "casinodostlar" | "lykibom" | "site1" | "site2";

export interface ThemeColors {
  // Ana renkler
  primary: string;
  primaryHover: string;
  primaryForeground: string;

  // Arka plan renkleri
  background: string;
  backgroundSecondary: string;

  // Kart renkleri
  card: string;
  cardBorder: string;
  cardHover: string;

  // Gradient'ler
  gradientFrom: string;
  gradientTo: string;
  gradientVia?: string;

  // Accent renkler
  accent: string;
  accentHover: string;
  accentForeground: string;

  // Text renkleri
  text: string;
  textSecondary: string;
  textMuted: string;

  // Border renkleri
  border: string;
  borderHover: string;

  // Success, warning, error
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  error: string;
  errorBg: string;

  // Badge renkleri
  badgePrimary: string;
  badgePrimaryBg: string;
  badgeSecondary: string;
  badgeSecondaryBg: string;
}

export interface ThemeConfig {
  name: ThemeName;
  displayName: string;
  colors: ThemeColors;

  // Kart stilleri
  cardStyle: {
    base: string;
    hover: string;
    active: string;
  };

  // Buton stilleri
  buttonStyle: {
    primary: string;
    secondary: string;
    outline: string;
    ghost: string;
  };

  // Badge stilleri
  badgeStyle: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
  };

  // Tab stilleri
  tabStyle: {
    list: string;
    trigger: string;
    triggerActive: string;
  };

  // Progress bar stilleri
  progressStyle: {
    track: string;
    bar: string;
  };

  // Input stilleri
  inputStyle: {
    base: string;
    focus: string;
  };
}

// ============================================
// TEMA 1: CASINODOSTLAR (Mor/Mavi - Varsayılan)
// ============================================
const casinodostlarTheme: ThemeConfig = {
  name: "casinodostlar",
  displayName: "Casino Dostlar",
  colors: {
    primary: "#8b5cf6",
    primaryHover: "#7c3aed",
    primaryForeground: "#ffffff",
    background: "#0f172a",
    backgroundSecondary: "#1e293b",
    card: "#1e293b",
    cardBorder: "#334155",
    cardHover: "#334155",
    gradientFrom: "#8b5cf6",
    gradientTo: "#3b82f6",
    gradientVia: "#6366f1",
    accent: "#6366f1",
    accentHover: "#4f46e5",
    accentForeground: "#ffffff",
    text: "#f8fafc",
    textSecondary: "#cbd5e1",
    textMuted: "#64748b",
    border: "#334155",
    borderHover: "#475569",
    success: "#22c55e",
    successBg: "rgba(34, 197, 94, 0.15)",
    warning: "#f59e0b",
    warningBg: "rgba(245, 158, 11, 0.15)",
    error: "#ef4444",
    errorBg: "rgba(239, 68, 68, 0.15)",
    badgePrimary: "#a78bfa",
    badgePrimaryBg: "rgba(139, 92, 246, 0.2)",
    badgeSecondary: "#94a3b8",
    badgeSecondaryBg: "rgba(148, 163, 184, 0.15)",
  },
  cardStyle: {
    base: "bg-slate-800/80 border-slate-700/50 backdrop-blur-sm",
    hover: "",
    active: "bg-gradient-to-br from-violet-900/40 via-indigo-900/30 to-purple-900/40 border-violet-500/40",
  },
  buttonStyle: {
    primary: "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/25",
    secondary: "bg-slate-700 hover:bg-slate-600 text-white border border-slate-600",
    outline: "bg-violet-500/15 border-violet-500/40 text-violet-300 hover:bg-violet-500/25 hover:border-violet-400 hover:text-white shadow-sm shadow-violet-500/10 hover:shadow-violet-500/20",
    ghost: "text-slate-400 hover:text-white hover:bg-slate-800",
  },
  badgeStyle: {
    primary: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    secondary: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    success: "bg-green-500/20 text-green-300 border-green-500/30",
    warning: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    error: "bg-red-500/20 text-red-300 border-red-500/30",
  },
  tabStyle: {
    list: "bg-slate-800/50 border border-slate-700/50",
    trigger: "text-slate-400 hover:text-white hover:bg-slate-700/50",
    triggerActive: "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg",
  },
  progressStyle: {
    track: "bg-slate-700/50",
    bar: "bg-gradient-to-r from-violet-500 to-indigo-500",
  },
  inputStyle: {
    base: "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500",
    focus: "focus:border-violet-500 focus:ring-violet-500/20",
  },
};

// ============================================
// TEMA 2: LYKIBOM (Mavi tema)
// ============================================
const lykibomTheme: ThemeConfig = {
  name: "lykibom",
  displayName: "Lykibom",
  colors: {
    primary: "#3b82f6",
    primaryHover: "#2563eb",
    primaryForeground: "#ffffff",
    background: "#0f172a",
    backgroundSecondary: "#1e293b",
    card: "#1e293b",
    cardBorder: "#334155",
    cardHover: "#334155",
    gradientFrom: "#3b82f6",
    gradientTo: "#60a5fa",
    gradientVia: "#2563eb",
    accent: "#60a5fa",
    accentHover: "#3b82f6",
    accentForeground: "#ffffff",
    text: "#f8fafc",
    textSecondary: "#cbd5e1",
    textMuted: "#64748b",
    border: "#334155",
    borderHover: "#475569",
    success: "#22c55e",
    successBg: "rgba(34, 197, 94, 0.15)",
    warning: "#f59e0b",
    warningBg: "rgba(245, 158, 11, 0.15)",
    error: "#ef4444",
    errorBg: "rgba(239, 68, 68, 0.15)",
    badgePrimary: "#93c5fd",
    badgePrimaryBg: "rgba(59, 130, 246, 0.2)",
    badgeSecondary: "#94a3b8",
    badgeSecondaryBg: "rgba(148, 163, 184, 0.15)",
  },
  cardStyle: {
    base: "bg-slate-800/80 border-slate-700/50 backdrop-blur-sm",
    hover: "",
    active: "bg-gradient-to-br from-blue-900/40 via-blue-800/30 to-sky-900/40 border-blue-500/40",
  },
  buttonStyle: {
    primary: "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/25",
    secondary: "bg-slate-700 hover:bg-slate-600 text-white border border-slate-600",
    outline: "bg-blue-500/15 border-blue-500/40 text-blue-300 hover:bg-blue-500/25 hover:border-blue-400 hover:text-white shadow-sm shadow-blue-500/10 hover:shadow-blue-500/20",
    ghost: "text-slate-400 hover:text-white hover:bg-slate-800",
  },
  badgeStyle: {
    primary: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    secondary: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    success: "bg-green-500/20 text-green-300 border-green-500/30",
    warning: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    error: "bg-red-500/20 text-red-300 border-red-500/30",
  },
  tabStyle: {
    list: "bg-slate-800/50 border border-slate-700/50",
    trigger: "text-slate-400 hover:text-white hover:bg-slate-700/50",
    triggerActive: "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg",
  },
  progressStyle: {
    track: "bg-slate-700/50",
    bar: "bg-gradient-to-r from-blue-500 to-blue-400",
  },
  inputStyle: {
    base: "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500",
    focus: "focus:border-blue-500 focus:ring-blue-500/20",
  },
};

// ============================================
// TEMA 3: SITE1 (Mavi/Cyan tema)
// ============================================
const site1Theme: ThemeConfig = {
  name: "site1",
  displayName: "Site 1",
  colors: {
    primary: "#06b6d4",
    primaryHover: "#0891b2",
    primaryForeground: "#ffffff",
    background: "#0c1929",
    backgroundSecondary: "#0f2942",
    card: "#0f2942",
    cardBorder: "#1e4976",
    cardHover: "#1e4976",
    gradientFrom: "#06b6d4",
    gradientTo: "#3b82f6",
    gradientVia: "#0ea5e9",
    accent: "#0ea5e9",
    accentHover: "#0284c7",
    accentForeground: "#ffffff",
    text: "#f0f9ff",
    textSecondary: "#bae6fd",
    textMuted: "#7dd3fc",
    border: "#1e4976",
    borderHover: "#2563eb",
    success: "#10b981",
    successBg: "rgba(16, 185, 129, 0.15)",
    warning: "#f59e0b",
    warningBg: "rgba(245, 158, 11, 0.15)",
    error: "#f43f5e",
    errorBg: "rgba(244, 63, 94, 0.15)",
    badgePrimary: "#67e8f9",
    badgePrimaryBg: "rgba(6, 182, 212, 0.2)",
    badgeSecondary: "#7dd3fc",
    badgeSecondaryBg: "rgba(125, 211, 252, 0.15)",
  },
  cardStyle: {
    base: "bg-[#0f2942]/90 border-cyan-900/50 backdrop-blur-sm",
    hover: "",
    active: "bg-gradient-to-br from-cyan-900/40 via-blue-900/30 to-sky-900/40 border-cyan-500/40",
  },
  buttonStyle: {
    primary: "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25",
    secondary: "bg-[#1e4976] hover:bg-[#2563eb] text-white border border-cyan-800",
    outline: "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25 hover:border-cyan-400 hover:text-white shadow-sm shadow-cyan-500/10 hover:shadow-cyan-500/20",
    ghost: "text-cyan-400 hover:text-white hover:bg-cyan-900/50",
  },
  badgeStyle: {
    primary: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    secondary: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    success: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    warning: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    error: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  },
  tabStyle: {
    list: "bg-[#0f2942]/70 border border-cyan-900/50",
    trigger: "text-cyan-300 hover:text-white hover:bg-cyan-800/50",
    triggerActive: "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg",
  },
  progressStyle: {
    track: "bg-cyan-900/50",
    bar: "bg-gradient-to-r from-cyan-500 to-blue-500",
  },
  inputStyle: {
    base: "bg-[#0f2942] border-cyan-800 text-white placeholder:text-cyan-700",
    focus: "focus:border-cyan-500 focus:ring-cyan-500/20",
  },
};

// ============================================
// TEMA 4: SITE2 (Yeşil/Emerald tema)
// ============================================
const site2Theme: ThemeConfig = {
  name: "site2",
  displayName: "Site 2",
  colors: {
    primary: "#22c55e",
    primaryHover: "#16a34a",
    primaryForeground: "#ffffff",
    background: "#0f1a14",
    backgroundSecondary: "#1a2e23",
    card: "#1a2e23",
    cardBorder: "#2d5a3f",
    cardHover: "#2d5a3f",
    gradientFrom: "#22c55e",
    gradientTo: "#10b981",
    gradientVia: "#14b8a6",
    accent: "#14b8a6",
    accentHover: "#0d9488",
    accentForeground: "#ffffff",
    text: "#ecfdf5",
    textSecondary: "#a7f3d0",
    textMuted: "#6ee7b7",
    border: "#2d5a3f",
    borderHover: "#15803d",
    success: "#4ade80",
    successBg: "rgba(74, 222, 128, 0.15)",
    warning: "#fbbf24",
    warningBg: "rgba(251, 191, 36, 0.15)",
    error: "#f87171",
    errorBg: "rgba(248, 113, 113, 0.15)",
    badgePrimary: "#86efac",
    badgePrimaryBg: "rgba(34, 197, 94, 0.2)",
    badgeSecondary: "#6ee7b7",
    badgeSecondaryBg: "rgba(110, 231, 183, 0.15)",
  },
  cardStyle: {
    base: "bg-[#1a2e23]/90 border-emerald-900/50 backdrop-blur-sm",
    hover: "",
    active: "bg-gradient-to-br from-emerald-900/40 via-green-900/30 to-teal-900/40 border-emerald-500/40",
  },
  buttonStyle: {
    primary: "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25",
    secondary: "bg-[#2d5a3f] hover:bg-[#15803d] text-white border border-emerald-800",
    outline: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-400 hover:text-white shadow-sm shadow-emerald-500/10 hover:shadow-emerald-500/20",
    ghost: "text-emerald-400 hover:text-white hover:bg-emerald-900/50",
  },
  badgeStyle: {
    primary: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    secondary: "bg-teal-500/20 text-teal-300 border-teal-500/30",
    success: "bg-green-500/20 text-green-300 border-green-500/30",
    warning: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    error: "bg-red-500/20 text-red-300 border-red-500/30",
  },
  tabStyle: {
    list: "bg-[#1a2e23]/70 border border-emerald-900/50",
    trigger: "text-emerald-300 hover:text-white hover:bg-emerald-800/50",
    triggerActive: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg",
  },
  progressStyle: {
    track: "bg-emerald-900/50",
    bar: "bg-gradient-to-r from-emerald-500 to-teal-500",
  },
  inputStyle: {
    base: "bg-[#1a2e23] border-emerald-800 text-white placeholder:text-emerald-700",
    focus: "focus:border-emerald-500 focus:ring-emerald-500/20",
  },
};

// ============================================
// TEMA HARİTASI VE YARDIMCI FONKSİYONLAR
// ============================================

export const themes: Record<ThemeName, ThemeConfig> = {
  casinodostlar: casinodostlarTheme,
  lykibom: lykibomTheme,
  site1: site1Theme,
  site2: site2Theme,
};

// ENV'den tema adını al
export function getThemeName(): ThemeName {
  const themeName = process.env.NEXT_PUBLIC_USER_THEME as ThemeName;
  if (themeName && themes[themeName]) {
    return themeName;
  }
  return "casinodostlar"; // Varsayılan tema
}

// Aktif temayı al
export function getActiveTheme(): ThemeConfig {
  return themes[getThemeName()];
}

// Tema listesini al (admin panel için)
export function getThemeList(): { name: ThemeName; displayName: string }[] {
  return Object.values(themes).map((theme) => ({
    name: theme.name,
    displayName: theme.displayName,
  }));
}
