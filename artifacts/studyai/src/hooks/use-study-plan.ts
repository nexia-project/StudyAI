import { useMutation } from "@tanstack/react-query";

export interface StudyPlanDay {
  numero: number;
  titulo: string;
  emoji: string;
  xp: number;
  cor: string;
  missao: string;
  topicos: string[];
  atividade: string;
  dica: string;
  desafio: string;
  tempoEstimado: string;
}

export interface StudyPlanAchievement {
  nome: string;
  emoji: string;
  descricao: string;
}

export interface StudyPlan {
  aluno: string;
  materia: string;
  emoji: string;
  cor: string;
  nivel: number;
  xpTotal: number;
  mensagemMotivacional: string;
  resumoDoConteudo: string;
  conquistas: StudyPlanAchievement[];
  dias: StudyPlanDay[];
  dicasGerais: string[];
  proximoNivel: string;
}

export interface StudyPlanResponse {
  plano?: StudyPlan;
  erro?: string;
}

export function useGenerateStudyPlan() {
  return useMutation<StudyPlanResponse, Error, FormData>({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/analisar", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.erro || "Ocorreu um erro ao processar sua solicitação.");
      }
      
      if (data.erro) {
        throw new Error(data.erro);
      }
      
      // If plano is a string (legacy), parse it, else it should be the object already
      if (typeof data.plano === 'string') {
        try {
           data.plano = JSON.parse(data.plano);
        } catch (e) {
           console.error("Failed to parse plano string to JSON", e);
        }
      }
      
      return data;
    },
  });
}
