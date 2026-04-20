export default function Slide8_ParaQuem() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0F172A" }}>
      <div className="absolute top-0 left-0 w-[30vw] h-[30vh] opacity-8 pointer-events-none" style={{ background: "radial-gradient(ellipse, #6366F1 0%, transparent 70%)" }} />

      <div className="relative h-full flex flex-col px-[8vw] pt-[6vh] pb-[5vh]">
        <div className="mb-[3vh]">
          <p className="font-display font-semibold tracking-widest uppercase mb-[1vh]" style={{ fontSize: "1.3vw", color: "#6366F1" }}>Publico</p>
          <h2 className="font-display font-extrabold tracking-tight" style={{ fontSize: "3.8vw", color: "#F1F5F9" }}>Para Quem e o StudyAI</h2>
        </div>

        <div className="grid grid-cols-2 gap-[2vw] flex-1">
          <div className="rounded-[1.2vw] p-[3vw] flex flex-col" style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <div className="flex items-center gap-[1.5vw] mb-[2.5vh]">
              <div className="w-[4vw] h-[4vw] rounded-[1vw] flex items-center justify-center" style={{ background: "rgba(99,102,241,0.2)" }}>
                <div className="w-[2vw] h-[2vw] rounded-full" style={{ background: "#6366F1" }} />
              </div>
              <h3 className="font-display font-bold" style={{ fontSize: "2.2vw", color: "#F1F5F9" }}>Alunos</h3>
            </div>
            <p className="font-body leading-relaxed" style={{ fontSize: "1.5vw", color: "#94A3B8" }}>Estudantes do ENEM, vestibular e concursos publicos que buscam tutoria personalizada, planos de estudo e pratica adaptativa.</p>
          </div>

          <div className="rounded-[1.2vw] p-[3vw] flex flex-col" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)" }}>
            <div className="flex items-center gap-[1.5vw] mb-[2.5vh]">
              <div className="w-[4vw] h-[4vw] rounded-[1vw] flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}>
                <div className="w-[2vw] h-[0.4vw] rounded-full" style={{ background: "#F59E0B" }} />
              </div>
              <h3 className="font-display font-bold" style={{ fontSize: "2.2vw", color: "#F1F5F9" }}>Professores</h3>
            </div>
            <p className="font-body leading-relaxed" style={{ fontSize: "1.5vw", color: "#94A3B8" }}>Educadores que gerenciam turmas, acompanham desempenho individual e criam planos de aula com suporte de IA.</p>
          </div>

          <div className="rounded-[1.2vw] p-[3vw] flex flex-col" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center gap-[1.5vw] mb-[2.5vh]">
              <div className="w-[4vw] h-[4vw] rounded-[1vw] flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="w-[1.6vw] h-[1.6vw] rounded-[0.4vw]" style={{ background: "#94A3B8" }} />
              </div>
              <h3 className="font-display font-bold" style={{ fontSize: "2.2vw", color: "#F1F5F9" }}>Instituicoes</h3>
            </div>
            <p className="font-body leading-relaxed" style={{ fontSize: "1.5vw", color: "#94A3B8" }}>Escolas e cursinhos com gestao de turmas, analise de resultados agregados e painel administrativo completo.</p>
          </div>

          <div className="rounded-[1.2vw] p-[3vw] flex flex-col" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center gap-[1.5vw] mb-[2.5vh]">
              <div className="w-[4vw] h-[4vw] rounded-[1vw] flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="w-[1.6vw] h-[1.6vw] rounded-full" style={{ background: "#94A3B8" }} />
              </div>
              <h3 className="font-display font-bold" style={{ fontSize: "2.2vw", color: "#F1F5F9" }}>Governo</h3>
            </div>
            <p className="font-body leading-relaxed" style={{ fontSize: "1.5vw", color: "#94A3B8" }}>Orgaos publicos com acesso a metricas educacionais agregadas, crescimento semanal e analise de politicas.</p>
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
