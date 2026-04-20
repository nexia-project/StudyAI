export default function Slide16_Negocio() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0F172A" }}>
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 60% at 80% 30%, rgba(245,158,11,0.2) 0%, transparent 60%)" }} />

      <div className="relative h-full flex flex-col px-[8vw] pt-[6vh] pb-[5vh]">
        <div className="mb-[3.5vh]">
          <p className="font-display font-semibold tracking-widest uppercase mb-[1vh]" style={{ fontSize: "1.3vw", color: "#F59E0B" }}>Monetizacao</p>
          <h2 className="font-display font-extrabold tracking-tight" style={{ fontSize: "3.8vw", color: "#F1F5F9" }}>Modelo de Negocio</h2>
        </div>

        <div className="grid grid-cols-3 gap-[2vw] flex-1">
          <div className="rounded-[1.2vw] p-[2.2vw] flex flex-col" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <div className="mb-[1.5vh]">
              <p className="font-display font-bold tracking-wider uppercase mb-[0.5vh]" style={{ fontSize: "1.2vw", color: "#94A3B8" }}>Gratuito</p>
              <p className="font-display font-extrabold" style={{ fontSize: "2.8vw", color: "#F1F5F9" }}>R$0</p>
              <p className="font-body" style={{ fontSize: "1.1vw", color: "#64748B" }}>Para sempre</p>
            </div>
            <div className="w-full h-[0.15vh] mb-[2vh]" style={{ background: "rgba(255,255,255,0.1)" }} />
            <div className="flex flex-col gap-[1.2vh] flex-1">
              <div className="flex items-center gap-[0.8vw]">
                <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#10B981" }} />
                <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Professor Tiagao limitado (5 msg/dia)</p>
              </div>
              <div className="flex items-center gap-[0.8vw]">
                <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#10B981" }} />
                <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>10 flashcards por semana</p>
              </div>
              <div className="flex items-center gap-[0.8vw]">
                <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#10B981" }} />
                <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>2 simulados mensais</p>
              </div>
              <div className="flex items-center gap-[0.8vw]">
                <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#64748B" }} />
                <p className="font-body" style={{ fontSize: "1.2vw", color: "#475569" }}>Caderno sem RAG</p>
              </div>
              <div className="flex items-center gap-[0.8vw]">
                <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#64748B" }} />
                <p className="font-body" style={{ fontSize: "1.2vw", color: "#475569" }}>Sem voz sintetizada</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.2vw] p-[2.2vw] flex flex-col relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))", border: "2px solid rgba(99,102,241,0.5)" }}>
            <div className="absolute top-[2vh] right-[1.5vw] px-[1vw] py-[0.4vh] rounded-full font-display font-bold" style={{ fontSize: "1vw", background: "#6366F1", color: "#F1F5F9" }}>MAIS POPULAR</div>
            <div className="mb-[1.5vh]">
              <p className="font-display font-bold tracking-wider uppercase mb-[0.5vh]" style={{ fontSize: "1.2vw", color: "#6366F1" }}>Pro</p>
              <p className="font-display font-extrabold" style={{ fontSize: "2.8vw", color: "#F1F5F9" }}>R$39</p>
              <p className="font-body" style={{ fontSize: "1.1vw", color: "#94A3B8" }}>por mes — cancele quando quiser</p>
            </div>
            <div className="w-full h-[0.15vh] mb-[2vh]" style={{ background: "rgba(99,102,241,0.3)" }} />
            <div className="flex flex-col gap-[1.2vh] flex-1">
              <div className="flex items-center gap-[0.8vw]">
                <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#6366F1" }} />
                <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Professor Tiagao ilimitado com voz</p>
              </div>
              <div className="flex items-center gap-[0.8vw]">
                <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#6366F1" }} />
                <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Flashcards ilimitados + SM-2</p>
              </div>
              <div className="flex items-center gap-[0.8vw]">
                <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#6366F1" }} />
                <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Simulados adaptativos ilimitados</p>
              </div>
              <div className="flex items-center gap-[0.8vw]">
                <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#6366F1" }} />
                <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Caderno RAG com upload de PDF</p>
              </div>
              <div className="flex items-center gap-[0.8vw]">
                <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#6366F1" }} />
                <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Correcao de redacao ENEM ilimitada</p>
              </div>
              <div className="flex items-center gap-[0.8vw]">
                <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#6366F1" }} />
                <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Camera multimodal para questoes</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.2vw] p-[2.2vw] flex flex-col" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <div className="mb-[1.5vh]">
              <p className="font-display font-bold tracking-wider uppercase mb-[0.5vh]" style={{ fontSize: "1.2vw", color: "#F59E0B" }}>Escola / B2B</p>
              <p className="font-display font-extrabold" style={{ fontSize: "2.8vw", color: "#F1F5F9" }}>Sob consulta</p>
              <p className="font-body" style={{ fontSize: "1.1vw", color: "#94A3B8" }}>Por aluno / por mes</p>
            </div>
            <div className="w-full h-[0.15vh] mb-[2vh]" style={{ background: "rgba(245,158,11,0.2)" }} />
            <div className="flex flex-col gap-[1.2vh] flex-1">
              <div className="flex items-center gap-[0.8vw]">
                <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#F59E0B" }} />
                <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Tudo do plano Pro para cada aluno</p>
              </div>
              <div className="flex items-center gap-[0.8vw]">
                <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#F59E0B" }} />
                <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Dashboard do professor e diretor</p>
              </div>
              <div className="flex items-center gap-[0.8vw]">
                <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#F59E0B" }} />
                <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Painel admin completo da escola</p>
              </div>
              <div className="flex items-center gap-[0.8vw]">
                <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#F59E0B" }} />
                <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Upload de apostilas e curriculo proprio</p>
              </div>
              <div className="flex items-center gap-[0.8vw]">
                <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#F59E0B" }} />
                <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Relatorios automaticos para pais</p>
              </div>
              <div className="flex items-center gap-[0.8vw]">
                <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#F59E0B" }} />
                <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>SLA e suporte dedicado</p>
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
