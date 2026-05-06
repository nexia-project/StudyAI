export default function Slide7_StackIA() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0F172A" }}>
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ background: "repeating-linear-gradient(90deg, transparent, transparent 8vw, rgba(99,102,241,0.5) 8vw, rgba(99,102,241,0.5) calc(8vw + 1px))" }} />
      <div className="absolute inset-0 opacity-8 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(99,102,241,0.12) 0%, transparent 70%)" }} />

      <div className="relative h-full flex flex-col px-[8vw] pt-[5.5vh] pb-[4vh]">
        <div className="mb-[3vh]">
          <p className="font-display font-semibold tracking-widest uppercase mb-[0.8vh]" style={{ fontSize: "1.3vw", color: "#6366F1" }}>Arquitetura Técnica</p>
          <h2 className="font-display font-extrabold tracking-tight" style={{ fontSize: "3.5vw", color: "#F1F5F9" }}>Stack de IA</h2>
        </div>

        <div className="grid grid-cols-4 gap-[1.5vw] flex-1">
          <div className="flex flex-col gap-[1.5vw]">
            <p className="font-display font-bold text-center" style={{ fontSize: "1.2vw", color: "#6366F1" }}>Linguagem</p>
            <div className="flex flex-col gap-[1vw]">
              <div className="rounded-[0.8vw] px-[1.5vw] py-[1.5vh] text-center" style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}>
                <p className="font-display font-bold" style={{ fontSize: "1.3vw", color: "#F1F5F9" }}>DeepSeek V3</p>
                <p className="font-body" style={{ fontSize: "1vw", color: "#94A3B8" }}>Chat principal</p>
              </div>
              <div className="rounded-[0.8vw] px-[1.5vw] py-[1.5vh] text-center" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <p className="font-display font-bold" style={{ fontSize: "1.3vw", color: "#F1F5F9" }}>Claude Sonnet</p>
                <p className="font-body" style={{ fontSize: "1vw", color: "#94A3B8" }}>Redação e análise</p>
              </div>
              <div className="rounded-[0.8vw] px-[1.5vw] py-[1.5vh] text-center" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <p className="font-display font-bold" style={{ fontSize: "1.3vw", color: "#F1F5F9" }}>Gemini Flash</p>
                <p className="font-body" style={{ fontSize: "1vw", color: "#94A3B8" }}>Câmera / visão</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-[1.5vw]">
            <p className="font-display font-bold text-center" style={{ fontSize: "1.2vw", color: "#F59E0B" }}>Voz</p>
            <div className="flex flex-col gap-[1vw]">
              <div className="rounded-[0.8vw] px-[1.5vw] py-[1.5vh] text-center" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
                <p className="font-display font-bold" style={{ fontSize: "1.3vw", color: "#F1F5F9" }}>ElevenLabs</p>
                <p className="font-body" style={{ fontSize: "1vw", color: "#94A3B8" }}>TTS — Professor Tiagão</p>
              </div>
              <div className="rounded-[0.8vw] px-[1.5vw] py-[1.5vh] text-center" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <p className="font-display font-bold" style={{ fontSize: "1.3vw", color: "#F1F5F9" }}>Whisper</p>
                <p className="font-body" style={{ fontSize: "1vw", color: "#94A3B8" }}>STT — fala do aluno</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-[1.5vw]">
            <p className="font-display font-bold text-center" style={{ fontSize: "1.2vw", color: "#10B981" }}>Busca e Memória</p>
            <div className="flex flex-col gap-[1vw]">
              <div className="rounded-[0.8vw] px-[1.5vw] py-[1.5vh] text-center" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
                <p className="font-display font-bold" style={{ fontSize: "1.3vw", color: "#F1F5F9" }}>OpenAI Embeddings</p>
                <p className="font-body" style={{ fontSize: "1vw", color: "#94A3B8" }}>Caderno RAG</p>
              </div>
              <div className="rounded-[0.8vw] px-[1.5vw] py-[1.5vh] text-center" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <p className="font-display font-bold" style={{ fontSize: "1.3vw", color: "#F1F5F9" }}>pgvector</p>
                <p className="font-body" style={{ fontSize: "1vw", color: "#94A3B8" }}>Busca semântica</p>
              </div>
              <div className="rounded-[0.8vw] px-[1.5vw] py-[1.5vh] text-center" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <p className="font-display font-bold" style={{ fontSize: "1.3vw", color: "#F1F5F9" }}>PostgreSQL</p>
                <p className="font-body" style={{ fontSize: "1vw", color: "#94A3B8" }}>Memória persistente</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-[1.5vw]">
            <p className="font-display font-bold text-center" style={{ fontSize: "1.2vw", color: "#8B5CF6" }}>Infraestrutura</p>
            <div className="flex flex-col gap-[1vw]">
              <div className="rounded-[0.8vw] px-[1.5vw] py-[1.5vh] text-center" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
                <p className="font-display font-bold" style={{ fontSize: "1.3vw", color: "#F1F5F9" }}>React + Vite</p>
                <p className="font-body" style={{ fontSize: "1vw", color: "#94A3B8" }}>Frontend web</p>
              </div>
              <div className="rounded-[0.8vw] px-[1.5vw] py-[1.5vh] text-center" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
                <p className="font-display font-bold" style={{ fontSize: "1.3vw", color: "#F1F5F9" }}>Expo React Native</p>
                <p className="font-body" style={{ fontSize: "1vw", color: "#94A3B8" }}>App iOS e Android</p>
              </div>
              <div className="rounded-[0.8vw] px-[1.5vw] py-[1.5vh] text-center" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
                <p className="font-display font-bold" style={{ fontSize: "1.3vw", color: "#F1F5F9" }}>Express + Drizzle</p>
                <p className="font-body" style={{ fontSize: "1vw", color: "#94A3B8" }}>API e ORM</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-[2vh] rounded-[1vw] px-[3vw] py-[2vh] flex items-center gap-[3vw]" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-[1vw]">
            <div className="w-[0.8vw] h-[0.8vw] rounded-full" style={{ background: "#10B981" }} />
            <span className="font-body" style={{ fontSize: "1.2vw", color: "#94A3B8" }}>Fallback automático entre modelos reduz custo em até 70%</span>
          </div>
          <div className="flex items-center gap-[1vw]">
            <div className="w-[0.8vw] h-[0.8vw] rounded-full" style={{ background: "#6366F1" }} />
            <span className="font-body" style={{ fontSize: "1.2vw", color: "#94A3B8" }}>DeepSeek 10x mais barato que GPT-4 com qualidade similar</span>
          </div>
          <div className="flex items-center gap-[1vw]">
            <div className="w-[0.8vw] h-[0.8vw] rounded-full" style={{ background: "#F59E0B" }} />
            <span className="font-body" style={{ fontSize: "1.2vw", color: "#94A3B8" }}>Custo estimado por aluno: R$ 2,50 / mês</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-[8vw] py-[2vh] flex justify-between items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="font-display font-bold" style={{ fontSize: "1.4vw", color: "#6366F1" }}>StudyAI</span>
        <span className="font-body" style={{ fontSize: "1.2vw", color: "#475569" }}>13 / 17</span>
        <span className="font-body" style={{ fontSize: "1.3vw", color: "#475569" }}>study.ia.br</span>
      </div>
    </div>
  );
}
