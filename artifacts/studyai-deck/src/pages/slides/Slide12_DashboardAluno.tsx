export default function Slide12_DashboardAluno() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0F172A" }}>
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(99,102,241,0.3) 0%, transparent 60%)" }} />

      <div className="relative h-full flex flex-col px-[8vw] pt-[5vh] pb-[4vh]">
        <div className="mb-[2.5vh]">
          <p className="font-display font-semibold tracking-widest uppercase mb-[0.8vh]" style={{ fontSize: "1.3vw", color: "#6366F1" }}>Painel do Estudante</p>
          <h2 className="font-display font-extrabold tracking-tight" style={{ fontSize: "3.5vw", color: "#F1F5F9" }}>Dashboard do Aluno</h2>
        </div>

        <div className="grid grid-cols-3 gap-[1.5vw] flex-1">
          <div className="col-span-2 grid grid-rows-2 gap-[1.5vw]">
            <div className="rounded-[1vw] p-[1.8vw]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Progresso por Matéria</p>
              <div className="flex flex-col gap-[1vh]">
                <div className="flex items-center gap-[1vw]">
                  <span className="font-body w-[8vw] flex-shrink-0" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Matemática</span>
                  <div className="flex-1 rounded-full h-[1vh]" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full" style={{ width: "78%", background: "linear-gradient(90deg, #6366F1, #8B5CF6)" }} />
                  </div>
                  <span className="font-display font-bold w-[3vw] text-right" style={{ fontSize: "1.2vw", color: "#6366F1" }}>78%</span>
                </div>
                <div className="flex items-center gap-[1vw]">
                  <span className="font-body w-[8vw] flex-shrink-0" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Português</span>
                  <div className="flex-1 rounded-full h-[1vh]" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full" style={{ width: "91%", background: "linear-gradient(90deg, #10B981, #0D9488)" }} />
                  </div>
                  <span className="font-display font-bold w-[3vw] text-right" style={{ fontSize: "1.2vw", color: "#10B981" }}>91%</span>
                </div>
                <div className="flex items-center gap-[1vw]">
                  <span className="font-body w-[8vw] flex-shrink-0" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Biologia</span>
                  <div className="flex-1 rounded-full h-[1vh]" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full" style={{ width: "65%", background: "linear-gradient(90deg, #F59E0B, #D97706)" }} />
                  </div>
                  <span className="font-display font-bold w-[3vw] text-right" style={{ fontSize: "1.2vw", color: "#F59E0B" }}>65%</span>
                </div>
                <div className="flex items-center gap-[1vw]">
                  <span className="font-body w-[8vw] flex-shrink-0" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>História</span>
                  <div className="flex-1 rounded-full h-[1vh]" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full" style={{ width: "83%", background: "linear-gradient(90deg, #EF4444, #DC2626)" }} />
                  </div>
                  <span className="font-display font-bold w-[3vw] text-right" style={{ fontSize: "1.2vw", color: "#EF4444" }}>83%</span>
                </div>
              </div>
            </div>

            <div className="rounded-[1vw] p-[1.8vw]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Heatmap de Estudo — Últimos 30 Dias</p>
              <div className="flex gap-[0.4vw] flex-wrap">
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(99,102,241,0.2)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(99,102,241,0.6)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(99,102,241,1)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(99,102,241,0.4)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(255,255,255,0.06)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(99,102,241,0.8)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(99,102,241,1)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(99,102,241,0.3)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(99,102,241,0.7)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(99,102,241,1)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(99,102,241,0.5)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(99,102,241,0.2)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(255,255,255,0.06)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(99,102,241,0.9)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(99,102,241,1)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(99,102,241,0.6)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(99,102,241,0.4)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(99,102,241,1)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(99,102,241,0.8)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(99,102,241,0.3)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(255,255,255,0.06)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(99,102,241,0.7)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(99,102,241,1)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(99,102,241,0.5)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(99,102,241,0.9)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(99,102,241,0.2)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(99,102,241,0.6)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(99,102,241,1)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(99,102,241,0.4)" }} />
                <div className="rounded-[0.2vw]" style={{ width: "2.4vw", height: "2.4vw", background: "rgba(99,102,241,0.8)" }} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-[1.5vw]">
            <div className="rounded-[1vw] p-[1.8vw] text-center" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))", border: "1px solid rgba(99,102,241,0.3)" }}>
              <p className="font-display font-extrabold" style={{ fontSize: "3vw", color: "#F59E0B" }}>2.840</p>
              <p className="font-body" style={{ fontSize: "1.1vw", color: "#94A3B8" }}>XP acumulado</p>
              <div className="mt-[1vh] rounded-full h-[0.8vh]" style={{ background: "rgba(255,255,255,0.1)" }}>
                <div className="h-full rounded-full" style={{ width: "68%", background: "linear-gradient(90deg, #F59E0B, #F97316)" }} />
              </div>
              <p className="font-body mt-[0.5vh]" style={{ fontSize: "1vw", color: "#64748B" }}>68% para Nível 12</p>
            </div>

            <div className="rounded-[1vw] p-[1.8vw] flex-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Próximas Revisões</p>
              <div className="flex flex-col gap-[1.2vh]">
                <div className="flex items-center gap-[1vw] rounded-[0.5vw] p-[0.8vw]" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <div className="w-[0.8vw] h-[0.8vw] rounded-full flex-shrink-0" style={{ background: "#EF4444" }} />
                  <div className="flex-1">
                    <p className="font-body" style={{ fontSize: "1.1vw", color: "#F1F5F9" }}>Probabilidade — Mat.</p>
                    <p className="font-body" style={{ fontSize: "0.9vw", color: "#64748B" }}>Hoje</p>
                  </div>
                </div>
                <div className="flex items-center gap-[1vw] rounded-[0.5vw] p-[0.8vw]" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <div className="w-[0.8vw] h-[0.8vw] rounded-full flex-shrink-0" style={{ background: "#F59E0B" }} />
                  <div className="flex-1">
                    <p className="font-body" style={{ fontSize: "1.1vw", color: "#F1F5F9" }}>Célula Animal — Bio.</p>
                    <p className="font-body" style={{ fontSize: "0.9vw", color: "#64748B" }}>Amanhã</p>
                  </div>
                </div>
                <div className="flex items-center gap-[1vw] rounded-[0.5vw] p-[0.8vw]" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <div className="w-[0.8vw] h-[0.8vw] rounded-full flex-shrink-0" style={{ background: "#6366F1" }} />
                  <div className="flex-1">
                    <p className="font-body" style={{ fontSize: "1.1vw", color: "#F1F5F9" }}>Iluminismo — Hist.</p>
                    <p className="font-body" style={{ fontSize: "0.9vw", color: "#64748B" }}>Em 3 dias</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1vw] p-[1.8vw]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="font-display font-bold mb-[1vh]" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Conquistas</p>
              <div className="flex gap-[0.8vw]">
                <div className="w-[2.5vw] h-[2.5vw] rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
                  <div className="w-[1.2vw] h-[1.2vw] rounded-full" style={{ background: "rgba(255,255,255,0.8)" }} />
                </div>
                <div className="w-[2.5vw] h-[2.5vw] rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6366F1, #4F46E5)" }}>
                  <div className="w-[1.2vw] h-[1.2vw] rounded-full" style={{ background: "rgba(255,255,255,0.8)" }} />
                </div>
                <div className="w-[2.5vw] h-[2.5vw] rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #10B981, #0D9488)" }}>
                  <div className="w-[1.2vw] h-[1.2vw] rounded-full" style={{ background: "rgba(255,255,255,0.8)" }} />
                </div>
                <div className="w-[2.5vw] h-[2.5vw] rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="w-[1.2vw] h-[1.2vw] rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
                </div>
              </div>
              <p className="font-body mt-[0.8vh]" style={{ fontSize: "1vw", color: "#64748B" }}>3 de 12 conquistas desbloqueadas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-[8vw] py-[2vh] flex justify-between items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="font-display font-bold" style={{ fontSize: "1.4vw", color: "#6366F1" }}>StudyAI</span>
        <span className="font-body" style={{ fontSize: "1.2vw", color: "#475569" }}>09 / 17</span>
        <span className="font-body" style={{ fontSize: "1.3vw", color: "#475569" }}>study.ia.br</span>
      </div>
    </div>
  );
}
