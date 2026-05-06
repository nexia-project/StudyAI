import { useState, useEffect, useCallback } from "react";
import { useStudyAuth as useAuth } from "@/hooks/useStudyAuth";

export interface StudentProfile {
  nome: string;
  serie: string;
  objetivo: string;
  concursoAlvo?: string;
  telefone?: string;
  email?: string;
  profileImageUrl?: string;
  tipoEscola?: string;
  escola?: string;
  cidade?: string;
  estado?: string;
}

const STORAGE_KEY = "studyai_profile";
const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

function readLocal(): StudentProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocal(profile: StudentProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {}
}

export function useStudentProfile() {
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(readLocal);
  const [loading, setLoading] = useState(true);

  // On mount (or when auth changes): fetch from server if authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    fetch(`${BASE_URL}/api/profile`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.studentName) {
          const merged: StudentProfile = {
            nome: data.studentName,
            serie: data.studentGrade ?? "",
            objetivo: data.studentGoal ?? "",
            concursoAlvo: data.studentConcursoAlvo ?? undefined,
            telefone: data.studentPhone ?? undefined,
            email: data.email ?? undefined,
            profileImageUrl: data.profileImageUrl ?? undefined,
            tipoEscola: data.studentSchoolType ?? undefined,
            escola: data.escola ?? undefined,
            cidade: data.cidade ?? undefined,
            estado: data.estado ?? undefined,
          };
          setProfile(merged);
          writeLocal(merged);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const saveProfile = useCallback(
    async (next: StudentProfile) => {
      setProfile(next);
      writeLocal(next);

      if (!isAuthenticated) return;

      try {
        await fetch(`${BASE_URL}/api/profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            studentName: next.nome,
            studentGrade: next.serie,
            studentGoal: next.objetivo,
            studentConcursoAlvo: next.concursoAlvo ?? null,
            studentPhone: next.telefone ?? null,
            studentSchoolType: next.tipoEscola ?? null,
            escola: next.escola ?? null,
            cidade: next.cidade ?? null,
            estado: next.estado ?? null,
          }),
        });
      } catch {}
    },
    [isAuthenticated]
  );

  return { profile, loading, saveProfile };
}
