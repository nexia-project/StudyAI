const base = import.meta.env.BASE_URL;

export default function Slide1_Capa() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 65%, #0F172A 100%)" }}>
      <img src={`${base}hero.png`} crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover opacity-20" alt="" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(15,23,42,0.97) 45%, rgba(15,23,42,0.6) 100%)" }} />
      <div className="absolute top-0 right-0 w-[50vw] h-[50vh] opacity-15 pointer-events-none" style={{ background: "radial-gradient(ellipse, #6366F1 0%, transparent 70%)", transform: "translate(20%, -20%)" }} />
      <div className="absolute bottom-0 left-[30vw] w-[30vw] h-[30vh] opacity-10 pointer-events-none" style={{ background: "radial-gradient(ellipse, #F59E0B 0%, transparent 70%)" }} />

      <div className="relative h-full flex flex-col justify-center pl-[8vw]">
        <div className="flex items-center gap-[0.8vw] mb-[4vh]">
          <div className="w-[1.8vw] h-[1.8vw] rounded-[0.35vw]" style={{ background: "#6366F1" }} />
          <span className="font-display font-bold text-[1.6vw] tracking-widest uppercase" style={{ color: "#6366F1" }}>StudyAI</span>
        </div>

        <h1 className="font-display font-extrabold leading-none tracking-tighter mb-[1.5vh]" style={{ fontSize: "7vw", color: "#F1F5F9" }}>
          O Tutor de IA
        </h1>
        <h2 className="font-display font-bold leading-tight mb-[4vh]" style={{ fontSize: "3.2vw", color: "#6366F1" }}>
          para o ENEM e Vestibular
        </h2>

        <div className="w-[6vw] h-[0.35vh] mb-[3.5vh]" style={{ background: "#F59E0B" }} />

        <p className="font-body font-medium" style={{ fontSize: "1.9vw", color: "#94A3B8" }}>
          IA que educa. Voz que inspira.
        </p>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-[8vw] py-[2.5vh] flex justify-between items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <span className="font-body" style={{ fontSize: "1.4vw", color: "#94A3B8" }}>study.ia.br</span>
        <span className="font-body" style={{ fontSize: "1.2vw", color: "#475569" }}>01 / 17</span>
        <span className="font-body" style={{ fontSize: "1.4vw", color: "#94A3B8" }}>Abril 2026</span>
      </div>
    </div>
  );
}
