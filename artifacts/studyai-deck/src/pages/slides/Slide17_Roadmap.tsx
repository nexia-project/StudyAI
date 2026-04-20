export default function Slide17_Roadmap() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0F172A" }}>
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(99,102,241,0.3) 0%, transparent 60%)" }} />

      <div className="relative h-full flex flex-col px-[8vw] pt-[6vh] pb-[5vh]">
        <div className="mb-[4vh]">
          <p className="font-display font-semibold tracking-widest uppercase mb-[1vh]" style={{ fontSize: "1.3vw", color: "#6366F1" }}>Visao de Futuro</p>
          <h2 className="font-display font-extrabold tracking-tight" style={{ fontSize: "3.8vw", color: "#F1F5F9" }}>Roadmap 2026–2027</h2>
        </div>

        <div className="relative flex-1 flex flex-col justify-center">
          <div className="absolute left-[7vw] right-[7vw] top-[50%] h-[0.25vh]" style={{ background: "rgba(99,102,241,0.25)", transform: "translateY(-50%)" }} />

          <div className="grid grid-cols-4 gap-[2vw]">
            <div className="flex flex-col items-center gap-[2vh]">
              <div className="rounded-[1vw] p-[1.8vw] w-full" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.25))", border: "1px solid rgba(99,102,241,0.5)" }}>
                <p className="font-display font-bold mb-[0.5vh]" style={{ fontSize: "1.3vw", color: "#6366F1" }}>Q2 2026</p>
                <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.5vw", color: "#F1F5F9" }}>MVP Lancado</p>
                <div className="flex flex-col gap-[0.8vh]">
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Professor Tiagao ativo</p>
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Flashcards SM-2</p>
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Simulados adaptativos</p>
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Caderno RAG</p>
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Web + Mobile</p>
                </div>
              </div>
              <div className="w-[1.5vw] h-[1.5vw] rounded-full border-[0.2vw]" style={{ background: "#6366F1", borderColor: "#6366F1", boxShadow: "0 0 1.5vw rgba(99,102,241,0.6)" }} />
            </div>

            <div className="flex flex-col items-center gap-[2vh]">
              <div className="rounded-[1vw] p-[1.8vw] w-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <p className="font-display font-bold mb-[0.5vh]" style={{ fontSize: "1.3vw", color: "#10B981" }}>Q3 2026</p>
                <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.5vw", color: "#F1F5F9" }}>B2B e Escolas</p>
                <div className="flex flex-col gap-[0.8vh]">
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Painel professor completo</p>
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Admin de escola</p>
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Relatorios automaticos</p>
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Metodo Kumon digital</p>
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>50 escolas parceiras</p>
                </div>
              </div>
              <div className="w-[1.5vw] h-[1.5vw] rounded-full border-[0.2vw]" style={{ background: "rgba(16,185,129,0.3)", borderColor: "#10B981" }} />
            </div>

            <div className="flex flex-col items-center gap-[2vh]">
              <div className="rounded-[1vw] p-[1.8vw] w-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <p className="font-display font-bold mb-[0.5vh]" style={{ fontSize: "1.3vw", color: "#F59E0B" }}>Q4 2026</p>
                <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.5vw", color: "#F1F5F9" }}>Governo e Parceiros</p>
                <div className="flex flex-col gap-[0.8vh]">
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>API para secretarias de educacao</p>
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Integracao MEC</p>
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>100k usuarios</p>
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>IA de imagem propria</p>
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Aula ao vivo com professor</p>
                </div>
              </div>
              <div className="w-[1.5vw] h-[1.5vw] rounded-full border-[0.2vw]" style={{ background: "rgba(245,158,11,0.3)", borderColor: "#F59E0B" }} />
            </div>

            <div className="flex flex-col items-center gap-[2vh]">
              <div className="rounded-[1vw] p-[1.8vw] w-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <p className="font-display font-bold mb-[0.5vh]" style={{ fontSize: "1.3vw", color: "#8B5CF6" }}>2027</p>
                <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.5vw", color: "#F1F5F9" }}>Expansao LATAM</p>
                <div className="flex flex-col gap-[0.8vh]">
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Argentina, Colombia, Mexico</p>
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Tutor multi-idioma</p>
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>1 milhao de alunos</p>
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Modelo proprio fine-tuned</p>
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Serie A / fundo</p>
                </div>
              </div>
              <div className="w-[1.5vw] h-[1.5vw] rounded-full border-[0.2vw]" style={{ background: "rgba(139,92,246,0.3)", borderColor: "#8B5CF6" }} />
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
