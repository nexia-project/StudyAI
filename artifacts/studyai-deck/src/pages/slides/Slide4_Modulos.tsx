export default function Slide4_Modulos() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0F172A" }}>
      <div className="absolute bottom-0 right-0 w-[40vw] h-[40vh] opacity-8 pointer-events-none" style={{ background: "radial-gradient(ellipse, #6366F1 0%, transparent 70%)", transform: "translate(20%, 20%)" }} />

      <div className="relative h-full flex flex-col px-[8vw] pt-[6vh] pb-[5vh]">
        <div className="mb-[3.5vh]">
          <p className="font-display font-semibold tracking-widest uppercase mb-[1vh]" style={{ fontSize: "1.3vw", color: "#6366F1" }}>Funcionalidades</p>
          <h2 className="font-display font-extrabold tracking-tight" style={{ fontSize: "3.8vw", color: "#F1F5F9" }}>Modulos de Estudo</h2>
        </div>

        <div className="grid grid-cols-3 gap-[1.8vw] flex-1">
          <div className="rounded-[1vw] p-[2.2vw] flex flex-col" style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)", borderLeft: "3px solid #6366F1" }}>
            <h3 className="font-display font-bold mb-[1vh]" style={{ fontSize: "1.7vw", color: "#F1F5F9" }}>Plano de Estudos</h3>
            <p className="font-body" style={{ fontSize: "1.4vw", color: "#94A3B8", lineHeight: "1.5" }}>Cronograma personalizado por IA com metas diarias e progresso</p>
          </div>

          <div className="rounded-[1vw] p-[2.2vw] flex flex-col" style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)", borderLeft: "3px solid #6366F1" }}>
            <h3 className="font-display font-bold mb-[1vh]" style={{ fontSize: "1.7vw", color: "#F1F5F9" }}>Simulado Adaptativo</h3>
            <p className="font-body" style={{ fontSize: "1.4vw", color: "#94A3B8", lineHeight: "1.5" }}>Questoes ENEM geradas com DeepSeek, dificuldade adaptativa por desempenho</p>
          </div>

          <div className="rounded-[1vw] p-[2.2vw] flex flex-col" style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)", borderLeft: "3px solid #6366F1" }}>
            <h3 className="font-display font-bold mb-[1vh]" style={{ fontSize: "1.7vw", color: "#F1F5F9" }}>Flashcards SM-2</h3>
            <p className="font-body" style={{ fontSize: "1.4vw", color: "#94A3B8", lineHeight: "1.5" }}>Repeticao espacada com algoritmo SuperMemo 2, gerados automaticamente</p>
          </div>

          <div className="rounded-[1vw] p-[2.2vw] flex flex-col" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)", borderLeft: "3px solid #F59E0B" }}>
            <h3 className="font-display font-bold mb-[1vh]" style={{ fontSize: "1.7vw", color: "#F1F5F9" }}>Correcao de Redacao</h3>
            <p className="font-body" style={{ fontSize: "1.4vw", color: "#94A3B8", lineHeight: "1.5" }}>Avaliacao nas 5 competencias ENEM com historico e evolucao visual</p>
          </div>

          <div className="rounded-[1vw] p-[2.2vw] flex flex-col" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)", borderLeft: "3px solid #F59E0B" }}>
            <h3 className="font-display font-bold mb-[1vh]" style={{ fontSize: "1.7vw", color: "#F1F5F9" }}>Pomodoro e Foco</h3>
            <p className="font-body" style={{ fontSize: "1.4vw", color: "#94A3B8", lineHeight: "1.5" }}>Timer com Modo Foco, gamificacao com XP e conquistas por sessao</p>
          </div>

          <div className="rounded-[1vw] p-[2.2vw] flex flex-col" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)", borderLeft: "3px solid #F59E0B" }}>
            <h3 className="font-display font-bold mb-[1vh]" style={{ fontSize: "1.7vw", color: "#F1F5F9" }}>Mapa Mental</h3>
            <p className="font-body" style={{ fontSize: "1.4vw", color: "#94A3B8", lineHeight: "1.5" }}>Visualizacao do progresso, upload de documentos e mapas gerados por IA</p>
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
