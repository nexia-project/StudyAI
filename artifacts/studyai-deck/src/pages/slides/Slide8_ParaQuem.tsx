export default function Slide8_ParaQuem() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0F172A" }}>
      <div className="absolute top-0 left-0 w-[30vw] h-[30vh] opacity-8 pointer-events-none" style={{ background: "radial-gradient(ellipse, #6366F1 0%, transparent 70%)" }} />

      <div className="relative h-full flex flex-col px-[8vw] pt-[6vh] pb-[5vh]">
        <div className="mb-[3.5vh]">
          <p className="font-display font-semibold tracking-widest uppercase mb-[1vh]" style={{ fontSize: "1.3vw", color: "#6366F1" }}>Público-Alvo</p>
          <h2 className="font-display font-extrabold tracking-tight" style={{ fontSize: "4vw", color: "#F1F5F9" }}>Para Quem é o StudyAI?</h2>
        </div>

        <div className="grid grid-cols-3 gap-[2vw] flex-1">
          <div className="rounded-[1.2vw] p-[2.5vw] flex flex-col justify-between" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)" }}>
            <div>
              <div className="w-[3.5vw] h-[3.5vw] rounded-[0.8vw] flex items-center justify-center mb-[2vh]" style={{ background: "rgba(99,102,241,0.2)" }}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: "2vw", height: "2vw" }}>
                  <circle cx="12" cy="7" r="4" fill="#6366F1" opacity="0.8"/>
                  <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "2vw", color: "#F1F5F9" }}>Estudante Individual</h3>
              <p className="font-body leading-relaxed mb-[2vh]" style={{ fontSize: "1.4vw", color: "#94A3B8" }}>Vestibulando buscando aprovação no ENEM, FUVEST, UNICAMP ou qualquer vestibular estadual.</p>
              <div className="flex flex-col gap-[0.8vh]">
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.4vw] h-[0.4vw] rounded-full" style={{ background: "#6366F1" }} />
                  <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Ensino Médio — 1ª a 3ª Série</p>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.4vw] h-[0.4vw] rounded-full" style={{ background: "#6366F1" }} />
                  <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Reforço escolar autônomo</p>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.4vw] h-[0.4vw] rounded-full" style={{ background: "#6366F1" }} />
                  <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Aluno de cursinho presencial</p>
                </div>
              </div>
            </div>
            <div className="mt-[2vh] rounded-[0.8vw] px-[1.5vw] py-[1.2vh] text-center" style={{ background: "rgba(99,102,241,0.15)" }}>
              <p className="font-display font-bold" style={{ fontSize: "1.3vw", color: "#6366F1" }}>4,8 mi candidatos ENEM/ano</p>
            </div>
          </div>

          <div className="rounded-[1.2vw] p-[2.5vw] flex flex-col justify-between" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <div>
              <div className="w-[3.5vw] h-[3.5vw] rounded-[0.8vw] flex items-center justify-center mb-[2vh]" style={{ background: "rgba(16,185,129,0.2)" }}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: "2vw", height: "2vw" }}>
                  <rect x="3" y="3" width="18" height="14" rx="2" stroke="#10B981" strokeWidth="1.5"/>
                  <path d="M8 21h8M12 17v4" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="8" cy="10" r="1.5" fill="#10B981"/>
                  <circle cx="12" cy="10" r="1.5" fill="#10B981" opacity="0.6"/>
                  <circle cx="16" cy="10" r="1.5" fill="#10B981" opacity="0.3"/>
                </svg>
              </div>
              <h3 className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "2vw", color: "#F1F5F9" }}>Escolas e Cursinhos</h3>
              <p className="font-body leading-relaxed mb-[2vh]" style={{ fontSize: "1.4vw", color: "#94A3B8" }}>Instituições de ensino que desejam oferecer tutor IA como diferencial competitivo para suas turmas.</p>
              <div className="flex flex-col gap-[0.8vh]">
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.4vw] h-[0.4vw] rounded-full" style={{ background: "#10B981" }} />
                  <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Escolas particulares e COC</p>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.4vw] h-[0.4vw] rounded-full" style={{ background: "#10B981" }} />
                  <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Cursinhos pré-vestibular</p>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.4vw] h-[0.4vw] rounded-full" style={{ background: "#10B981" }} />
                  <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Secretarias de Educação</p>
                </div>
              </div>
            </div>
            <div className="mt-[2vh] rounded-[0.8vw] px-[1.5vw] py-[1.2vh] text-center" style={{ background: "rgba(16,185,129,0.15)" }}>
              <p className="font-display font-bold" style={{ fontSize: "1.3vw", color: "#10B981" }}>39.000 escolas no Brasil</p>
            </div>
          </div>

          <div className="rounded-[1.2vw] p-[2.5vw] flex flex-col justify-between" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <div>
              <div className="w-[3.5vw] h-[3.5vw] rounded-[0.8vw] flex items-center justify-center mb-[2vh]" style={{ background: "rgba(245,158,11,0.2)" }}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: "2vw", height: "2vw" }}>
                  <circle cx="8" cy="8" r="3" fill="#F59E0B" opacity="0.8"/>
                  <circle cx="16" cy="8" r="3" fill="#F59E0B" opacity="0.5"/>
                  <circle cx="12" cy="16" r="3" fill="#F59E0B" opacity="0.6"/>
                  <path d="M8 11v2M16 11v2M12 8v5" stroke="#F59E0B" strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
                </svg>
              </div>
              <h3 className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "2vw", color: "#F1F5F9" }}>Pais e Famílias</h3>
              <p className="font-body leading-relaxed mb-[2vh]" style={{ fontSize: "1.4vw", color: "#94A3B8" }}>Famílias que buscam uma alternativa de alto custo-benefício ao reforço particular e cursinhos tradicionais.</p>
              <div className="flex flex-col gap-[0.8vh]">
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.4vw] h-[0.4vw] rounded-full" style={{ background: "#F59E0B" }} />
                  <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Classe média — C1 e B</p>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.4vw] h-[0.4vw] rounded-full" style={{ background: "#F59E0B" }} />
                  <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Visibilidade em tempo real</p>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.4vw] h-[0.4vw] rounded-full" style={{ background: "#F59E0B" }} />
                  <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>20x mais barato que aula particular</p>
                </div>
              </div>
            </div>
            <div className="mt-[2vh] rounded-[0.8vw] px-[1.5vw] py-[1.2vh] text-center" style={{ background: "rgba(245,158,11,0.15)" }}>
              <p className="font-display font-bold" style={{ fontSize: "1.3vw", color: "#F59E0B" }}>R$ 49 vs R$ 800 / mês reforço</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-[8vw] py-[2vh] flex justify-between items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="font-display font-bold" style={{ fontSize: "1.4vw", color: "#6366F1" }}>StudyAI</span>
        <span className="font-body" style={{ fontSize: "1.2vw", color: "#475569" }}>15 / 17</span>
        <span className="font-body" style={{ fontSize: "1.3vw", color: "#475569" }}>study.ia.br</span>
      </div>
    </div>
  );
}
