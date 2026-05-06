export default function Slide11_Kumon() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0F172A" }}>
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 80% at 15% 50%, rgba(245,158,11,0.25) 0%, transparent 60%)" }} />

      <div className="relative h-full flex flex-col px-[8vw] pt-[6vh] pb-[5vh]">
        <div className="mb-[3.5vh]">
          <p className="font-display font-semibold tracking-widest uppercase mb-[1vh]" style={{ fontSize: "1.3vw", color: "#F59E0B" }}>Método de Aprendizado</p>
          <h2 className="font-display font-extrabold tracking-tight" style={{ fontSize: "3.8vw", color: "#F1F5F9" }}>Progressão Estilo Kumon</h2>
          <p className="font-body mt-[1vh]" style={{ fontSize: "1.4vw", color: "#94A3B8" }}>Domínio total antes de avançar — com IA que adapta o ritmo individualmente</p>
        </div>

        <div className="flex gap-[3vw] flex-1">
          <div className="flex flex-col gap-[1.8vh] flex-1">
            <div className="rounded-[1vw] p-[1.8vw] flex items-center gap-[1.5vw]" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <div className="w-[3.5vw] h-[3.5vw] rounded-full flex items-center justify-center flex-shrink-0 font-display font-extrabold" style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", fontSize: "1.6vw", color: "#0F172A" }}>1</div>
              <div>
                <p className="font-display font-bold" style={{ fontSize: "1.5vw", color: "#F1F5F9" }}>Diagnóstico Inicial</p>
                <p className="font-body" style={{ fontSize: "1.2vw", color: "#94A3B8" }}>Teste adaptativo que mede o nível real do aluno em cada matéria — sem chute, com confiança estatística</p>
              </div>
            </div>

            <div className="rounded-[1vw] p-[1.8vw] flex items-center gap-[1.5vw]" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)" }}>
              <div className="w-[3.5vw] h-[3.5vw] rounded-full flex items-center justify-center flex-shrink-0 font-display font-extrabold" style={{ background: "linear-gradient(135deg, #6366F1, #4F46E5)", fontSize: "1.6vw", color: "#F1F5F9" }}>2</div>
              <div>
                <p className="font-display font-bold" style={{ fontSize: "1.5vw", color: "#F1F5F9" }}>Micro-séries de Exercícios</p>
                <p className="font-body" style={{ fontSize: "1.2vw", color: "#94A3B8" }}>Séries curtas de 5–10 questões por tópico, ordenadas por dificuldade crescente — idêntico ao método Kumon</p>
              </div>
            </div>

            <div className="rounded-[1vw] p-[1.8vw] flex items-center gap-[1.5vw]" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)" }}>
              <div className="w-[3.5vw] h-[3.5vw] rounded-full flex items-center justify-center flex-shrink-0 font-display font-extrabold" style={{ background: "linear-gradient(135deg, #10B981, #0D9488)", fontSize: "1.6vw", color: "#F1F5F9" }}>3</div>
              <div>
                <p className="font-display font-bold" style={{ fontSize: "1.5vw", color: "#F1F5F9" }}>Domínio Exigido</p>
                <p className="font-body" style={{ fontSize: "1.2vw", color: "#94A3B8" }}>80% de acerto exigido antes de avançar ao tópico seguinte — garantia real de aprendizado sólido</p>
              </div>
            </div>

            <div className="rounded-[1vw] p-[1.8vw] flex items-center gap-[1.5vw]" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)" }}>
              <div className="w-[3.5vw] h-[3.5vw] rounded-full flex items-center justify-center flex-shrink-0 font-display font-extrabold" style={{ background: "linear-gradient(135deg, #8B5CF6, #7C3AED)", fontSize: "1.6vw", color: "#F1F5F9" }}>4</div>
              <div>
                <p className="font-display font-bold" style={{ fontSize: "1.5vw", color: "#F1F5F9" }}>Revisão Espaçada SM-2</p>
                <p className="font-body" style={{ fontSize: "1.2vw", color: "#94A3B8" }}>Algoritmo SuperMemo 2 agenda revisões no momento certo — consolidando na memória de longo prazo</p>
              </div>
            </div>
          </div>

          <div className="w-[28vw] flex flex-col gap-[1.8vh]">
            <div className="rounded-[1.2vw] p-[2vw] flex-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="font-display font-bold mb-[2vh]" style={{ fontSize: "1.4vw", color: "#F1F5F9" }}>Diferenciais vs. Kumon Tradicional</p>
              <div className="flex flex-col gap-[1.4vh]">
                <div className="flex items-start gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full mt-[0.7vh] flex-shrink-0" style={{ background: "#F59E0B" }} />
                  <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Sem papel — 100% digital com feedback instantâneo por IA</p>
                </div>
                <div className="flex items-start gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full mt-[0.7vh] flex-shrink-0" style={{ background: "#6366F1" }} />
                  <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Professor Tiagão explica cada erro em áudio — sem esperar professor humano</p>
                </div>
                <div className="flex items-start gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full mt-[0.7vh] flex-shrink-0" style={{ background: "#10B981" }} />
                  <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Adaptação em tempo real — dificuldade calibrada por sessão</p>
                </div>
                <div className="flex items-start gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full mt-[0.7vh] flex-shrink-0" style={{ background: "#8B5CF6" }} />
                  <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Integrado com ENEM e banco de questões reais vestibulares</p>
                </div>
                <div className="flex items-start gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full mt-[0.7vh] flex-shrink-0" style={{ background: "#EF4444" }} />
                  <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Custo 20x menor que mensalidade Kumon presencial</p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.2vw] p-[2vw] text-center" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(99,102,241,0.15))", border: "1px solid rgba(245,158,11,0.3)" }}>
              <p className="font-display font-extrabold" style={{ fontSize: "3vw", color: "#F59E0B" }}>+340%</p>
              <p className="font-body" style={{ fontSize: "1.2vw", color: "#94A3B8" }}>melhora na retenção vs. estudo linear tradicional</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-[8vw] py-[2vh] flex justify-between items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="font-display font-bold" style={{ fontSize: "1.4vw", color: "#6366F1" }}>StudyAI</span>
        <span className="font-body" style={{ fontSize: "1.2vw", color: "#475569" }}>05 / 17</span>
        <span className="font-body" style={{ fontSize: "1.3vw", color: "#475569" }}>study.ia.br</span>
      </div>
    </div>
  );
}
