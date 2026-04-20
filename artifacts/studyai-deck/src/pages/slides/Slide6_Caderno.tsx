export default function Slide6_Caderno() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0F172A" }}>
      <div className="absolute top-0 right-0 w-[45vw] h-[50vh] opacity-8 pointer-events-none" style={{ background: "radial-gradient(ellipse, #6366F1 0%, transparent 70%)", transform: "translate(25%, -25%)" }} />

      <div className="relative h-full flex px-[8vw] py-[7vh] gap-[5vw] items-center">
        <div className="flex flex-col w-[50%]">
          <p className="font-display font-semibold tracking-widest uppercase mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#6366F1" }}>Caderno Digital</p>
          <h2 className="font-display font-extrabold tracking-tight leading-tight mb-[1.5vh]" style={{ fontSize: "4vw", color: "#F1F5F9" }}>
            Notebook com RAG
          </h2>
          <div className="inline-block px-[1.5vw] py-[0.7vh] rounded-full mb-[3vh]" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
            <span className="font-display font-bold tracking-wider uppercase" style={{ fontSize: "1.2vw", color: "#F59E0B" }}>Retrieval-Augmented Generation</span>
          </div>
          <p className="font-body leading-relaxed" style={{ fontSize: "1.6vw", color: "#94A3B8" }}>
            Upload de documentos, busca semantica por embeddings e ferramentas de IA integradas diretamente nas anotacoes do aluno.
          </p>
        </div>

        <div className="flex-1 flex flex-col gap-[2vh]">
          <div className="rounded-[1vw] px-[2.5vw] py-[2.2vh]" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <p className="font-display font-semibold mb-[0.6vh]" style={{ fontSize: "1.6vw", color: "#F1F5F9" }}>Upload de documentos</p>
            <p className="font-body" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>PDF, DOCX, TXT — indexados por OpenAI Embeddings</p>
          </div>

          <div className="rounded-[1vw] px-[2.5vw] py-[2.2vh]" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <p className="font-display font-semibold mb-[0.6vh]" style={{ fontSize: "1.6vw", color: "#F1F5F9" }}>Busca semantica</p>
            <p className="font-body" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Respostas baseadas nos proprios materiais do estudante</p>
          </div>

          <div className="rounded-[1vw] px-[2.5vw] py-[2.2vh]" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <p className="font-display font-semibold mb-[0.6vh]" style={{ fontSize: "1.6vw", color: "#F1F5F9" }}>Ferramentas de IA</p>
            <p className="font-body" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Resumo, pontos-chave, flashcards e questoes a partir das notas</p>
          </div>

          <div className="rounded-[1vw] px-[2.5vw] py-[2.2vh]" style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <p className="font-display font-semibold mb-[0.6vh]" style={{ fontSize: "1.6vw", color: "#F1F5F9" }}>Organizacao por materia</p>
            <p className="font-body" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Tags por disciplina, busca full-text e auto-save</p>
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
