export default function Slide15_Analytics() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0F172A" }}>
      <div className="absolute inset-0 opacity-8 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 100%, rgba(99,102,241,0.2) 0%, transparent 60%)" }} />

      <div className="relative h-full flex flex-col px-[8vw] pt-[5vh] pb-[4vh]">
        <div className="mb-[2.5vh]">
          <p className="font-display font-semibold tracking-widest uppercase mb-[0.8vh]" style={{ fontSize: "1.3vw", color: "#6366F1" }}>Inteligência de Dados</p>
          <h2 className="font-display font-extrabold tracking-tight" style={{ fontSize: "3.5vw", color: "#F1F5F9" }}>Análise e Relatórios</h2>
        </div>

        <div className="grid grid-cols-3 gap-[1.5vw] flex-1">
          <div className="col-span-2 flex flex-col gap-[1.5vw]">
            <div className="rounded-[1vw] p-[2vw]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Sessões de Estudo — Últimas 8 Semanas</p>
              <div className="flex items-end gap-[1.2vw] h-[14vh]">
                <div className="flex flex-col items-center gap-[0.5vh] flex-1">
                  <div className="w-full rounded-t-[0.3vw]" style={{ height: "60%", background: "linear-gradient(to top, #4F46E5, #6366F1)" }} />
                  <span className="font-body" style={{ fontSize: "0.9vw", color: "#475569" }}>Jan</span>
                </div>
                <div className="flex flex-col items-center gap-[0.5vh] flex-1">
                  <div className="w-full rounded-t-[0.3vw]" style={{ height: "45%", background: "linear-gradient(to top, #4F46E5, #6366F1)" }} />
                  <span className="font-body" style={{ fontSize: "0.9vw", color: "#475569" }}>Fev</span>
                </div>
                <div className="flex flex-col items-center gap-[0.5vh] flex-1">
                  <div className="w-full rounded-t-[0.3vw]" style={{ height: "70%", background: "linear-gradient(to top, #4F46E5, #6366F1)" }} />
                  <span className="font-body" style={{ fontSize: "0.9vw", color: "#475569" }}>Mar</span>
                </div>
                <div className="flex flex-col items-center gap-[0.5vh] flex-1">
                  <div className="w-full rounded-t-[0.3vw]" style={{ height: "55%", background: "linear-gradient(to top, #4F46E5, #6366F1)" }} />
                  <span className="font-body" style={{ fontSize: "0.9vw", color: "#475569" }}>Abr</span>
                </div>
                <div className="flex flex-col items-center gap-[0.5vh] flex-1">
                  <div className="w-full rounded-t-[0.3vw]" style={{ height: "82%", background: "linear-gradient(to top, #7C3AED, #8B5CF6)" }} />
                  <span className="font-body" style={{ fontSize: "0.9vw", color: "#475569" }}>Mai</span>
                </div>
                <div className="flex flex-col items-center gap-[0.5vh] flex-1">
                  <div className="w-full rounded-t-[0.3vw]" style={{ height: "90%", background: "linear-gradient(to top, #7C3AED, #8B5CF6)" }} />
                  <span className="font-body" style={{ fontSize: "0.9vw", color: "#475569" }}>Jun</span>
                </div>
                <div className="flex flex-col items-center gap-[0.5vh] flex-1">
                  <div className="w-full rounded-t-[0.3vw]" style={{ height: "85%", background: "linear-gradient(to top, #7C3AED, #8B5CF6)" }} />
                  <span className="font-body" style={{ fontSize: "0.9vw", color: "#475569" }}>Jul</span>
                </div>
                <div className="flex flex-col items-center gap-[0.5vh] flex-1">
                  <div className="w-full rounded-t-[0.3vw]" style={{ height: "100%", background: "linear-gradient(to top, #F59E0B, #FCD34D)" }} />
                  <span className="font-body" style={{ fontSize: "0.9vw", color: "#F59E0B" }}>Ago</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-[1.5vw] flex-1">
              <div className="rounded-[1vw] p-[1.8vw]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Matérias com Mais Dificuldade</p>
                <div className="flex flex-col gap-[1vh]">
                  <div className="flex items-center gap-[0.8vw]">
                    <div className="w-[0.4vw] h-[4vh] rounded-full" style={{ background: "#EF4444" }} />
                    <div className="flex-1">
                      <p className="font-body" style={{ fontSize: "1.1vw", color: "#F1F5F9" }}>Física</p>
                      <div className="rounded-full h-[0.6vh] mt-[0.5vh]" style={{ background: "rgba(255,255,255,0.08)" }}>
                        <div className="h-full rounded-full" style={{ width: "73%", background: "#EF4444" }} />
                      </div>
                    </div>
                    <span className="font-display font-bold" style={{ fontSize: "1.2vw", color: "#EF4444" }}>73%</span>
                  </div>
                  <div className="flex items-center gap-[0.8vw]">
                    <div className="w-[0.4vw] h-[4vh] rounded-full" style={{ background: "#F59E0B" }} />
                    <div className="flex-1">
                      <p className="font-body" style={{ fontSize: "1.1vw", color: "#F1F5F9" }}>Química</p>
                      <div className="rounded-full h-[0.6vh] mt-[0.5vh]" style={{ background: "rgba(255,255,255,0.08)" }}>
                        <div className="h-full rounded-full" style={{ width: "61%", background: "#F59E0B" }} />
                      </div>
                    </div>
                    <span className="font-display font-bold" style={{ fontSize: "1.2vw", color: "#F59E0B" }}>61%</span>
                  </div>
                  <div className="flex items-center gap-[0.8vw]">
                    <div className="w-[0.4vw] h-[4vh] rounded-full" style={{ background: "#6366F1" }} />
                    <div className="flex-1">
                      <p className="font-body" style={{ fontSize: "1.1vw", color: "#F1F5F9" }}>Matemática</p>
                      <div className="rounded-full h-[0.6vh] mt-[0.5vh]" style={{ background: "rgba(255,255,255,0.08)" }}>
                        <div className="h-full rounded-full" style={{ width: "54%", background: "#6366F1" }} />
                      </div>
                    </div>
                    <span className="font-display font-bold" style={{ fontSize: "1.2vw", color: "#6366F1" }}>54%</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[1vw] p-[1.8vw]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Relatórios Exportáveis</p>
                <div className="flex flex-col gap-[1.2vh]">
                  <div className="flex items-center gap-[0.8vw]">
                    <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#6366F1" }} />
                    <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Progresso individual por aluno</p>
                  </div>
                  <div className="flex items-center gap-[0.8vw]">
                    <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#10B981" }} />
                    <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Comparativo entre turmas</p>
                  </div>
                  <div className="flex items-center gap-[0.8vw]">
                    <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#F59E0B" }} />
                    <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Análise de questões por dificuldade</p>
                  </div>
                  <div className="flex items-center gap-[0.8vw]">
                    <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#8B5CF6" }} />
                    <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Simulado ENEM preditivo — TRI</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-[1.5vw]">
            <div className="rounded-[1vw] p-[1.8vw] text-center" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))", border: "1px solid rgba(99,102,241,0.3)" }}>
              <p className="font-display font-extrabold" style={{ fontSize: "3.5vw", color: "#6366F1" }}>247K</p>
              <p className="font-body" style={{ fontSize: "1.1vw", color: "#94A3B8" }}>Sessões no último mês</p>
            </div>
            <div className="rounded-[1vw] p-[1.8vw] text-center" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <p className="font-display font-extrabold" style={{ fontSize: "3.5vw", color: "#10B981" }}>42min</p>
              <p className="font-body" style={{ fontSize: "1.1vw", color: "#94A3B8" }}>Tempo médio por sessão</p>
            </div>
            <div className="rounded-[1vw] p-[1.8vw] text-center" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <p className="font-display font-extrabold" style={{ fontSize: "3.5vw", color: "#F59E0B" }}>+18%</p>
              <p className="font-body" style={{ fontSize: "1.1vw", color: "#94A3B8" }}>Acertos após 30 dias de uso</p>
            </div>
            <div className="rounded-[1vw] p-[1.8vw] text-center flex-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="font-display font-extrabold" style={{ fontSize: "3.5vw", color: "#F1F5F9" }}>87%</p>
              <p className="font-body" style={{ fontSize: "1.1vw", color: "#94A3B8" }}>Taxa de conclusão de planos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-[8vw] py-[2vh] flex justify-between items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="font-display font-bold" style={{ fontSize: "1.4vw", color: "#6366F1" }}>StudyAI</span>
        <span className="font-body" style={{ fontSize: "1.2vw", color: "#475569" }}>12 / 17</span>
        <span className="font-body" style={{ fontSize: "1.3vw", color: "#475569" }}>study.ia.br</span>
      </div>
    </div>
  );
}
