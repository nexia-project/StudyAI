export default function Slide4_Modulos() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0F172A" }}>
      <div className="absolute bottom-0 right-0 w-[40vw] h-[40vh] opacity-8 pointer-events-none" style={{ background: "radial-gradient(ellipse, #6366F1 0%, transparent 70%)", transform: "translate(20%, 20%)" }} />

      <div className="relative h-full flex flex-col px-[8vw] pt-[6vh] pb-[5vh]">
        <div className="mb-[3.5vh]">
          <p className="font-display font-semibold tracking-widest uppercase mb-[1vh]" style={{ fontSize: "1.3vw", color: "#6366F1" }}>Funcionalidades</p>
          <h2 className="font-display font-extrabold tracking-tight" style={{ fontSize: "3.8vw", color: "#F1F5F9" }}>Módulos de Estudo</h2>
        </div>

        <div className="grid grid-cols-3 gap-[1.8vw] flex-1">
          <div className="rounded-[1vw] p-[2.2vw] flex flex-col gap-[1.2vh]" style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)", borderLeft: "3px solid #6366F1" }}>
            <div className="w-[2.8vw] h-[2.8vw] rounded-[0.6vw] flex items-center justify-center" style={{ background: "rgba(99,102,241,0.2)" }}>
              <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.5vw", height: "1.5vw" }}>
                <rect x="3" y="4" width="18" height="16" rx="2" stroke="#6366F1" strokeWidth="1.5"/>
                <path d="M8 9h8M8 13h5" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="17" cy="17" r="3" fill="#6366F1" opacity="0.7"/>
                <path d="M15.5 17l1 1 2-2" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="font-display font-bold" style={{ fontSize: "1.7vw", color: "#F1F5F9" }}>Plano de Estudos</h3>
            <p className="font-body" style={{ fontSize: "1.4vw", color: "#94A3B8", lineHeight: "1.5" }}>Cronograma personalizado por IA com metas diárias e progresso</p>
          </div>

          <div className="rounded-[1vw] p-[2.2vw] flex flex-col gap-[1.2vh]" style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)", borderLeft: "3px solid #6366F1" }}>
            <div className="w-[2.8vw] h-[2.8vw] rounded-[0.6vw] flex items-center justify-center" style={{ background: "rgba(99,102,241,0.2)" }}>
              <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.5vw", height: "1.5vw" }}>
                <circle cx="12" cy="12" r="9" stroke="#6366F1" strokeWidth="1.5"/>
                <path d="M12 7v5l3 3" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M6 5l2 2M18 5l-2 2" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
              </svg>
            </div>
            <h3 className="font-display font-bold" style={{ fontSize: "1.7vw", color: "#F1F5F9" }}>Simulado Adaptativo</h3>
            <p className="font-body" style={{ fontSize: "1.4vw", color: "#94A3B8", lineHeight: "1.5" }}>Questões ENEM geradas com DeepSeek, dificuldade adaptativa por desempenho</p>
          </div>

          <div className="rounded-[1vw] p-[2.2vw] flex flex-col gap-[1.2vh]" style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)", borderLeft: "3px solid #6366F1" }}>
            <div className="w-[2.8vw] h-[2.8vw] rounded-[0.6vw] flex items-center justify-center" style={{ background: "rgba(99,102,241,0.2)" }}>
              <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.5vw", height: "1.5vw" }}>
                <rect x="4" y="5" width="7" height="9" rx="1" fill="#6366F1" opacity="0.8"/>
                <rect x="13" y="5" width="7" height="9" rx="1" fill="#6366F1" opacity="0.4"/>
                <path d="M7 16v3M12 14v5M17 16v3" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="font-display font-bold" style={{ fontSize: "1.7vw", color: "#F1F5F9" }}>Flashcards SM-2</h3>
            <p className="font-body" style={{ fontSize: "1.4vw", color: "#94A3B8", lineHeight: "1.5" }}>Repetição espaçada com algoritmo SuperMemo 2, gerados automaticamente</p>
          </div>

          <div className="rounded-[1vw] p-[2.2vw] flex flex-col gap-[1.2vh]" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)", borderLeft: "3px solid #F59E0B" }}>
            <div className="w-[2.8vw] h-[2.8vw] rounded-[0.6vw] flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}>
              <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.5vw", height: "1.5vw" }}>
                <path d="M4 4h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4z" stroke="#F59E0B" strokeWidth="1.5"/>
                <path d="M8 10h8M8 14h5" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M15 7l-6 0" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
              </svg>
            </div>
            <h3 className="font-display font-bold" style={{ fontSize: "1.7vw", color: "#F1F5F9" }}>Correção de Redação</h3>
            <p className="font-body" style={{ fontSize: "1.4vw", color: "#94A3B8", lineHeight: "1.5" }}>Avaliação nas 5 competências ENEM com histórico e evolução visual</p>
          </div>

          <div className="rounded-[1vw] p-[2.2vw] flex flex-col gap-[1.2vh]" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)", borderLeft: "3px solid #F59E0B" }}>
            <div className="w-[2.8vw] h-[2.8vw] rounded-[0.6vw] flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}>
              <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.5vw", height: "1.5vw" }}>
                <circle cx="12" cy="12" r="9" stroke="#F59E0B" strokeWidth="1.5"/>
                <circle cx="12" cy="12" r="5" stroke="#F59E0B" strokeWidth="1" opacity="0.5"/>
                <path d="M12 7v2M12 15v2M7 12h2M15 12h2" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
              </svg>
            </div>
            <h3 className="font-display font-bold" style={{ fontSize: "1.7vw", color: "#F1F5F9" }}>Pomodoro e Foco</h3>
            <p className="font-body" style={{ fontSize: "1.4vw", color: "#94A3B8", lineHeight: "1.5" }}>Timer com Modo Foco, gamificação com XP e conquistas por sessão</p>
          </div>

          <div className="rounded-[1vw] p-[2.2vw] flex flex-col gap-[1.2vh]" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)", borderLeft: "3px solid #F59E0B" }}>
            <div className="w-[2.8vw] h-[2.8vw] rounded-[0.6vw] flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}>
              <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.5vw", height: "1.5vw" }}>
                <circle cx="12" cy="5" r="2" fill="#F59E0B"/>
                <circle cx="5" cy="19" r="2" fill="#F59E0B" opacity="0.7"/>
                <circle cx="19" cy="19" r="2" fill="#F59E0B" opacity="0.7"/>
                <path d="M12 7l-7 10M12 7l7 10M5 19h14" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
              </svg>
            </div>
            <h3 className="font-display font-bold" style={{ fontSize: "1.7vw", color: "#F1F5F9" }}>Mapa Mental</h3>
            <p className="font-body" style={{ fontSize: "1.4vw", color: "#94A3B8", lineHeight: "1.5" }}>Visualização do progresso, upload de documentos e mapas gerados por IA</p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-[8vw] py-[2vh] flex justify-between items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="font-display font-bold" style={{ fontSize: "1.4vw", color: "#6366F1" }}>StudyAI</span>
        <span className="font-body" style={{ fontSize: "1.2vw", color: "#475569" }}>06 / 17</span>
        <span className="font-body" style={{ fontSize: "1.3vw", color: "#475569" }}>study.ia.br</span>
      </div>
    </div>
  );
}
