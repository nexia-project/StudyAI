export default function Slide10_IAImagem() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0F172A" }}>
      <div className="absolute inset-0 opacity-8 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 60% at 80% 50%, rgba(16,185,129,0.18) 0%, transparent 70%)" }} />

      <div className="relative h-full flex flex-col px-[8vw] pt-[6vh] pb-[5vh]">
        <div className="mb-[3.5vh]">
          <p className="font-display font-semibold tracking-widest uppercase mb-[1vh]" style={{ fontSize: "1.3vw", color: "#10B981" }}>Geracao Visual com IA</p>
          <h2 className="font-display font-extrabold tracking-tight" style={{ fontSize: "3.8vw", color: "#F1F5F9" }}>IAs de Imagem Integradas</h2>
        </div>

        <div className="grid grid-cols-2 gap-[2vw] flex-1">
          <div className="rounded-[1.2vw] p-[2.2vw] flex flex-col gap-[1.5vh]" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <div className="flex items-center gap-[1.2vw]">
              <div className="w-[3vw] h-[3vw] rounded-[0.6vw] flex items-center justify-center" style={{ background: "linear-gradient(135deg, #10B981, #0D9488)" }}>
                <div className="w-[1.6vw] h-[1.6vw] rounded-full" style={{ background: "rgba(255,255,255,0.8)" }} />
              </div>
              <div>
                <p className="font-display font-bold" style={{ fontSize: "1.6vw", color: "#F1F5F9" }}>Gemini Imagen</p>
                <p className="font-body" style={{ fontSize: "1.1vw", color: "#10B981" }}>Google DeepMind</p>
              </div>
            </div>
            <p className="font-body" style={{ fontSize: "1.3vw", color: "#94A3B8", lineHeight: "1.5" }}>Gera ilustracoes educacionais em tempo real durante as aulas — diagramas, esquemas e representacoes visuais de conceitos do ENEM.</p>
            <div className="flex gap-[0.8vw] flex-wrap mt-auto">
              <span className="px-[0.8vw] py-[0.4vh] rounded-full font-body" style={{ fontSize: "1vw", background: "rgba(16,185,129,0.15)", color: "#10B981" }}>Aulas ao Vivo</span>
              <span className="px-[0.8vw] py-[0.4vh] rounded-full font-body" style={{ fontSize: "1vw", background: "rgba(16,185,129,0.15)", color: "#10B981" }}>Caderno Digital</span>
              <span className="px-[0.8vw] py-[0.4vh] rounded-full font-body" style={{ fontSize: "1vw", background: "rgba(16,185,129,0.15)", color: "#10B981" }}>Mapas Mentais</span>
            </div>
          </div>

          <div className="rounded-[1.2vw] p-[2.2vw] flex flex-col gap-[1.5vh]" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <div className="flex items-center gap-[1.2vw]">
              <div className="w-[3vw] h-[3vw] rounded-[0.6vw] flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6366F1, #4F46E5)" }}>
                <div className="w-[1.6vw] h-[1.6vw] rounded-[0.3vw]" style={{ background: "rgba(255,255,255,0.8)" }} />
              </div>
              <div>
                <p className="font-display font-bold" style={{ fontSize: "1.6vw", color: "#F1F5F9" }}>DALL-E 3</p>
                <p className="font-body" style={{ fontSize: "1.1vw", color: "#6366F1" }}>OpenAI</p>
              </div>
            </div>
            <p className="font-body" style={{ fontSize: "1.3vw", color: "#94A3B8", lineHeight: "1.5" }}>Cria imagens didaticas de alta fidelidade para mnemônicos, flashcards visuais e capas de resumo personalizadas por aluno.</p>
            <div className="flex gap-[0.8vw] flex-wrap mt-auto">
              <span className="px-[0.8vw] py-[0.4vh] rounded-full font-body" style={{ fontSize: "1vw", background: "rgba(99,102,241,0.15)", color: "#6366F1" }}>Flashcards Visuais</span>
              <span className="px-[0.8vw] py-[0.4vh] rounded-full font-body" style={{ fontSize: "1vw", background: "rgba(99,102,241,0.15)", color: "#6366F1" }}>Resumos</span>
            </div>
          </div>

          <div className="rounded-[1.2vw] p-[2.2vw] flex flex-col gap-[1.5vh]" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <div className="flex items-center gap-[1.2vw]">
              <div className="w-[3vw] h-[3vw] rounded-[0.6vw] flex items-center justify-center" style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
                <div className="w-[0] h-[0]" style={{ borderLeft: "0.8vw solid transparent", borderRight: "0.8vw solid transparent", borderBottom: "1.4vw solid rgba(255,255,255,0.8)" }} />
              </div>
              <div>
                <p className="font-display font-bold" style={{ fontSize: "1.6vw", color: "#F1F5F9" }}>Stable Diffusion</p>
                <p className="font-body" style={{ fontSize: "1.1vw", color: "#F59E0B" }}>Stability AI</p>
              </div>
            </div>
            <p className="font-body" style={{ fontSize: "1.3vw", color: "#94A3B8", lineHeight: "1.5" }}>Gera infograficos e diagramas no estilo didatico brasileiro — usado nos mapas mentais e planos de aula para escolas parceiras.</p>
            <div className="flex gap-[0.8vw] flex-wrap mt-auto">
              <span className="px-[0.8vw] py-[0.4vh] rounded-full font-body" style={{ fontSize: "1vw", background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>Infograficos</span>
              <span className="px-[0.8vw] py-[0.4vh] rounded-full font-body" style={{ fontSize: "1vw", background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>Planos de Aula</span>
            </div>
          </div>

          <div className="rounded-[1.2vw] p-[2.2vw] flex flex-col" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="font-display font-bold mb-[2vh]" style={{ fontSize: "1.4vw", color: "#94A3B8" }}>Casos de uso</p>
            <div className="flex flex-col gap-[1.5vh] flex-1">
              <div className="flex items-start gap-[1vw]">
                <div className="w-[0.5vw] h-[0.5vw] rounded-full mt-[0.6vh] flex-shrink-0" style={{ background: "#10B981" }} />
                <p className="font-body" style={{ fontSize: "1.3vw", color: "#CBD5E1", lineHeight: "1.4" }}>Lousa da aula animada em tempo real pelo Professor Tiagao</p>
              </div>
              <div className="flex items-start gap-[1vw]">
                <div className="w-[0.5vw] h-[0.5vw] rounded-full mt-[0.6vh] flex-shrink-0" style={{ background: "#6366F1" }} />
                <p className="font-body" style={{ fontSize: "1.3vw", color: "#CBD5E1", lineHeight: "1.4" }}>Flashcard com imagem gerada automaticamente pelo conteudo estudado</p>
              </div>
              <div className="flex items-start gap-[1vw]">
                <div className="w-[0.5vw] h-[0.5vw] rounded-full mt-[0.6vh] flex-shrink-0" style={{ background: "#F59E0B" }} />
                <p className="font-body" style={{ fontSize: "1.3vw", color: "#CBD5E1", lineHeight: "1.4" }}>Mapa mental visual gerado a partir das anotacoes do caderno RAG</p>
              </div>
              <div className="flex items-start gap-[1vw]">
                <div className="w-[0.5vw] h-[0.5vw] rounded-full mt-[0.6vh] flex-shrink-0" style={{ background: "#8B5CF6" }} />
                <p className="font-body" style={{ fontSize: "1.3vw", color: "#CBD5E1", lineHeight: "1.4" }}>Analise multimodal de questoes fotografadas pela camera do celular</p>
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
