export default function Slide7_StackIA() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0F172A" }}>
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ background: "repeating-linear-gradient(90deg, transparent, transparent 8vw, rgba(99,102,241,0.5) 8vw, rgba(99,102,241,0.5) calc(8vw + 1px))" }} />

      <div className="relative h-full flex flex-col px-[8vw] pt-[6vh] pb-[5vh]">
        <div className="mb-[3vh]">
          <p className="font-display font-semibold tracking-widest uppercase mb-[1vh]" style={{ fontSize: "1.3vw", color: "#6366F1" }}>Tecnologia</p>
          <h2 className="font-display font-extrabold tracking-tight" style={{ fontSize: "3.8vw", color: "#F1F5F9" }}>Stack de Inteligencia Artificial</h2>
        </div>

        <div className="grid grid-cols-3 gap-[1.8vw] flex-1">
          <div className="rounded-[1vw] p-[2vw] flex flex-col gap-[1.2vh]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center gap-[1vw]">
              <div className="w-[2.5vw] h-[2.5vw] rounded-[0.5vw]" style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }} />
              <span className="font-display font-bold" style={{ fontSize: "1.5vw", color: "#F1F5F9" }}>DeepSeek V3</span>
            </div>
            <p className="font-body" style={{ fontSize: "1.3vw", color: "#94A3B8", lineHeight: "1.4" }}>Chat, simulados e caderno — 10x mais economico que GPT-4o</p>
            <span className="font-body font-medium mt-auto" style={{ fontSize: "1.2vw", color: "#6366F1" }}>LLM Principal</span>
          </div>

          <div className="rounded-[1vw] p-[2vw] flex flex-col gap-[1.2vh]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center gap-[1vw]">
              <div className="w-[2.5vw] h-[2.5vw] rounded-[0.5vw]" style={{ background: "linear-gradient(135deg, #F59E0B, #EF4444)" }} />
              <span className="font-display font-bold" style={{ fontSize: "1.5vw", color: "#F1F5F9" }}>ElevenLabs</span>
            </div>
            <p className="font-body" style={{ fontSize: "1.3vw", color: "#94A3B8", lineHeight: "1.4" }}>TTS natural — voz Daniel PT-BR, turbo v2.5 com fallback OpenAI</p>
            <span className="font-body font-medium mt-auto" style={{ fontSize: "1.2vw", color: "#F59E0B" }}>Sintese de Voz</span>
          </div>

          <div className="rounded-[1vw] p-[2vw] flex flex-col gap-[1.2vh]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center gap-[1vw]">
              <div className="w-[2.5vw] h-[2.5vw] rounded-[0.5vw]" style={{ background: "linear-gradient(135deg, #D97706, #92400E)" }} />
              <span className="font-display font-bold" style={{ fontSize: "1.5vw", color: "#F1F5F9" }}>Claude Sonnet</span>
            </div>
            <p className="font-body" style={{ fontSize: "1.3vw", color: "#94A3B8", lineHeight: "1.4" }}>Geracao de aulas estruturadas e conteudo pedagogico via Anthropic</p>
            <span className="font-body font-medium mt-auto" style={{ fontSize: "1.2vw", color: "#D97706" }}>Geracao de Aulas</span>
          </div>

          <div className="rounded-[1vw] p-[2vw] flex flex-col gap-[1.2vh]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center gap-[1vw]">
              <div className="w-[2.5vw] h-[2.5vw] rounded-[0.5vw]" style={{ background: "linear-gradient(135deg, #10B981, #0D9488)" }} />
              <span className="font-display font-bold" style={{ fontSize: "1.5vw", color: "#F1F5F9" }}>Gemini Flash</span>
            </div>
            <p className="font-body" style={{ fontSize: "1.3vw", color: "#94A3B8", lineHeight: "1.4" }}>Imagens educacionais + analise multimodal de questoes fotografadas</p>
            <span className="font-body font-medium mt-auto" style={{ fontSize: "1.2vw", color: "#10B981" }}>Visao e Imagens</span>
          </div>

          <div className="rounded-[1vw] p-[2vw] flex flex-col gap-[1.2vh]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center gap-[1vw]">
              <div className="w-[2.5vw] h-[2.5vw] rounded-[0.5vw]" style={{ background: "linear-gradient(135deg, #3B82F6, #1D4ED8)" }} />
              <span className="font-display font-bold" style={{ fontSize: "1.5vw", color: "#F1F5F9" }}>OpenAI Whisper</span>
            </div>
            <p className="font-body" style={{ fontSize: "1.3vw", color: "#94A3B8", lineHeight: "1.4" }}>Transcricao de voz do aluno em AulaIA com alta precisao em PT-BR</p>
            <span className="font-body font-medium mt-auto" style={{ fontSize: "1.2vw", color: "#3B82F6" }}>Transcricao de Audio</span>
          </div>

          <div className="rounded-[1vw] p-[2vw] flex flex-col gap-[1.2vh]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center gap-[1vw]">
              <div className="w-[2.5vw] h-[2.5vw] rounded-[0.5vw]" style={{ background: "linear-gradient(135deg, #8B5CF6, #6366F1)" }} />
              <span className="font-display font-bold" style={{ fontSize: "1.5vw", color: "#F1F5F9" }}>OpenAI Embeddings</span>
            </div>
            <p className="font-body" style={{ fontSize: "1.3vw", color: "#94A3B8", lineHeight: "1.4" }}>text-embedding-3-small para busca semantica RAG no caderno</p>
            <span className="font-body font-medium mt-auto" style={{ fontSize: "1.2vw", color: "#8B5CF6" }}>Busca Semantica</span>
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
