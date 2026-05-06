export default function Slide2_Plataforma() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0F172A" }}>
      <div className="absolute top-0 left-0 w-[35vw] h-[40vh] opacity-10 pointer-events-none" style={{ background: "radial-gradient(ellipse, #6366F1 0%, transparent 70%)" }} />

      <div className="relative h-full flex flex-col px-[8vw] py-[7vh]">
        <div className="mb-[4vh]">
          <p className="font-display font-semibold tracking-widest uppercase mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#6366F1" }}>A Plataforma</p>
          <h2 className="font-display font-extrabold tracking-tight leading-tight" style={{ fontSize: "4vw", color: "#F1F5F9" }}>
            Educação completa com Inteligência Artificial
          </h2>
        </div>

        <div className="flex gap-[2.5vw] flex-1">
          <div className="flex-1 rounded-[1.2vw] p-[3vw] flex flex-col justify-between" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)" }}>
            <div className="w-[3.5vw] h-[3.5vw] rounded-[0.8vw] flex items-center justify-center mb-[2.5vh]" style={{ background: "rgba(99,102,241,0.2)" }}>
              <svg width="1.8vw" height="1.8vw" viewBox="0 0 24 24" fill="none" style={{ width: "1.8vw", height: "1.8vw" }}>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 2.61 1.38 4.88 3.43 6.21L8 18h8l-.43-2.79C17.62 13.88 19 11.61 19 9c0-3.87-3.13-7-7-7z" fill="#6366F1" opacity="0.8"/>
                <rect x="9" y="18" width="6" height="2" rx="1" fill="#6366F1"/>
                <rect x="10" y="20" width="4" height="2" rx="1" fill="#6366F1"/>
              </svg>
            </div>
            <div>
              <h3 className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "2vw", color: "#F1F5F9" }}>Tutor por Voz</h3>
              <p className="font-body leading-relaxed" style={{ fontSize: "1.5vw", color: "#94A3B8" }}>Professor Tiagão fala com o aluno, lembra o progresso e age de forma proativa</p>
            </div>
          </div>

          <div className="flex-1 rounded-[1.2vw] p-[3vw] flex flex-col justify-between" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <div className="w-[3.5vw] h-[3.5vw] rounded-[0.8vw] flex items-center justify-center mb-[2.5vh]" style={{ background: "rgba(245,158,11,0.15)" }}>
              <svg width="1.8vw" height="1.8vw" viewBox="0 0 24 24" fill="none" style={{ width: "1.8vw", height: "1.8vw" }}>
                <rect x="3" y="3" width="8" height="8" rx="1.5" fill="#F59E0B" opacity="0.9"/>
                <rect x="13" y="3" width="8" height="8" rx="1.5" fill="#F59E0B" opacity="0.6"/>
                <rect x="3" y="13" width="8" height="8" rx="1.5" fill="#F59E0B" opacity="0.6"/>
                <rect x="13" y="13" width="8" height="8" rx="1.5" fill="#F59E0B" opacity="0.3"/>
              </svg>
            </div>
            <div>
              <h3 className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "2vw", color: "#F1F5F9" }}>Módulos Completos</h3>
              <p className="font-body leading-relaxed" style={{ fontSize: "1.5vw", color: "#94A3B8" }}>Plano de estudos, simulados, flashcards, redação, caderno digital e mapas mentais</p>
            </div>
          </div>

          <div className="flex-1 rounded-[1.2vw] p-[3vw] flex flex-col justify-between" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <div className="w-[3.5vw] h-[3.5vw] rounded-[0.8vw] flex items-center justify-center mb-[2.5vh]" style={{ background: "rgba(16,185,129,0.15)" }}>
              <svg width="1.8vw" height="1.8vw" viewBox="0 0 24 24" fill="none" style={{ width: "1.8vw", height: "1.8vw" }}>
                <circle cx="12" cy="12" r="3.5" fill="#10B981"/>
                <circle cx="4.5" cy="7" r="2.5" fill="#10B981" opacity="0.6"/>
                <circle cx="19.5" cy="7" r="2.5" fill="#10B981" opacity="0.6"/>
                <circle cx="4.5" cy="17" r="2.5" fill="#10B981" opacity="0.4"/>
                <circle cx="19.5" cy="17" r="2.5" fill="#10B981" opacity="0.4"/>
                <line x1="12" y1="8.5" x2="4.5" y2="9" stroke="#10B981" strokeWidth="1" opacity="0.5"/>
                <line x1="12" y1="8.5" x2="19.5" y2="9" stroke="#10B981" strokeWidth="1" opacity="0.5"/>
                <line x1="12" y1="15.5" x2="4.5" y2="15" stroke="#10B981" strokeWidth="1" opacity="0.4"/>
                <line x1="12" y1="15.5" x2="19.5" y2="15" stroke="#10B981" strokeWidth="1" opacity="0.4"/>
              </svg>
            </div>
            <div>
              <h3 className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "2vw", color: "#F1F5F9" }}>IA Multi-modelo</h3>
              <p className="font-body leading-relaxed" style={{ fontSize: "1.5vw", color: "#94A3B8" }}>DeepSeek, Claude, Gemini, ElevenLabs e OpenAI — arquitetura otimizada por custo e qualidade</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-[8vw] py-[2vh] flex justify-between items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="font-display font-bold" style={{ fontSize: "1.4vw", color: "#6366F1" }}>StudyAI</span>
        <span className="font-body" style={{ fontSize: "1.2vw", color: "#475569" }}>02 / 17</span>
        <span className="font-body" style={{ fontSize: "1.3vw", color: "#475569" }}>study.ia.br</span>
      </div>
    </div>
  );
}
