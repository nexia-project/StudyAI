export default function Slide3_ProfessorTiagao() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0F172A" }}>
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 5vh, rgba(99,102,241,0.3) 5vh, rgba(99,102,241,0.3) calc(5vh + 1px))" }} />
      <div className="absolute right-0 top-0 w-[40vw] h-full opacity-8 pointer-events-none" style={{ background: "linear-gradient(to left, rgba(99,102,241,0.12), transparent)" }} />

      <div className="relative h-full flex px-[8vw] py-[7vh] gap-[5vw]">
        <div className="flex flex-col justify-center w-[52%]">
          <p className="font-display font-semibold tracking-widest uppercase mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#6366F1" }}>Agente de IA</p>
          <h2 className="font-display font-extrabold tracking-tight leading-tight mb-[2.5vh]" style={{ fontSize: "4.5vw", color: "#F1F5F9" }}>
            Professor Tiagão
          </h2>
          <div className="w-[5vw] h-[0.3vh] mb-[3vh]" style={{ background: "#F59E0B" }} />
          <p className="font-body leading-relaxed" style={{ fontSize: "1.6vw", color: "#94A3B8" }}>
            Tutor por voz com memória persistente, capaz de navegar o sistema, criar planos e interpretar imagens de questões fotografadas pelo aluno.
          </p>
        </div>

        <div className="flex flex-col justify-center gap-[2vh] flex-1">
          <div className="rounded-[1vw] px-[2.5vw] py-[2vh] flex items-center gap-[1.8vw]" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)" }}>
            <div className="w-[3vw] h-[3vw] rounded-[0.6vw] flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(99,102,241,0.25)", border: "1.5px solid #6366F1" }}>
              <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.6vw", height: "1.6vw" }}>
                <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z" fill="#6366F1" opacity="0.9"/>
                <path d="M5 10a7 7 0 0 0 14 0" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="12" y1="17" x2="12" y2="21" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="9" y1="21" x2="15" y2="21" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p className="font-display font-bold" style={{ fontSize: "1.6vw", color: "#F1F5F9" }}>Voz Natural com ElevenLabs</p>
              <p className="font-body" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Daniel voice — PT-BR, warm e expressivo</p>
            </div>
          </div>

          <div className="rounded-[1vw] px-[2.5vw] py-[2vh] flex items-center gap-[1.8vw]" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)" }}>
            <div className="w-[3vw] h-[3vw] rounded-[0.6vw] flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(99,102,241,0.25)", border: "1.5px solid #6366F1" }}>
              <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.6vw", height: "1.6vw" }}>
                <path d="M12 3C8 3 5 6 5 10v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4c0-4-3-7-7-7z" fill="#6366F1" opacity="0.5"/>
                <circle cx="12" cy="10" r="3" fill="#6366F1"/>
                <path d="M6 21c0-2.5 2.7-4 6-4s6 1.5 6 4" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p className="font-display font-bold" style={{ fontSize: "1.6vw", color: "#F1F5F9" }}>Memória Persistente</p>
              <p className="font-body" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Lembra progresso, preferências e histórico de estudo</p>
            </div>
          </div>

          <div className="rounded-[1vw] px-[2.5vw] py-[2vh] flex items-center gap-[1.8vw]" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)" }}>
            <div className="w-[3vw] h-[3vw] rounded-[0.6vw] flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(99,102,241,0.25)", border: "1.5px solid #6366F1" }}>
              <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.6vw", height: "1.6vw" }}>
                <rect x="3" y="3" width="18" height="14" rx="2" stroke="#6366F1" strokeWidth="1.5"/>
                <path d="M8 21h8M12 17v4" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M7 8l3 3 4-5" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="font-display font-bold" style={{ fontSize: "1.6vw", color: "#F1F5F9" }}>Function Calling</p>
              <p className="font-body" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Navega, cria planos, inicia simulados e grava flashcards</p>
            </div>
          </div>

          <div className="rounded-[1vw] px-[2.5vw] py-[2vh] flex items-center gap-[1.8vw]" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <div className="w-[3vw] h-[3vw] rounded-[0.6vw] flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(245,158,11,0.2)", border: "1.5px solid #F59E0B" }}>
              <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.6vw", height: "1.6vw" }}>
                <rect x="5" y="3" width="14" height="18" rx="2" stroke="#F59E0B" strokeWidth="1.5"/>
                <circle cx="12" cy="10" r="3.5" fill="#F59E0B" opacity="0.7"/>
                <path d="M8 18c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="16.5" cy="5.5" r="2.5" fill="#F59E0B" opacity="0.5"/>
                <path d="M15.5 5.5h2M16.5 4.5v2" stroke="#F59E0B" strokeWidth="1" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p className="font-display font-bold" style={{ fontSize: "1.6vw", color: "#F1F5F9" }}>Câmera Multimodal</p>
              <p className="font-body" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Aluno fotografa questão — Gemini analisa e explica</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-[8vw] py-[2vh] flex justify-between items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="font-display font-bold" style={{ fontSize: "1.4vw", color: "#6366F1" }}>StudyAI</span>
        <span className="font-body" style={{ fontSize: "1.2vw", color: "#475569" }}>03 / 17</span>
        <span className="font-body" style={{ fontSize: "1.3vw", color: "#475569" }}>study.ia.br</span>
      </div>
    </div>
  );
}
