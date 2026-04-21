export default function Slide9_Encerramento() {
  return (
    <div className="w-screen h-screen overflow-hidden relative flex flex-col items-center justify-center" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)" }}>
      <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
        <div className="absolute" style={{ top: "10%", left: "5%", width: "35vw", height: "35vw", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)" }} />
        <div className="absolute" style={{ bottom: "5%", right: "5%", width: "30vw", height: "30vw", background: "radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)" }} />
        <div className="absolute" style={{ top: "40%", right: "10%", width: "20vw", height: "20vw", background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)" }} />
      </div>

      <div className="relative text-center flex flex-col items-center px-[10vw]">
        <div className="flex items-center gap-[1vw] mb-[4vh]">
          <div className="w-[2vw] h-[2vw] rounded-[0.4vw]" style={{ background: "#6366F1" }} />
          <span className="font-display font-bold tracking-widest uppercase" style={{ fontSize: "1.8vw", color: "#6366F1" }}>StudyAI</span>
        </div>

        <h2 className="font-display font-extrabold leading-tight mb-[2.5vh]" style={{ fontSize: "5vw", color: "#F1F5F9" }}>
          A IA que aprova você.
        </h2>

        <div className="w-[6vw] h-[0.35vh] mb-[3.5vh]" style={{ background: "#F59E0B" }} />

        <p className="font-body leading-relaxed mb-[5vh]" style={{ fontSize: "1.8vw", color: "#94A3B8", maxWidth: "60vw" }}>
          Professor Tiagão te acompanha em cada sessão, lembra do seu progresso e nao para até você passar. Com IA, todo aluno merece um tutor de primeira classe.
        </p>

        <div className="flex gap-[4vw] mb-[5vh]">
          <div className="text-center">
            <p className="font-display font-extrabold" style={{ fontSize: "3.2vw", color: "#6366F1" }}>+340%</p>
            <p className="font-body" style={{ fontSize: "1.2vw", color: "#64748B" }}>Retenção de conteúdo</p>
          </div>
          <div className="w-[0.1vw]" style={{ background: "rgba(255,255,255,0.1)" }} />
          <div className="text-center">
            <p className="font-display font-extrabold" style={{ fontSize: "3.2vw", color: "#F59E0B" }}>20x</p>
            <p className="font-body" style={{ fontSize: "1.2vw", color: "#64748B" }}>Mais barato que aula particular</p>
          </div>
          <div className="w-[0.1vw]" style={{ background: "rgba(255,255,255,0.1)" }} />
          <div className="text-center">
            <p className="font-display font-extrabold" style={{ fontSize: "3.2vw", color: "#10B981" }}>4.8</p>
            <p className="font-body" style={{ fontSize: "1.2vw", color: "#64748B" }}>Satisfação dos alunos</p>
          </div>
        </div>

        <div className="flex items-center gap-[3vw]">
          <div className="rounded-[1vw] px-[3vw] py-[1.5vh]" style={{ background: "linear-gradient(135deg, #6366F1, #4F46E5)" }}>
            <span className="font-display font-bold" style={{ fontSize: "1.5vw", color: "#F1F5F9" }}>study.ia.br</span>
          </div>
          <p className="font-body" style={{ fontSize: "1.3vw", color: "#64748B" }}>contato@study.ia.br</p>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-[8vw] py-[2vh] flex justify-between items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="font-display font-bold" style={{ fontSize: "1.4vw", color: "#6366F1" }}>StudyAI</span>
        <span className="font-body" style={{ fontSize: "1.2vw", color: "#475569" }}>17 / 17</span>
        <span className="font-body" style={{ fontSize: "1.3vw", color: "#475569" }}>study.ia.br</span>
      </div>
    </div>
  );
}
