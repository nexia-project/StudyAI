export default function Slide9_Encerramento() {
  return (
    <div className="w-screen h-screen overflow-hidden relative flex flex-col items-center justify-center" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)" }}>
      <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
        <div className="absolute" style={{ top: "10%", left: "5%", width: "35vw", height: "35vw", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)" }} />
        <div className="absolute" style={{ bottom: "5%", right: "5%", width: "30vw", height: "30vw", background: "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)" }} />
      </div>

      <div className="relative flex flex-col items-center text-center px-[15vw]">
        <div className="flex items-center gap-[1vw] mb-[5vh]">
          <div className="w-[2.2vw] h-[2.2vw] rounded-[0.45vw]" style={{ background: "#6366F1" }} />
          <span className="font-display font-bold tracking-widest uppercase" style={{ fontSize: "1.8vw", color: "#6366F1" }}>StudyAI</span>
        </div>

        <h2 className="font-display font-extrabold tracking-tight leading-tight mb-[4vh]" style={{ fontSize: "4.5vw", color: "#F1F5F9" }}>
          Democratizando educacao de qualidade no Brasil
        </h2>

        <div className="w-[8vw] h-[0.4vh] mb-[4vh]" style={{ background: "#F59E0B" }} />

        <p className="font-body leading-relaxed mb-[5vh]" style={{ fontSize: "1.8vw", color: "#94A3B8" }}>
          Um tutor de IA para cada estudante brasileiro — acessivel, personalizado e proativo.
        </p>

        <div className="px-[3vw] py-[1.5vh] rounded-full" style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.4)" }}>
          <span className="font-display font-semibold tracking-wide" style={{ fontSize: "1.8vw", color: "#6366F1" }}>study.ia.br</span>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-[8vw] py-[2.5vh] flex justify-center items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="font-body" style={{ fontSize: "1.4vw", color: "#475569" }}>Abril 2026 — StudyAI</span>
      </div>
    </div>
  );
}
