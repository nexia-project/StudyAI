export default function Slide2_Plataforma() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0F172A" }}>
      <div className="absolute top-0 left-0 w-[35vw] h-[40vh] opacity-10 pointer-events-none" style={{ background: "radial-gradient(ellipse, #6366F1 0%, transparent 70%)" }} />

      <div className="relative h-full flex flex-col px-[8vw] py-[7vh]">
        <div className="mb-[4vh]">
          <p className="font-display font-semibold tracking-widest uppercase mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#6366F1" }}>A Plataforma</p>
          <h2 className="font-display font-extrabold tracking-tight leading-tight" style={{ fontSize: "4vw", color: "#F1F5F9" }}>
            Educacao completa com Inteligencia Artificial
          </h2>
        </div>

        <div className="flex gap-[2.5vw] flex-1">
          <div className="flex-1 rounded-[1.2vw] p-[3vw] flex flex-col justify-between" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)" }}>
            <div className="w-[3.5vw] h-[3.5vw] rounded-[0.8vw] flex items-center justify-center mb-[2.5vh]" style={{ background: "rgba(99,102,241,0.2)" }}>
              <div className="w-[1.6vw] h-[1.6vw] rounded-full" style={{ background: "#6366F1" }} />
            </div>
            <div>
              <h3 className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "2vw", color: "#F1F5F9" }}>Tutor por Voz</h3>
              <p className="font-body leading-relaxed" style={{ fontSize: "1.5vw", color: "#94A3B8" }}>Professor Tiagao fala com o aluno, lembra o progresso e age de forma proativa</p>
            </div>
          </div>

          <div className="flex-1 rounded-[1.2vw] p-[3vw] flex flex-col justify-between" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <div className="w-[3.5vw] h-[3.5vw] rounded-[0.8vw] flex items-center justify-center mb-[2.5vh]" style={{ background: "rgba(245,158,11,0.15)" }}>
              <div className="w-[1.6vw] h-[1.6vw] rounded-[0.3vw]" style={{ background: "#F59E0B" }} />
            </div>
            <div>
              <h3 className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "2vw", color: "#F1F5F9" }}>Modulos Completos</h3>
              <p className="font-body leading-relaxed" style={{ fontSize: "1.5vw", color: "#94A3B8" }}>Plano de estudos, simulados, flashcards, redacao, caderno digital e mapas mentais</p>
            </div>
          </div>

          <div className="flex-1 rounded-[1.2vw] p-[3vw] flex flex-col justify-between" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="w-[3.5vw] h-[3.5vw] rounded-[0.8vw] flex items-center justify-center mb-[2.5vh]" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div className="w-[1.6vw] h-[0.3vw] rounded-full" style={{ background: "#94A3B8" }} />
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
        <span className="font-body" style={{ fontSize: "1.3vw", color: "#475569" }}>study.ia.br</span>
      </div>
    </div>
  );
}
