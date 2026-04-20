/**
 * Estilo Atual — Lousa escura + personagem estático (referência)
 */
import { useState, useEffect } from "react";

const CHALK_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&display=swap');
  @keyframes typewriter {
    from { clip-path: inset(0 100% 0 0); }
    to   { clip-path: inset(0 0% 0 0); }
  }
  @keyframes float {
    0%,100% { transform: translateY(0) rotate(-1deg); }
    50% { transform: translateY(-10px) rotate(1deg); }
  }
  @keyframes aura {
    0%,100% { transform: scale(1); opacity: 0.2; }
    50% { transform: scale(1.15); opacity: 0.35; }
  }
  @keyframes pulse {
    0%,100% { transform: scale(1); }
    50% { transform: scale(1.08); }
  }
  .char-float { animation: float 3.2s ease-in-out infinite; }
  .char-aura  { animation: aura 3.5s ease-in-out infinite; }
  .t1 { animation: typewriter 1.8s steps(24,end) 0.3s both; }
  .t2 { animation: typewriter 2.0s steps(30,end) 2.3s both; }
  .t3 { animation: typewriter 1.5s steps(22,end) 4.5s both; }
  .t4 { animation: typewriter 1.5s steps(20,end) 6.3s both; }
`;

function ChalkText({ children, className = "", style = {} }: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={className} style={{
      fontFamily: "Caveat, cursive",
      color: "#E2E8F0",
      textShadow: "0 0 8px rgba(226,232,240,0.3), 2px 2px 4px rgba(0,0,0,0.5)",
      whiteSpace: "pre-wrap",
      ...style,
    }}>
      {children}
    </div>
  );
}

export function EstiloAtual() {
  const [charState, setCharState] = useState<"idle"|"speaking">("idle");

  useEffect(() => {
    const t1 = setTimeout(() => setCharState("speaking"), 800);
    const t2 = setTimeout(() => setCharState("idle"), 5000);
    const t3 = setTimeout(() => setCharState("speaking"), 7000);
    return () => [t1,t2,t3].forEach(clearTimeout);
  }, []);

  return (
    <div style={{
      width: "100%", minHeight: "100vh",
      background: "#0a0a0f",
      display: "flex", flexDirection: "column",
      fontFamily: "system-ui, sans-serif",
    }}>
      <style>{CHALK_CSS}</style>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        padding: "12px 24px",
        display: "flex", alignItems: "center", gap: 12,
        borderBottom: "1px solid rgba(99,102,241,0.2)",
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "rgba(99,102,241,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, border: "1px solid rgba(99,102,241,0.3)",
        }}>📖</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: "white" }}>Aula com o Professor</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Fotossíntese • ENEM 2025</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {["▶ Reproduzindo", "⏸", "⏭"].map((b, i) => (
            <div key={i} style={{
              padding: "4px 10px", borderRadius: 6, cursor: "pointer",
              background: i === 0 ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)",
              fontSize: 12, color: i === 0 ? "#A5B4FC" : "rgba(255,255,255,0.5)",
              fontWeight: i === 0 ? 700 : 400,
              border: i === 0 ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(255,255,255,0.08)",
            }}>{b}</div>
          ))}
        </div>
      </div>

      {/* Área principal */}
      <div style={{ flex: 1, display: "flex", gap: 0, padding: 20, alignItems: "stretch" }}>
        {/* Lousa escura */}
        <div style={{
          flex: 1,
          background: "linear-gradient(145deg, #1a2a1a 0%, #142214 100%)",
          borderRadius: 12,
          border: "3px solid #2d4a2d",
          boxShadow: "inset 0 0 40px rgba(0,0,0,0.5), 0 4px 20px rgba(0,0,0,0.4)",
          padding: "32px 40px",
          overflow: "hidden",
          position: "relative",
        }}>
          {/* Chalk dust effect */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
            background: "rgba(255,255,255,0.05)",
          }} />

          {/* Título */}
          <div style={{ marginBottom: 24 }}>
            <ChalkText className="t1" style={{ fontSize: 36, fontWeight: 700 }}>
              Fotossíntese
            </ChalkText>
            <div style={{
              height: 3, width: 200, marginTop: 4,
              background: "rgba(250,204,21,0.7)",
              boxShadow: "0 0 8px rgba(250,204,21,0.3)",
              borderRadius: 2,
            }} />
          </div>

          {/* Conteúdo */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <ChalkText className="t2" style={{ fontSize: 22 }}>
              ☀️  Luz solar + CO₂ + H₂O  →  Glicose + O₂
            </ChalkText>
            <ChalkText className="t3" style={{ fontSize: 20, color: "#86EFAC" }}>
              [Destaque]  Cloroplastos — sede da reação
            </ChalkText>
            <ChalkText className="t4" style={{ fontSize: 19, color: "#93C5FD" }}>
              →  Fase clara (tilacóides) + Fase escura (estroma)
            </ChalkText>

            {/* Caixa fórmula */}
            <div style={{
              marginTop: 8,
              padding: "16px 20px",
              background: "rgba(250,204,21,0.08)",
              border: "2px solid rgba(250,204,21,0.3)",
              borderRadius: 8,
              animation: "pulse 3s ease-in-out 6s infinite",
            }}>
              <ChalkText style={{ fontSize: 20, color: "#FEF08A" }}>
                6CO₂ + 6H₂O + luz  →  C₆H₁₂O₆ + 6O₂
              </ChalkText>
            </div>

            {/* Box ENEM */}
            <div style={{
              padding: "12px 16px",
              background: "rgba(134,239,172,0.06)",
              border: "2px solid rgba(134,239,172,0.25)",
              borderRadius: 8,
            }}>
              <ChalkText style={{ fontSize: 16, color: "#86EFAC" }}>
                🎯 ENEM: Fase clara x Fase escura (Calvin) são os pontos mais cobrados
              </ChalkText>
            </div>
          </div>
        </div>

        {/* Personagem estático */}
        <div style={{
          width: 180,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: 8,
          position: "relative",
        }}>
          {/* Aura */}
          <div className="char-aura" style={{
            position: "absolute",
            bottom: 60,
            width: 160, height: 160,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)",
          }} />

          {/* Personagem flutuando — PNG estático */}
          <div className="char-float" style={{
            width: 140, height: 140,
            background: "rgba(99,102,241,0.1)",
            borderRadius: "50%",
            border: "2px solid rgba(99,102,241,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 60,
            marginBottom: 8,
          }}>
            🧑‍🏫
          </div>

          {/* Indicador de estado */}
          {charState === "speaking" && (
            <div style={{ display: "flex", gap: 3, alignItems: "center", marginBottom: 4 }}>
              {[0,80,160,80,0].map((delay, i) => (
                <div key={i} style={{
                  width: 4, background: "#A855F7", borderRadius: 2,
                  height: [5,8,12,8,5][i],
                  animation: `pulse 0.6s ease-in-out ${delay}ms infinite`,
                }} />
              ))}
            </div>
          )}

          <div style={{
            textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.5)",
            fontWeight: 600,
          }}>
            <span style={{ color: "#22C55E", marginRight: 4 }}>●</span>
            {charState === "speaking" ? "Falando" : "Online"}
          </div>
        </div>
      </div>

      {/* Narração */}
      <div style={{
        background: "#111827",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        padding: "12px 24px",
        display: "flex", gap: 12, alignItems: "center",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "linear-gradient(135deg, #7C3AED, #4338CA)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, fontSize: 14,
        }}>
          {charState === "speaking" ? "🎙️" : "▶"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.5 }}>
            {charState === "speaking"
              ? "\"...a fotossíntese ocorre em dois estágios: a fase clara e a fase escura...\""
              : "Clique em ▶ para ouvir o Professor Tiagão"}
          </div>
        </div>
      </div>

      {/* Etapas */}
      <div style={{
        background: "#111827",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        padding: "8px 24px",
        display: "flex", gap: 8, overflowX: "auto",
      }}>
        {["Introdução","Fase Clara","Fase Escura","Equação","ENEM Tips"].map((step, i) => (
          <div key={i} style={{
            flexShrink: 0,
            padding: "6px 14px", borderRadius: 20,
            fontSize: 12,
            background: i === 1 ? "#4338CA" : "rgba(255,255,255,0.06)",
            color: i === 1 ? "white" : "rgba(255,255,255,0.4)",
            fontWeight: i === 1 ? 700 : 400,
            cursor: "pointer",
          }}>
            {i+1}. {step}
          </div>
        ))}
      </div>
    </div>
  );
}
