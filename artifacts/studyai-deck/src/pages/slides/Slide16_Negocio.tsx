export default function Slide16_Negocio() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0F172A" }}>
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 60% at 80% 30%, rgba(245,158,11,0.2) 0%, transparent 60%)" }} />

      <div className="relative h-full flex flex-col px-[8vw] pt-[5vh] pb-[4vh]">
        <div className="mb-[2.5vh]">
          <p className="font-display font-semibold tracking-widest uppercase mb-[0.8vh]" style={{ fontSize: "1.3vw", color: "#F59E0B" }}>Modelo de Negócio</p>
          <h2 className="font-display font-extrabold tracking-tight" style={{ fontSize: "3.5vw", color: "#F1F5F9" }}>Monetização e Expansão</h2>
        </div>

        <div className="grid grid-cols-3 gap-[1.5vw] flex-1">
          <div className="flex flex-col gap-[1.5vw]">
            <div className="rounded-[1vw] p-[2vw]" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)" }}>
              <p className="font-display font-bold mb-[1vh]" style={{ fontSize: "1.4vw", color: "#6366F1" }}>Freemium B2C</p>
              <p className="font-display font-extrabold mb-[0.5vh]" style={{ fontSize: "2.5vw", color: "#F1F5F9" }}>R$ 49/mês</p>
              <p className="font-body mb-[1.5vh]" style={{ fontSize: "1.1vw", color: "#94A3B8" }}>Plano individual — acesso completo</p>
              <div className="flex flex-col gap-[0.8vh]">
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.4vw] h-[0.4vw] rounded-full" style={{ background: "#6366F1" }} />
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Todos os módulos</p>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.4vw] h-[0.4vw] rounded-full" style={{ background: "#6366F1" }} />
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Voz ilimitada com Professor Tiagão</p>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.4vw] h-[0.4vw] rounded-full" style={{ background: "#6366F1" }} />
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Caderno RAG com upload</p>
                </div>
              </div>
            </div>

            <div className="rounded-[1vw] p-[2vw] flex-1" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <p className="font-display font-bold mb-[1vh]" style={{ fontSize: "1.4vw", color: "#10B981" }}>B2B — Escolas</p>
              <p className="font-display font-extrabold mb-[0.5vh]" style={{ fontSize: "2.5vw", color: "#F1F5F9" }}>R$ 19/aluno</p>
              <p className="font-body mb-[1.5vh]" style={{ fontSize: "1.1vw", color: "#94A3B8" }}>Licença anual para instituições</p>
              <div className="flex flex-col gap-[0.8vh]">
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.4vw] h-[0.4vw] rounded-full" style={{ background: "#10B981" }} />
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Dashboard do professor</p>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.4vw] h-[0.4vw] rounded-full" style={{ background: "#10B981" }} />
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Relatórios para pais e direção</p>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.4vw] h-[0.4vw] rounded-full" style={{ background: "#10B981" }} />
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Currículo alinhado à BNCC</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-[1.5vw]">
            <div className="rounded-[1vw] p-[2vw]" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <p className="font-display font-bold mb-[1vh]" style={{ fontSize: "1.4vw", color: "#F59E0B" }}>White-label</p>
              <p className="font-display font-extrabold mb-[0.5vh]" style={{ fontSize: "2.5vw", color: "#F1F5F9" }}>Sob consulta</p>
              <p className="font-body mb-[1.5vh]" style={{ fontSize: "1.1vw", color: "#94A3B8" }}>Cursinhos e grupos educacionais</p>
              <div className="flex flex-col gap-[0.8vh]">
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.4vw] h-[0.4vw] rounded-full" style={{ background: "#F59E0B" }} />
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Marca própria do cliente</p>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.4vw] h-[0.4vw] rounded-full" style={{ background: "#F59E0B" }} />
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>API completa + suporte dedicado</p>
                </div>
              </div>
            </div>

            <div className="rounded-[1vw] p-[2vw] flex-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.4vw", color: "#94A3B8" }}>Projeção de Receita</p>
              <div className="flex flex-col gap-[1vh]">
                <div className="flex justify-between items-center">
                  <span className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Lançado em</span>
                  <span className="font-display font-bold" style={{ fontSize: "1.3vw", color: "#F1F5F9" }}>Jan 2026</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>MRR atual</span>
                  <span className="font-display font-bold" style={{ fontSize: "1.3vw", color: "#10B981" }}>R$ 187K</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Meta 12 meses</span>
                  <span className="font-display font-bold" style={{ fontSize: "1.3vw", color: "#F59E0B" }}>R$ 1,2 Milhão</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Churn mensal</span>
                  <span className="font-display font-bold" style={{ fontSize: "1.3vw", color: "#6366F1" }}>2,1%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-[1.5vw]">
            <div className="rounded-[1vw] p-[2vw] flex-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.4vw", color: "#94A3B8" }}>Estratégia de Expansão</p>
              <div className="flex flex-col gap-[1.5vh]">
                <div className="flex items-start gap-[1vw]">
                  <div className="w-[2.2vw] h-[2.2vw] rounded-full flex-shrink-0 flex items-center justify-center font-display font-extrabold" style={{ background: "rgba(99,102,241,0.2)", border: "1px solid #6366F1", fontSize: "1vw", color: "#6366F1" }}>1</div>
                  <div>
                    <p className="font-display font-semibold" style={{ fontSize: "1.3vw", color: "#F1F5F9" }}>Brasil — ENEM e Vestibular</p>
                    <p className="font-body" style={{ fontSize: "1.1vw", color: "#94A3B8" }}>Market primário — 4,8 milhões de candidatos/ano</p>
                  </div>
                </div>
                <div className="flex items-start gap-[1vw]">
                  <div className="w-[2.2vw] h-[2.2vw] rounded-full flex-shrink-0 flex items-center justify-center font-display font-extrabold" style={{ background: "rgba(245,158,11,0.2)", border: "1px solid #F59E0B", fontSize: "1vw", color: "#F59E0B" }}>2</div>
                  <div>
                    <p className="font-display font-semibold" style={{ fontSize: "1.3vw", color: "#F1F5F9" }}>América Latina — PAES e Saber</p>
                    <p className="font-body" style={{ fontSize: "1.1vw", color: "#94A3B8" }}>México, Chile, Colômbia — 2027</p>
                  </div>
                </div>
                <div className="flex items-start gap-[1vw]">
                  <div className="w-[2.2vw] h-[2.2vw] rounded-full flex-shrink-0 flex items-center justify-center font-display font-extrabold" style={{ background: "rgba(16,185,129,0.2)", border: "1px solid #10B981", fontSize: "1vw", color: "#10B981" }}>3</div>
                  <div>
                    <p className="font-display font-semibold" style={{ fontSize: "1.3vw", color: "#F1F5F9" }}>Idiomas — SAT, GMAT, OAB</p>
                    <p className="font-body" style={{ fontSize: "1.1vw", color: "#94A3B8" }}>Expansão vertical — 2028</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1vw] p-[2vw] text-center" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(99,102,241,0.15))", border: "1px solid rgba(245,158,11,0.3)" }}>
              <p className="font-display font-extrabold" style={{ fontSize: "3.5vw", color: "#F59E0B" }}>50K</p>
              <p className="font-body" style={{ fontSize: "1.1vw", color: "#94A3B8" }}>alunos meta — 12 meses</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-[8vw] py-[2vh] flex justify-between items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="font-display font-bold" style={{ fontSize: "1.4vw", color: "#6366F1" }}>StudyAI</span>
        <span className="font-body" style={{ fontSize: "1.2vw", color: "#475569" }}>14 / 17</span>
        <span className="font-body" style={{ fontSize: "1.3vw", color: "#475569" }}>study.ia.br</span>
      </div>
    </div>
  );
}
