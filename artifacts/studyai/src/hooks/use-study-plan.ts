import { useMutation } from "@tanstack/react-query";

interface StudyPlanResponse {
  plano?: string;
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
      
      return data;
    },
  });
}
