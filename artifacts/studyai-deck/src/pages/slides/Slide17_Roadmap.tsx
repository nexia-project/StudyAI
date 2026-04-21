export default function Slide17_Roadmap() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0F172A" }}>
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(99,102,241,0.3) 0%, transparent 60%)" }} />

      <div className="relative h-full flex flex-col px-[8vw] pt-[5.5vh] pb-[4vh]">
        <div className="mb-[3vh]">
          <p className="font-display font-semibold tracking-widest uppercase mb-[0.8vh]" style={{ fontSize: "1.3vw", color: "#6366F1" }}>Próximos Passos</p>
          <h2 className="font-display font-extrabold tracking-tight" style={{ fontSize: "3.5vw", color: "#F1F5F9" }}>Roadmap de Produto</h2>
        </div>

        <div className="flex flex-col gap-[2vh] flex-1 justify-center">
          <div className="flex gap-[1.5vw]">
            <div className="flex flex-col items-center">
              <div className="w-[3.5vw] h-[3.5vw] rounded-full flex items-center justify-center font-display font-bold" style={{ background: "linear-gradient(135deg, #10B981, #0D9488)", fontSize: "1.3vw", color: "#F1F5F9", flexShrink: 0 }}>Q2</div>
              <div className="w-[0.2vw] flex-1 mt-[1vh]" style={{ background: "rgba(255,255,255,0.1)" }} />
            </div>
            <div className="flex-1 pb-[2vh]">
              <div className="flex items-center gap-[1vw] mb-[1vh]">
                <span className="font-display font-bold" style={{ fontSize: "1.6vw", color: "#10B981" }}>2026 — Consolidação</span>
                <span className="px-[1vw] py-[0.3vh] rounded-full font-body" style={{ fontSize: "0.9vw", background: "rgba(16,185,129,0.2)", color: "#10B981" }}>Em andamento</span>
              </div>
              <div className="grid grid-cols-3 gap-[1vw]">
                <div className="rounded-[0.8vw] px-[1.5vw] py-[1.2vh]" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>App iOS e Android (Expo)</p>
                </div>
                <div className="rounded-[0.8vw] px-[1.5vw] py-[1.2vh]" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Correção de Redação ENEM</p>
                </div>
                <div className="rounded-[0.8vw] px-[1.5vw] py-[1.2vh]" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Banco de questões — 50K</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-[1.5vw]">
            <div className="flex flex-col items-center">
              <div className="w-[3.5vw] h-[3.5vw] rounded-full flex items-center justify-center font-display font-bold" style={{ background: "linear-gradient(135deg, #6366F1, #4F46E5)", fontSize: "1.3vw", color: "#F1F5F9", flexShrink: 0 }}>Q3</div>
              <div className="w-[0.2vw] flex-1 mt-[1vh]" style={{ background: "rgba(255,255,255,0.1)" }} />
            </div>
            <div className="flex-1 pb-[2vh]">
              <p className="font-display font-bold mb-[1vh]" style={{ fontSize: "1.6vw", color: "#6366F1" }}>2026 — Escolas e B2B</p>
              <div className="grid grid-cols-3 gap-[1vw]">
                <div className="rounded-[0.8vw] px-[1.5vw] py-[1.2vh]" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Dashboard do Professor</p>
                </div>
                <div className="rounded-[0.8vw] px-[1.5vw] py-[1.2vh]" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Integração com escolas parceiras</p>
                </div>
                <div className="rounded-[0.8vw] px-[1.5vw] py-[1.2vh]" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Alertas para pais — WhatsApp</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-[1.5vw]">
            <div className="flex flex-col items-center">
              <div className="w-[3.5vw] h-[3.5vw] rounded-full flex items-center justify-center font-display font-bold" style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", fontSize: "1.3vw", color: "#0F172A", flexShrink: 0 }}>Q4</div>
              <div className="w-[0.2vw] flex-1 mt-[1vh]" style={{ background: "rgba(255,255,255,0.1)" }} />
            </div>
            <div className="flex-1 pb-[2vh]">
              <p className="font-display font-bold mb-[1vh]" style={{ fontSize: "1.6vw", color: "#F59E0B" }}>2026 — Escala e Expansão</p>
              <div className="grid grid-cols-3 gap-[1vw]">
                <div className="rounded-[0.8vw] px-[1.5vw] py-[1.2vh]" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>White-label para cursinhos</p>
                </div>
                <div className="rounded-[0.8vw] px-[1.5vw] py-[1.2vh]" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Modo colaborativo em grupo</p>
                </div>
                <div className="rounded-[0.8vw] px-[1.5vw] py-[1.2vh]" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Meta: 50K alunos ativos</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-[1.5vw]">
            <div className="w-[3.5vw] h-[3.5vw] rounded-full flex items-center justify-center font-display font-bold flex-shrink-0" style={{ background: "linear-gradient(135deg, #8B5CF6, #7C3AED)", fontSize: "1.3vw", color: "#F1F5F9" }}>27</div>
            <div className="flex-1">
              <p className="font-display font-bold mb-[1vh]" style={{ fontSize: "1.6vw", color: "#8B5CF6" }}>2027 — América Latina</p>
              <div className="grid grid-cols-3 gap-[1vw]">
                <div className="rounded-[0.8vw] px-[1.5vw] py-[1.2vh]" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
                  <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>México — PAES e Comipems</p>
                </div>
                <div className="rounded-[0.8vw] px-[1.5vw] py-[1.2vh]" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
                  <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Chile e Colômbia</p>
                </div>
                <div className="rounded-[0.8vw] px-[1.5vw] py-[1.2vh]" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
                  <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Série A — captação</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-[8vw] py-[2vh] flex justify-between items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="font-display font-bold" style={{ fontSize: "1.4vw", color: "#6366F1" }}>StudyAI</span>
        <span className="font-body" style={{ fontSize: "1.2vw", color: "#475569" }}>16 / 17</span>
        <span className="font-body" style={{ fontSize: "1.3vw", color: "#475569" }}>study.ia.br</span>
      </div>
    </div>
  );
}
