import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { API_BASE, useAuth } from "./AuthContext";

interface StudentProfile {
  nome: string;
  serie: string;
  objetivo: string;
  concursoAlvo?: string;
  xp: number;
  streak: number;
  tier: string;
  tierEmoji: string;
}

interface ProfileContextValue {
  profile: StudentProfile;
  setProfile: (p: Partial<StudentProfile>) => void;
  refreshStats: () => Promise<void>;
}

const defaultProfile: StudentProfile = {
  nome: "",
  serie: "",
  objetivo: "",
  xp: 0,
  streak: 0,
  tier: "Bronze",
  tierEmoji: "🥉",
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

function getTier(xp: number) {
  if (xp >= 6000) return { tier: "Diamante", emoji: "💎" };
  if (xp >= 3000) return { tier: "Platina", emoji: "🔮" };
  if (xp >= 1500) return { tier: "Ouro", emoji: "🥇" };
  if (xp >= 500) return { tier: "Prata", emoji: "🥈" };
  return { tier: "Bronze", emoji: "🥉" };
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [profile, setProfileState] = useState<StudentProfile>(defaultProfile);

  function setProfile(p: Partial<StudentProfile>) {
    setProfileState(prev => ({ ...prev, ...p }));
  }

  async function refreshStats() {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [profileRes, streakRes] = await Promise.all([
        fetch(`${API_BASE}/api/profile`, { headers }),
        fetch(`${API_BASE}/api/streak`, { headers }),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        const p = data.profile;
        if (p) {
          setProfileState(prev => ({
            ...prev,
            nome: p.studentName || prev.nome,
            serie: p.studentGrade || prev.serie,
            objetivo: p.studentGoal || prev.objetivo,
            concursoAlvo: p.studentConcursoAlvo || prev.concursoAlvo,
          }));
          if (p.xp !== undefined) {
            const { tier, emoji } = getTier(p.xp ?? 0);
            setProfileState(prev => ({ ...prev, xp: p.xp ?? 0, tier, tierEmoji: emoji }));
          }
        }
      }

      if (streakRes.ok) {
        const data = await streakRes.json();
        setProfileState(prev => ({ ...prev, streak: data.currentStreak ?? 0 }));
      }
    } catch {}
  }

  useEffect(() => {
    if (token) refreshStats();
  }, [token]);

  return (
    <ProfileContext.Provider value={{ profile, setProfile, refreshStats }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be inside ProfileProvider");
  return ctx;
}
