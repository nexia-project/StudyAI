export default function Slide13_DashboardProfessor() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0F172A" }}>
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 60% at 90% 20%, rgba(245,158,11,0.2) 0%, transparent 60%)" }} />

      <div className="relative h-full flex flex-col px-[8vw] pt-[5vh] pb-[4vh]">
        <div className="mb-[2.5vh]">
          <p className="font-display font-semibold tracking-widest uppercase mb-[0.8vh]" style={{ fontSize: "1.3vw", color: "#F59E0B" }}>Painel do Educador</p>
          <h2 className="font-display font-extrabold tracking-tight" style={{ fontSize: "3.5vw", color: "#F1F5F9" }}>Dashboard do Professor</h2>
        </div>

        <div className="grid grid-cols-3 gap-[1.5vw] flex-1">
          <div className="flex flex-col gap-[1.5vw]">
            <div className="rounded-[1vw] p-[1.8vw]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Visão Geral — Turma A</p>
              <div className="flex flex-col gap-[1.2vh]">
                <div className="flex justify-between items-center">
                  <span className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Total de alunos</span>
                  <span className="font-display font-bold" style={{ fontSize: "1.4vw", color: "#F1F5F9" }}>34</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Ativos esta semana</span>
                  <span className="font-display font-bold" style={{ fontSize: "1.4vw", color: "#10B981" }}>28</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Média de aproveitamento</span>
                  <span className="font-display font-bold" style={{ fontSize: "1.4vw", color: "#6366F1" }}>74%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Alunos em risco</span>
                  <span className="font-display font-bold" style={{ fontSize: "1.4vw", color: "#EF4444" }}>4</span>
                </div>
              </div>
            </div>

            <div className="rounded-[1vw] p-[1.8vw] flex-1" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#EF4444" }}>Alertas — Atenção Necessária</p>
              <div className="flex flex-col gap-[1.2vh]">
                <div className="rounded-[0.5vw] p-[1vw]" style={{ background: "rgba(239,68,68,0.1)" }}>
                  <p className="font-body font-medium" style={{ fontSize: "1.1vw", color: "#F1F5F9" }}>Ana Clara — 3 dias sem login</p>
                  <p className="font-body" style={{ fontSize: "0.9vw", color: "#94A3B8" }}>Última sessão: Quarta-feira</p>
                </div>
                <div className="rounded-[0.5vw] p-[1vw]" style={{ background: "rgba(239,68,68,0.1)" }}>
                  <p className="font-body font-medium" style={{ fontSize: "1.1vw", color: "#F1F5F9" }}>Pedro Lima — abaixo de 40%</p>
                  <p className="font-body" style={{ fontSize: "0.9vw", color: "#94A3B8" }}>Matemática: 38% de acerto</p>
                </div>
                <div className="rounded-[0.5vw] p-[1vw]" style={{ background: "rgba(239,68,68,0.1)" }}>
                  <p className="font-body font-medium" style={{ fontSize: "1.1vw", color: "#F1F5F9" }}>Lucas Souza — sem revisões</p>
                  <p className="font-body" style={{ fontSize: "0.9vw", color: "#94A3B8" }}>12 flashcards atrasados</p>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-2 flex flex-col gap-[1.5vw]">
            <div className="rounded-[1vw] p-[1.8vw]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Desempenho Individual — Top 5 Alunos</p>
              <div className="flex flex-col gap-[1vh]">
                <div className="flex items-center gap-[1vw] rounded-[0.5vw] p-[0.8vw]" style={{ background: "rgba(245,158,11,0.1)" }}>
                  <span className="font-display font-bold w-[1.5vw]" style={{ fontSize: "1.2vw", color: "#F59E0B" }}>1</span>
                  <span className="font-body flex-1" style={{ fontSize: "1.1vw", color: "#F1F5F9" }}>Mariana Costa</span>
                  <div className="w-[15vw] rounded-full h-[0.8vh]" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full" style={{ width: "96%", background: "linear-gradient(90deg, #F59E0B, #F97316)" }} />
                  </div>
                  <span className="font-display font-bold w-[3.5vw] text-right" style={{ fontSize: "1.2vw", color: "#F59E0B" }}>96%</span>
                </div>
                <div className="flex items-center gap-[1vw] rounded-[0.5vw] p-[0.8vw]" style={{ background: "rgba(99,102,241,0.08)" }}>
                  <span className="font-display font-bold w-[1.5vw]" style={{ fontSize: "1.2vw", color: "#6366F1" }}>2</span>
                  <span className="font-body flex-1" style={{ fontSize: "1.1vw", color: "#F1F5F9" }}>Carlos Andrade</span>
                  <div className="w-[15vw] rounded-full h-[0.8vh]" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full" style={{ width: "89%", background: "linear-gradient(90deg, #6366F1, #8B5CF6)" }} />
                  </div>
                  <span className="font-display font-bold w-[3.5vw] text-right" style={{ fontSize: "1.2vw", color: "#6366F1" }}>89%</span>
                </div>
                <div className="flex items-center gap-[1vw] rounded-[0.5vw] p-[0.8vw]" style={{ background: "rgba(16,185,129,0.08)" }}>
                  <span className="font-display font-bold w-[1.5vw]" style={{ fontSize: "1.2vw", color: "#10B981" }}>3</span>
                  <span className="font-body flex-1" style={{ fontSize: "1.1vw", color: "#F1F5F9" }}>Beatriz Oliveira</span>
                  <div className="w-[15vw] rounded-full h-[0.8vh]" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full" style={{ width: "84%", background: "linear-gradient(90deg, #10B981, #0D9488)" }} />
                  </div>
                  <span className="font-display font-bold w-[3.5vw] text-right" style={{ fontSize: "1.2vw", color: "#10B981" }}>84%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-[1.5vw] flex-1">
              <div className="rounded-[1vw] p-[1.8vw]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Relatório Automático</p>
                <p className="font-body mb-[1.5vh]" style={{ fontSize: "1.2vw", color: "#CBD5E1", lineHeight: "1.5" }}>Resumo semanal gerado por IA enviado automaticamente para pais e diretores — com gráficos e recomendações pedagógicas.</p>
                <div className="flex gap-[0.8vw]">
                  <span className="px-[0.8vw] py-[0.4vh] rounded-full font-body" style={{ fontSize: "1vw", background: "rgba(99,102,241,0.15)", color: "#6366F1" }}>WhatsApp</span>
                  <span className="px-[0.8vw] py-[0.4vh] rounded-full font-body" style={{ fontSize: "1vw", background: "rgba(99,102,241,0.15)", color: "#6366F1" }}>Email</span>
                  <span className="px-[0.8vw] py-[0.4vh] rounded-full font-body" style={{ fontSize: "1vw", background: "rgba(99,102,241,0.15)", color: "#6366F1" }}>PDF</span>
                </div>
              </div>

              <div className="rounded-[1vw] p-[1.8vw]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Ferramentas do Professor</p>
                <div className="flex flex-col gap-[1.2vh]">
                  <div className="flex items-center gap-[0.8vw]">
                    <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#6366F1" }} />
                    <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Criar tarefas e prazos por turma</p>
                  </div>
                  <div className="flex items-center gap-[0.8vw]">
                    <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#10B981" }} />
                    <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Banco de questões privado</p>
                  </div>
                  <div className="flex items-center gap-[0.8vw]">
                    <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#F59E0B" }} />
                    <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Chat direto com alunos por IA</p>
                  </div>
                  <div className="flex items-center gap-[0.8vw]">
                    <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#8B5CF6" }} />
                    <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Simulados personalizados por turma</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-[8vw] py-[2vh] flex justify-between items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="font-display font-bold" style={{ fontSize: "1.4vw", color: "#6366F1" }}>StudyAI</span>
        <span className="font-body" style={{ fontSize: "1.2vw", color: "#475569" }}>10 / 17</span>
        <span className="font-body" style={{ fontSize: "1.3vw", color: "#475569" }}>study.ia.br</span>
      </div>
    </div>
  );
}
