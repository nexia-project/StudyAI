export default function Slide3_ProfessorTiagao() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0F172A" }}>
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 5vh, rgba(99,102,241,0.3) 5vh, rgba(99,102,241,0.3) calc(5vh + 1px))" }} />
      <div className="absolute right-0 top-0 w-[40vw] h-full opacity-8 pointer-events-none" style={{ background: "linear-gradient(to left, rgba(99,102,241,0.12), transparent)" }} />

      <div className="relative h-full flex px-[8vw] py-[7vh] gap-[5vw]">
        <div className="flex flex-col justify-center w-[52%]">
          <p className="font-display font-semibold tracking-widest uppercase mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#6366F1" }}>Agente de IA</p>
          <h2 className="font-display font-extrabold tracking-tight leading-tight mb-[2.5vh]" style={{ fontSize: "4.5vw", color: "#F1F5F9" }}>
            Professor Tiagao
          </h2>
          <div className="w-[5vw] h-[0.3vh] mb-[3vh]" style={{ background: "#F59E0B" }} />
          <p className="font-body leading-relaxed" style={{ fontSize: "1.6vw", color: "#94A3B8" }}>
            Tutor por voz com memoria persistente, capaz de navegar o sistema, criar planos e interpretar imagens de questoes fotografadas pelo aluno.
          </p>
        </div>

        <div className="flex flex-col justify-center gap-[2vh] flex-1">
          <div className="rounded-[1vw] px-[2.5vw] py-[2vh] flex items-center gap-[1.8vw]" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)" }}>
            <div className="w-[2.8vw] h-[2.8vw] rounded-full flex-shrink-0" style={{ background: "rgba(99,102,241,0.25)", border: "2px solid #6366F1" }} />
            <div>
              <p className="font-display font-bold" style={{ fontSize: "1.6vw", color: "#F1F5F9" }}>Voz Natural com ElevenLabs</p>
              <p className="font-body" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Daniel voice — PT-BR, warm e expressivo</p>
            </div>
          </div>

          <div className="rounded-[1vw] px-[2.5vw] py-[2vh] flex items-center gap-[1.8vw]" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)" }}>
            <div className="w-[2.8vw] h-[2.8vw] rounded-full flex-shrink-0" style={{ background: "rgba(99,102,241,0.25)", border: "2px solid #6366F1" }} />
            <div>
              <p className="font-display font-bold" style={{ fontSize: "1.6vw", color: "#F1F5F9" }}>Memoria Persistente</p>
              <p className="font-body" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Lembra progresso, preferencias e historico de estudo</p>
            </div>
          </div>

          <div className="rounded-[1vw] px-[2.5vw] py-[2vh] flex items-center gap-[1.8vw]" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)" }}>
            <div className="w-[2.8vw] h-[2.8vw] rounded-full flex-shrink-0" style={{ background: "rgba(99,102,241,0.25)", border: "2px solid #6366F1" }} />
            <div>
              <p className="font-display font-bold" style={{ fontSize: "1.6vw", color: "#F1F5F9" }}>Function Calling</p>
              <p className="font-body" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Navega, cria planos, inicia simulados e grava flashcards</p>
            </div>
          </div>

          <div className="rounded-[1vw] px-[2.5vw] py-[2vh] flex items-center gap-[1.8vw]" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <div className="w-[2.8vw] h-[2.8vw] rounded-full flex-shrink-0" style={{ background: "rgba(245,158,11,0.2)", border: "2px solid #F59E0B" }} />
            <div>
              <p className="font-display font-bold" style={{ fontSize: "1.6vw", color: "#F1F5F9" }}>Camera Multimodal</p>
              <p className="font-body" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Aluno fotografa questao — Gemini analisa e explica</p>
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
