import { useMutation } from "@tanstack/react-query";

export interface StudyPlanTopicExercise {
  pergunta: string;
  resposta: string;
}

export interface StudyPlanTopic {
  nome: string;
  explicacao: string;
  gatilho?: string;
  exercicio: StudyPlanTopicExercise;
}

export interface StudyPlanExercise {
  numero: number;
  pergunta: string;
  gabarito: string;
}

export interface StudyPlanChallenge {
  enunciado: string;
  gabarito: string;
}

export interface StudyPlanDay {
  numero: number;
  titulo: string;
  emoji: string;
  xp: number;
  cor: string;
  missao: string;
  topicos: StudyPlanTopic[] | string[];
  exerciciosDoDia?: StudyPlanExercise[];
  atividade: string;
  dica: string;
  desafio: StudyPlanChallenge | string;
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
  conteudoTexto?: string;
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

      if (typeof data.plano === "string") {
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

export async function streamStudyPlan(
  formData: FormData,
  callbacks: {
    onProgress: (chars: number) => void;
    onStatus: (message: string) => void;
    onDone: (result: StudyPlanResponse) => void;
    onError: (message: string) => void;
  }
): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/analisar", {
      method: "POST",
      headers: { Accept: "text/event-stream" },
      body: formData,
    });
  } catch {
    callbacks.onError("Erro de conexão. Verifique sua internet.");
    return;
  }

  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => ({}));
    callbacks.onError((data as any).erro || "Erro ao iniciar geração.");
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;
      try {
        const event = JSON.parse(raw) as {
          type: string;
          chars?: number;
          message?: string;
          plano?: StudyPlan;
          conteudoTexto?: string;
        };
        if (event.type === "progress" && event.chars !== undefined) {
          callbacks.onProgress(event.chars);
        } else if (event.type === "status" && event.message) {
          callbacks.onStatus(event.message);
        } else if (event.type === "done" && event.plano) {
          callbacks.onDone({ plano: event.plano, conteudoTexto: event.conteudoTexto });
        } else if (event.type === "error" && event.message) {
          callbacks.onError(event.message);
        }
      } catch {
        // ignore malformed SSE lines
      }
    }
  }
}
