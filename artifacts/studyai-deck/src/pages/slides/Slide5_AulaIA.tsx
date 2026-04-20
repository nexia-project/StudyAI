export default function Slide5_AulaIA() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0F172A" }}>
      <div className="relative h-full flex">
        <div className="w-[48%] h-full flex items-center justify-center relative" style={{ background: "linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%)", borderRight: "1px solid rgba(99,102,241,0.2)" }}>
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 4vh, rgba(99,102,241,0.4) 4vh, rgba(99,102,241,0.4) calc(4vh + 1px)), repeating-linear-gradient(90deg, transparent, transparent 4vw, rgba(99,102,241,0.4) 4vw, rgba(99,102,241,0.4) calc(4vw + 1px))" }} />
          <div className="relative flex flex-col items-center gap-[3vh]">
            <div className="w-[12vw] h-[8vh] rounded-[1vw] flex items-center justify-center" style={{ background: "rgba(99,102,241,0.15)", border: "2px solid rgba(99,102,241,0.4)" }}>
              <div className="w-[6vw] h-[0.4vh] rounded-full" style={{ background: "#6366F1" }} />
            </div>
            <div className="w-[18vw] h-[6vh] rounded-[0.8vw] flex items-center justify-center" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)" }}>
              <div className="flex gap-[0.6vw]">
                <div className="w-[2vw] h-[2vh] rounded-sm" style={{ background: "rgba(99,102,241,0.5)" }} />
                <div className="w-[3vw] h-[2vh] rounded-sm" style={{ background: "rgba(99,102,241,0.3)" }} />
                <div className="w-[2.5vw] h-[2vh] rounded-sm" style={{ background: "rgba(99,102,241,0.4)" }} />
              </div>
            </div>
            <div className="w-[16vw] h-[5vh] rounded-[0.8vw]" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }} />
            <span className="font-display font-semibold" style={{ fontSize: "1.4vw", color: "rgba(99,102,241,0.6)" }}>Lousa Interativa</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center pl-[5vw] pr-[8vw]">
          <p className="font-display font-semibold tracking-widest uppercase mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#6366F1" }}>Aula com a IA</p>
          <h2 className="font-display font-extrabold tracking-tight leading-tight mb-[3vh]" style={{ fontSize: "3.8vw", color: "#F1F5F9" }}>
            Aula com o Professor
          </h2>

          <div className="flex flex-col gap-[2.5vh]">
            <div className="flex items-start gap-[1.5vw]">
              <div className="w-[0.4vw] h-[5vh] rounded-full flex-shrink-0 mt-[0.5vh]" style={{ background: "#6366F1" }} />
              <div>
                <p className="font-display font-semibold mb-[0.5vh]" style={{ fontSize: "1.7vw", color: "#F1F5F9" }}>Lousa sincronizada com voz</p>
                <p className="font-body" style={{ fontSize: "1.4vw", color: "#94A3B8" }}>O Professor Tiagao narra e anima a lousa em tempo real</p>
              </div>
            </div>

            <div className="flex items-start gap-[1.5vw]">
              <div className="w-[0.4vw] h-[5vh] rounded-full flex-shrink-0 mt-[0.5vh]" style={{ background: "#6366F1" }} />
              <div>
                <p className="font-display font-semibold mb-[0.5vh]" style={{ fontSize: "1.7vw", color: "#F1F5F9" }}>Gerado por Claude Sonnet</p>
                <p className="font-body" style={{ fontSize: "1.4vw", color: "#94A3B8" }}>Conteudo estruturado de aulas com Whisper para recepcao de voz</p>
              </div>
            </div>

            <div className="flex items-start gap-[1.5vw]">
              <div className="w-[0.4vw] h-[5vh] rounded-full flex-shrink-0 mt-[0.5vh]" style={{ background: "#F59E0B" }} />
              <div>
                <p className="font-display font-semibold mb-[0.5vh]" style={{ fontSize: "1.7vw", color: "#F1F5F9" }}>Ilustracoes por Gemini</p>
                <p className="font-body" style={{ fontSize: "1.4vw", color: "#94A3B8" }}>Imagens educacionais geradas para cada topico abordado</p>
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
