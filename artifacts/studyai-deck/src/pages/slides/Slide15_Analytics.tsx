export default function Slide15_Analytics() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0F172A" }}>
      <div className="absolute inset-0 opacity-8 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 100%, rgba(99,102,241,0.2) 0%, transparent 60%)" }} />

      <div className="relative h-full flex flex-col px-[8vw] pt-[5vh] pb-[4vh]">
        <div className="mb-[2.5vh]">
          <p className="font-display font-semibold tracking-widest uppercase mb-[0.8vh]" style={{ fontSize: "1.3vw", color: "#6366F1" }}>Inteligencia de Dados</p>
          <h2 className="font-display font-extrabold tracking-tight" style={{ fontSize: "3.5vw", color: "#F1F5F9" }}>Analytics e Relatorios Gerais</h2>
        </div>

        <div className="grid grid-cols-4 gap-[1.5vw] mb-[2vh]">
          <div className="rounded-[1vw] p-[1.8vw] text-center" style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>
            <p className="font-display font-extrabold" style={{ fontSize: "2.8vw", color: "#6366F1" }}>14.3k</p>
            <p className="font-body" style={{ fontSize: "1.1vw", color: "#94A3B8" }}>Usuarios cadastrados</p>
            <p className="font-body font-medium mt-[0.5vh]" style={{ fontSize: "1vw", color: "#10B981" }}>+18% este mes</p>
          </div>
          <div className="rounded-[1vw] p-[1.8vw] text-center" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}>
            <p className="font-display font-extrabold" style={{ fontSize: "2.8vw", color: "#10B981" }}>87k</p>
            <p className="font-body" style={{ fontSize: "1.1vw", color: "#94A3B8" }}>Sessoes de estudo</p>
            <p className="font-body font-medium mt-[0.5vh]" style={{ fontSize: "1vw", color: "#10B981" }}>+31% vs. mes anterior</p>
          </div>
          <div className="rounded-[1vw] p-[1.8vw] text-center" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <p className="font-display font-extrabold" style={{ fontSize: "2.8vw", color: "#F59E0B" }}>2.1M</p>
            <p className="font-body" style={{ fontSize: "1.1vw", color: "#94A3B8" }}>Questoes respondidas</p>
            <p className="font-body font-medium mt-[0.5vh]" style={{ fontSize: "1vw", color: "#10B981" }}>+45% este mes</p>
          </div>
          <div className="rounded-[1vw] p-[1.8vw] text-center" style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)" }}>
            <p className="font-display font-extrabold" style={{ fontSize: "2.8vw", color: "#8B5CF6" }}>76%</p>
            <p className="font-body" style={{ fontSize: "1.1vw", color: "#94A3B8" }}>Taxa de retencao 30d</p>
            <p className="font-body font-medium mt-[0.5vh]" style={{ fontSize: "1vw", color: "#10B981" }}>Acima da media EdTech</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-[1.5vw] flex-1">
          <div className="col-span-2 rounded-[1vw] p-[1.8vw]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <p className="font-display font-bold mb-[2vh]" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Crescimento de Usuarios — Ultimos 6 Meses</p>
            <div className="flex items-end gap-[1.5vw] h-[16vh]">
              <div className="flex flex-col items-center gap-[0.8vh] flex-1">
                <span className="font-body" style={{ fontSize: "1vw", color: "#64748B" }}>2.100</span>
                <div className="w-full rounded-t-[0.4vw]" style={{ height: "25%", background: "rgba(99,102,241,0.4)" }} />
                <span className="font-body" style={{ fontSize: "1vw", color: "#64748B" }}>Nov</span>
              </div>
              <div className="flex flex-col items-center gap-[0.8vh] flex-1">
                <span className="font-body" style={{ fontSize: "1vw", color: "#64748B" }}>4.800</span>
                <div className="w-full rounded-t-[0.4vw]" style={{ height: "42%", background: "rgba(99,102,241,0.5)" }} />
                <span className="font-body" style={{ fontSize: "1vw", color: "#64748B" }}>Dez</span>
              </div>
              <div className="flex flex-col items-center gap-[0.8vh] flex-1">
                <span className="font-body" style={{ fontSize: "1vw", color: "#64748B" }}>7.200</span>
                <div className="w-full rounded-t-[0.4vw]" style={{ height: "58%", background: "rgba(99,102,241,0.6)" }} />
                <span className="font-body" style={{ fontSize: "1vw", color: "#64748B" }}>Jan</span>
              </div>
              <div className="flex flex-col items-center gap-[0.8vh] flex-1">
                <span className="font-body" style={{ fontSize: "1vw", color: "#64748B" }}>9.400</span>
                <div className="w-full rounded-t-[0.4vw]" style={{ height: "72%", background: "rgba(99,102,241,0.7)" }} />
                <span className="font-body" style={{ fontSize: "1vw", color: "#64748B" }}>Fev</span>
              </div>
              <div className="flex flex-col items-center gap-[0.8vh] flex-1">
                <span className="font-body" style={{ fontSize: "1vw", color: "#64748B" }}>11.900</span>
                <div className="w-full rounded-t-[0.4vw]" style={{ height: "87%", background: "rgba(99,102,241,0.85)" }} />
                <span className="font-body" style={{ fontSize: "1vw", color: "#64748B" }}>Mar</span>
              </div>
              <div className="flex flex-col items-center gap-[0.8vh] flex-1">
                <span className="font-display font-bold" style={{ fontSize: "1vw", color: "#6366F1" }}>14.320</span>
                <div className="w-full rounded-t-[0.4vw]" style={{ height: "100%", background: "linear-gradient(180deg, #6366F1, #4F46E5)" }} />
                <span className="font-body font-medium" style={{ fontSize: "1vw", color: "#6366F1" }}>Abr</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-[1.5vw]">
            <div className="rounded-[1vw] p-[1.8vw]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Engajamento por Modulo</p>
              <div className="flex flex-col gap-[1vh]">
                <div className="flex items-center gap-[0.8vw]">
                  <span className="font-body w-[8vw]" style={{ fontSize: "1vw", color: "#CBD5E1" }}>Prof. Tiagao</span>
                  <div className="flex-1 rounded-full h-[0.7vh]" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full" style={{ width: "94%", background: "#6366F1" }} />
                  </div>
                  <span className="font-body" style={{ fontSize: "1vw", color: "#6366F1" }}>94%</span>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <span className="font-body w-[8vw]" style={{ fontSize: "1vw", color: "#CBD5E1" }}>Flashcards</span>
                  <div className="flex-1 rounded-full h-[0.7vh]" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full" style={{ width: "78%", background: "#10B981" }} />
                  </div>
                  <span className="font-body" style={{ fontSize: "1vw", color: "#10B981" }}>78%</span>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <span className="font-body w-[8vw]" style={{ fontSize: "1vw", color: "#CBD5E1" }}>Simulados</span>
                  <div className="flex-1 rounded-full h-[0.7vh]" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full" style={{ width: "71%", background: "#F59E0B" }} />
                  </div>
                  <span className="font-body" style={{ fontSize: "1vw", color: "#F59E0B" }}>71%</span>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <span className="font-body w-[8vw]" style={{ fontSize: "1vw", color: "#CBD5E1" }}>Caderno</span>
                  <div className="flex-1 rounded-full h-[0.7vh]" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full" style={{ width: "63%", background: "#8B5CF6" }} />
                  </div>
                  <span className="font-body" style={{ fontSize: "1vw", color: "#8B5CF6" }}>63%</span>
                </div>
              </div>
            </div>

            <div className="rounded-[1vw] p-[1.8vw] flex-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>NPS e Satisfacao</p>
              <div className="text-center mb-[1.5vh]">
                <p className="font-display font-extrabold" style={{ fontSize: "3.5vw", color: "#10B981" }}>+74</p>
                <p className="font-body" style={{ fontSize: "1.1vw", color: "#94A3B8" }}>Net Promoter Score</p>
              </div>
              <div className="flex flex-col gap-[0.8vh]">
                <div className="flex justify-between">
                  <span className="font-body" style={{ fontSize: "1vw", color: "#10B981" }}>Promotores</span>
                  <span className="font-display font-bold" style={{ fontSize: "1vw", color: "#10B981" }}>82%</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-body" style={{ fontSize: "1vw", color: "#F59E0B" }}>Neutros</span>
                  <span className="font-display font-bold" style={{ fontSize: "1vw", color: "#F59E0B" }}>10%</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-body" style={{ fontSize: "1vw", color: "#EF4444" }}>Detratores</span>
                  <span className="font-display font-bold" style={{ fontSize: "1vw", color: "#EF4444" }}>8%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-[8vw] py-[2vh] flex justify-between items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="font-display font-bold" style={{ fontSize: "1.4vw", color: "#6366F1" }}>StudyAI</span>
        <span className="font-body" style={{ fontSize: "1.3vw", color: "#475569" }}>study.ia.br</span>
      </div>
    </div>
  );
}
