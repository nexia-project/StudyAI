/**
 * Bible Project Style — Whiteboard + Animated SVG Professor
 *
 * Estilo:
 * - Fundo branco/creme (lousa clara)
 * - Conteúdo aparece desenhado à mão (stroke-dashoffset animation)
 * - Personagem SVG animado (boca, olhos, braço apontando)
 * - Tipografia caligráfica (Caveat)
 */

import { useState, useEffect } from "react";

// ─── CSS de animações ────────────────────────────────────────────────────────
const ANIMATIONS = `
  @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&display=swap');

  /* Personagem */
  @keyframes breathe {
    0%, 100% { transform: translateY(0px) scaleY(1); }
    50% { transform: translateY(-3px) scaleY(1.01); }
  }
  @keyframes headBob {
    0%, 100% { transform: rotate(-1deg) translateY(0); }
    30% { transform: rotate(1.5deg) translateY(-2px); }
    60% { transform: rotate(-0.5deg) translateY(-1px); }
  }
  @keyframes talk {
    0%, 100% { d: path("M 72 58 Q 82 58 92 58"); }
    25% { d: path("M 72 56 Q 82 64 92 56"); }
    50% { d: path("M 72 57 Q 82 66 92 57"); }
    75% { d: path("M 72 56 Q 82 62 92 56"); }
  }
  @keyframes talkMouth {
    0%, 100% { ry: 1; }
    50% { ry: 6; }
  }
  @keyframes blink {
    0%, 90%, 100% { transform: scaleY(0.05); }
    95% { transform: scaleY(1); }
  }
  @keyframes blinkLid {
    0%, 88%, 100% { transform: scaleY(0); }
    93% { transform: scaleY(1); }
  }
  @keyframes armPoint {
    0%, 100% { transform: rotate(-5deg); }
    50% { transform: rotate(-8deg); }
  }
  @keyframes eyebrowRaise {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-1.5px); }
  }

  /* Lousa — draw-in */
  @keyframes drawStroke {
    from { stroke-dashoffset: 1000; opacity: 0.3; }
    to   { stroke-dashoffset: 0; opacity: 1; }
  }
  @keyframes drawShort {
    from { stroke-dashoffset: 400; opacity: 0; }
    to   { stroke-dashoffset: 0; opacity: 1; }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes boxDraw {
    from { stroke-dashoffset: 600; }
    to   { stroke-dashoffset: 0; }
  }

  .char-body    { animation: breathe 3.5s ease-in-out infinite; transform-origin: bottom center; }
  .char-head    { animation: headBob 3.5s ease-in-out infinite; transform-origin: bottom center; }
  .char-arm-r   { animation: armPoint 2s ease-in-out infinite; transform-origin: 120px 155px; }
  .mouth-shape  { animation: talkMouth 0.4s ease-in-out infinite; transform-origin: 82px 62px; }
  .eyelid-l     { animation: blinkLid 4s ease-in-out infinite; transform-origin: 63px 46px; }
  .eyelid-r     { animation: blinkLid 4s ease-in-out infinite 0.05s; transform-origin: 100px 46px; }
  .brow-l       { animation: eyebrowRaise 3.5s ease-in-out infinite; transform-origin: 63px 38px; }
  .brow-r       { animation: eyebrowRaise 3.5s ease-in-out infinite 0.2s; transform-origin: 100px 38px; }

  .draw-title   { stroke-dasharray: 1000; animation: drawStroke 1.8s cubic-bezier(.4,0,.2,1) 0.3s both; }
  .draw-under   { stroke-dasharray: 300; animation: drawShort 0.8s ease-out 2s both; }
  .draw-line1   { stroke-dasharray: 1000; animation: drawStroke 1.5s ease-out 2.8s both; }
  .draw-line2   { stroke-dasharray: 1000; animation: drawStroke 1.5s ease-out 4.2s both; }
  .draw-line3   { stroke-dasharray: 1000; animation: drawStroke 1.5s ease-out 5.6s both; }
  .draw-box1    { stroke-dasharray: 600; animation: boxDraw 0.9s ease-out 7s both; }
  .draw-arrow   { stroke-dasharray: 400; animation: drawShort 0.7s ease-out 7.8s both; }
  .draw-note    { stroke-dasharray: 1000; animation: drawStroke 1.4s ease-out 8.5s both; }
  .text-title   { animation: fadeIn 0.6s ease-out 2.2s both; }
  .text-l1      { animation: fadeIn 0.5s ease-out 4.3s both; }
  .text-l2      { animation: fadeIn 0.5s ease-out 5.7s both; }
  .text-l3      { animation: fadeIn 0.5s ease-out 7.1s both; }
  .text-box1    { animation: fadeIn 0.5s ease-out 7.9s both; }
  .text-note    { animation: fadeIn 0.5s ease-out 9.3s both; }

  .marker-pen {
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
  }
`;

// ─── Personagem SVG Tiagão ────────────────────────────────────────────────────
function TiagaoSVG({ talking = false }: { talking?: boolean }) {
  return (
    <svg
      viewBox="0 0 165 400"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", overflow: "visible" }}
    >
      <style>{`
        .char-body    { animation: breathe 3.5s ease-in-out infinite; transform-origin: 82px 300px; }
        .char-head    { animation: headBob 3.5s ease-in-out infinite; transform-origin: 82px 170px; }
        .char-arm-r   { animation: armPoint 2s ease-in-out infinite; transform-origin: 115px 165px; }
        .mouth-shape  { animation: talkMouth 0.38s ease-in-out ${talking ? "infinite" : "paused"}; transform-origin: 82px 64px; }
        .eyelid-l     { animation: blinkLid 4.2s ease-in-out infinite; transform-origin: 62px 46px; }
        .eyelid-r     { animation: blinkLid 4.2s ease-in-out infinite 0.06s; transform-origin: 101px 46px; }
        .brow-l       { animation: eyebrowRaise 3.5s ease-in-out infinite; }
        .brow-r       { animation: eyebrowRaise 3.5s ease-in-out infinite 0.2s; }

        @keyframes breathe {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-3px); }
        }
        @keyframes headBob {
          0%,100% { transform: rotate(-1deg); }
          30%     { transform: rotate(1.5deg) translateY(-2px); }
          60%     { transform: rotate(-0.5deg) translateY(-1px); }
        }
        @keyframes armPoint {
          0%,100% { transform: rotate(-5deg); }
          50%     { transform: rotate(-12deg); }
        }
        @keyframes talkMouth {
          0%,100% { ry: 1; }
          50%     { ry: 7; }
        }
        @keyframes blinkLid {
          0%,88%,100% { transform: scaleY(0); }
          93%         { transform: scaleY(1); }
        }
        @keyframes eyebrowRaise {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-2px); }
        }
      `}</style>

      {/* ── Corpo (camisa + calça) ── */}
      <g className="char-body">
        {/* Sapatos */}
        <ellipse cx="60" cy="385" rx="22" ry="9" fill="#2C2C2C" />
        <ellipse cx="105" cy="385" rx="22" ry="9" fill="#2C2C2C" />

        {/* Pernas/calça */}
        <rect x="45" y="285" width="32" height="105" rx="8" fill="#1E3A6E" />
        <rect x="88" y="285" width="32" height="105" rx="8" fill="#1E3A6E" />

        {/* Cinto */}
        <rect x="42" y="282" width="81" height="11" rx="4" fill="#111827" />
        <rect x="76" y="284" width="14" height="7" rx="2" fill="#D97706" />

        {/* Camisa (corpo) */}
        <rect x="38" y="160" width="89" height="132" rx="14" fill="#4338CA" />

        {/* Detalhes da camisa — botões */}
        <circle cx="82" cy="185" r="3" fill="#3730A3" />
        <circle cx="82" cy="200" r="3" fill="#3730A3" />
        <circle cx="82" cy="215" r="3" fill="#3730A3" />

        {/* Bolso da camisa */}
        <rect x="88" y="175" width="22" height="18" rx="3" fill="none" stroke="#3730A3" strokeWidth="2" />

        {/* Braço esquerdo (lado do espectador direito — fica para baixo) */}
        <rect x="18" y="162" width="26" height="75" rx="12" fill="#4338CA" />
        {/* Mão esquerda */}
        <ellipse cx="31" cy="243" rx="13" ry="12" fill="#F4A261" />

        {/* Braço direito (apontando) */}
        <g className="char-arm-r">
          <rect x="121" y="152" width="26" height="80" rx="12" fill="#4338CA"
            transform="rotate(-35 134 155)" />
          {/* Mão direita apontando */}
          <g transform="rotate(-35 134 155)">
            <ellipse cx="134" cy="237" rx="12" ry="11" fill="#F4A261" />
            {/* Dedo indicador */}
            <rect x="141" y="224" width="7" height="20" rx="3" fill="#F4A261"
              transform="rotate(-10 145 234)" />
          </g>
        </g>

        {/* Colarinho */}
        <polygon points="66,160 82,180 98,160" fill="white" opacity="0.9" />
        <polygon points="70,160 82,175 94,160" fill="white" opacity="0.6" />
      </g>

      {/* ── Cabeça ── */}
      <g className="char-head">
        {/* Pescoço */}
        <rect x="69" y="140" width="27" height="30" rx="6" fill="#F4A261" />

        {/* Orelha esquerda */}
        <ellipse cx="22" cy="50" rx="10" ry="14" fill="#F4A261" />
        <ellipse cx="24" cy="50" rx="6" ry="10" fill="#E8956D" />

        {/* Orelha direita */}
        <ellipse cx="143" cy="50" rx="10" ry="14" fill="#F4A261" />
        <ellipse cx="141" cy="50" rx="6" ry="10" fill="#E8956D" />

        {/* Cabeça */}
        <ellipse cx="82" cy="50" rx="60" ry="62" fill="#F4A261" />

        {/* Cabelo */}
        <path d="M 22 28 Q 30 -15 82 -12 Q 134 -15 142 28 Q 138 8 125 3 Q 100 -8 82 -8 Q 64 -8 39 3 Q 26 8 22 28 Z"
          fill="#2D1B0E" />
        <path d="M 22 28 Q 18 18 22 10 Q 28 0 35 -2 Q 25 6 22 28 Z"
          fill="#2D1B0E" />
        <path d="M 142 28 Q 146 18 142 10 Q 136 0 129 -2 Q 139 6 142 28 Z"
          fill="#2D1B0E" />

        {/* Sobrancelha esquerda */}
        <path className="brow-l"
          d="M 50 35 Q 62 30 74 33" stroke="#2D1B0E" strokeWidth="3.5"
          strokeLinecap="round" fill="none" />

        {/* Sobrancelha direita */}
        <path className="brow-r"
          d="M 90 33 Q 102 30 114 35" stroke="#2D1B0E" strokeWidth="3.5"
          strokeLinecap="round" fill="none" />

        {/* Olho esquerdo */}
        <circle cx="62" cy="47" r="11" fill="white" />
        <circle cx="63" cy="48" r="7" fill="#5D3A1A" />
        <circle cx="65" cy="46" r="3.5" fill="#1a0a00" />
        <circle cx="67" cy="44" r="1.5" fill="white" />
        {/* Pálpebra esquerda */}
        <ellipse className="eyelid-l" cx="62" cy="42" rx="11" ry="10" fill="#F4A261" />

        {/* Olho direito */}
        <circle cx="101" cy="47" r="11" fill="white" />
        <circle cx="102" cy="48" r="7" fill="#5D3A1A" />
        <circle cx="104" cy="46" r="3.5" fill="#1a0a00" />
        <circle cx="106" cy="44" r="1.5" fill="white" />
        {/* Pálpebra direita */}
        <ellipse className="eyelid-r" cx="101" cy="42" rx="11" ry="10" fill="#F4A261" />

        {/* Nariz */}
        <path d="M 79 53 Q 78 62 74 65 Q 82 68 90 65 Q 86 62 85 53"
          stroke="#E8956D" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Boca */}
        <ellipse className="mouth-shape" cx="82" cy="78" rx="12" ry="4"
          fill="#C0392B" />
        <path d="M 70 78 Q 82 73 94 78" stroke="#8B2020" strokeWidth="1.5"
          fill="none" strokeLinecap="round" opacity="0.6" />
        {/* Dentes */}
        <rect x="73" y="76" width="18" height="5" rx="2" fill="white" opacity="0.9" />

        {/* Óculos */}
        <rect x="48" y="40" width="26" height="18" rx="5" fill="none"
          stroke="#2D1B0E" strokeWidth="2.5" opacity="0.85" />
        <rect x="88" y="40" width="26" height="18" rx="5" fill="none"
          stroke="#2D1B0E" strokeWidth="2.5" opacity="0.85" />
        <line x1="74" y1="49" x2="88" y2="49" stroke="#2D1B0E" strokeWidth="2"
          opacity="0.85" />
        <line x1="22" y1="48" x2="48" y2="47" stroke="#2D1B0E" strokeWidth="2"
          opacity="0.85" />
        <line x1="114" y1="47" x2="140" y2="48" stroke="#2D1B0E" strokeWidth="2"
          opacity="0.85" />

        {/* Cavanhaque */}
        <path d="M 74 88 Q 82 96 90 88 Q 88 100 82 102 Q 76 100 74 88 Z"
          fill="#4A2E14" opacity="0.6" />
      </g>
    </svg>
  );
}

// ─── Lousa Branca (Bible Project whiteboard) ─────────────────────────────────
function Whiteboard({ phase }: { phase: number }) {
  return (
    <div style={{
      flex: 1,
      background: "linear-gradient(145deg, #FFFEF7 0%, #FEFDF0 100%)",
      borderRadius: 16,
      border: "2px solid #E8E0C8",
      boxShadow: "inset 0 2px 8px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.08)",
      padding: "32px 40px",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Paper texture lines */}
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          left: 0, right: 0,
          top: 54 + i * 40,
          height: 1,
          background: "rgba(180,200,220,0.2)",
        }} />
      ))}

      {/* Conteúdo SVG animado */}
      <svg viewBox="0 0 600 520" style={{ width: "100%", height: "100%" }}>
        <style>{ANIMATIONS}</style>

        {/* ─── Título ─── */}
        {/* Linha do título sendo desenhada */}
        <path className="draw-title marker-pen"
          d="M 40 40 H 400"
          stroke="#1E1B4B" strokeWidth="4" />
        {/* Texto do título */}
        <text className="text-title" x="40" y="34"
          style={{ fontFamily: "Caveat, cursive", fontSize: 34, fontWeight: 700, fill: "#1E1B4B" }}>
          Fotossíntese
        </text>
        {/* Sublinhado duplo */}
        <path className="draw-under marker-pen"
          d="M 40 46 H 252"
          stroke="#F59E0B" strokeWidth="3" />
        <path className="draw-under marker-pen"
          d="M 40 52 H 200"
          stroke="#F59E0B" strokeWidth="2" opacity="0.5"
          style={{ animationDelay: "2.1s" }} />

        {/* ─── Linha 1 com ícone ─── */}
        {/* Ícone sol desenhado */}
        <g style={{ animation: "fadeIn 0.5s ease-out 2.8s both" }}>
          <circle cx="60" cy="110" r="14" fill="none" stroke="#F59E0B" strokeWidth="3" />
          {[0,45,90,135,180,225,270,315].map((angle, i) => {
            const rad = angle * Math.PI / 180;
            return (
              <line key={i}
                x1={60 + Math.cos(rad) * 18} y1={110 + Math.sin(rad) * 18}
                x2={60 + Math.cos(rad) * 24} y2={110 + Math.sin(rad) * 24}
                stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
            );
          })}
        </g>
        <path className="draw-line1 marker-pen"
          d="M 90 110 H 480"
          stroke="#374151" strokeWidth="2.5" />
        <text className="text-l1" x="90" y="116"
          style={{ fontFamily: "Caveat, cursive", fontSize: 24, fill: "#374151" }}>
          Luz solar + CO₂ + H₂O
        </text>

        {/* ─── Seta grande ─── */}
        <g style={{ animation: "fadeIn 0.5s ease-out 4.8s both" }}>
          <path d="M 120 145 H 300 L 290 135 M 300 145 L 290 155"
            stroke="#6366F1" strokeWidth="3.5" strokeLinecap="round"
            strokeLinejoin="round" fill="none"
            style={{ strokeDasharray: 300, animation: "drawShort 0.8s ease-out 4.8s both" }} />
        </g>

        {/* ─── Linha 2 ─── */}
        <path className="draw-line2 marker-pen"
          d="M 90 180 H 480"
          stroke="#374151" strokeWidth="2.5" />
        <text className="text-l2" x="90" y="186"
          style={{ fontFamily: "Caveat, cursive", fontSize: 24, fill: "#374151" }}>
          Glicose (C₆H₁₂O₆) + O₂
        </text>

        {/* ─── Linha 3 ─── */}
        <path className="draw-line3 marker-pen"
          d="M 90 235 H 480"
          stroke="#374151" strokeWidth="2.5" />
        <text className="text-l3" x="90" y="241"
          style={{ fontFamily: "Caveat, cursive", fontSize: 22, fill: "#6B7280" }}>
          Cloroplastos — sede da reação 🌿
        </text>

        {/* ─── Caixa destaque ─── */}
        <rect className="draw-box1" x="40" y="280" width="380" height="75"
          rx="8" fill="none" stroke="#10B981" strokeWidth="3"
          strokeDasharray="600" />
        <rect x="40" y="280" width="380" height="75" rx="8"
          fill="#ECFDF5" style={{ animation: "fadeIn 0.4s ease-out 7.3s both" }} />
        <text className="text-box1" x="230" y="305"
          textAnchor="middle"
          style={{ fontFamily: "Caveat, cursive", fontSize: 22, fontWeight: 700, fill: "#065F46" }}>
          ENEM DESTAQUE
        </text>
        <text className="text-box1" x="230" y="330"
          textAnchor="middle"
          style={{ fontFamily: "Caveat, cursive", fontSize: 19, fill: "#065F46", animationDelay: "7.6s" }}>
          Fase clara vs Fase escura (Calvin)
        </text>

        {/* ─── Seta para nota ─── */}
        <path className="draw-arrow marker-pen"
          d="M 440 310 Q 490 310 510 340"
          stroke="#6366F1" strokeWidth="2.5" />
        <polygon style={{ animation: "fadeIn 0.3s ease-out 8.2s both" }}
          points="506,350 514,334 522,346" fill="#6366F1" />

        {/* ─── Nota lateral ─── */}
        <path className="draw-note marker-pen"
          d="M 490 350 H 590 V 440 H 490 Z"
          stroke="#F59E0B" strokeWidth="2.5" fill="none" />
        <rect x="490" y="350" width="100" height="90" rx="4"
          fill="#FFFBEB" style={{ animation: "fadeIn 0.4s ease-out 9s both" }} />
        <text className="text-note" x="540" y="370"
          textAnchor="middle"
          style={{ fontFamily: "Caveat, cursive", fontSize: 15, fontWeight: 700, fill: "#92400E" }}>
          Lembre!
        </text>
        <text className="text-note" x="540" y="392"
          textAnchor="middle"
          style={{ fontFamily: "Caveat, cursive", fontSize: 13, fill: "#78350F", animationDelay: "9.4s" }}>
          Clorófila
        </text>
        <text className="text-note" x="540" y="410"
          textAnchor="middle"
          style={{ fontFamily: "Caveat, cursive", fontSize: 13, fill: "#78350F", animationDelay: "9.6s" }}>
          absorve luz
        </text>
        <text className="text-note" x="540" y="428"
          textAnchor="middle"
          style={{ fontFamily: "Caveat, cursive", fontSize: 13, fill: "#78350F", animationDelay: "9.8s" }}>
          vermelha/azul
        </text>

        {/* ─── Equação química ─── */}
        <text style={{ fontFamily: "Caveat, cursive", fontSize: 18, fill: "#4F46E5",
          animation: "fadeIn 0.5s ease-out 5.5s both" }}
          x="40" y="478">
          6CO₂ + 6H₂O + luz  →  C₆H₁₂O₆ + 6O₂
        </text>
      </svg>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function BibleProject() {
  const [talking, setTalking] = useState(false);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // Simula o professor falando em intervalos
    const t1 = setTimeout(() => setTalking(true), 500);
    const t2 = setTimeout(() => setTalking(false), 4000);
    const t3 = setTimeout(() => setTalking(true), 6000);
    const t4 = setTimeout(() => setTalking(false), 9000);
    const t5 = setTimeout(() => setTalking(true), 11000);
    return () => [t1,t2,t3,t4,t5].forEach(clearTimeout);
  }, []);

  return (
    <div style={{
      width: "100%", minHeight: "100vh",
      background: "#F0F4F8",
      display: "flex",
      flexDirection: "column",
      fontFamily: "system-ui, sans-serif",
    }}>
      {/* ── Header ── */}
      <div style={{
        background: "linear-gradient(135deg, #4338CA 0%, #6D28D9 100%)",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        color: "white",
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "rgba(255,255,255,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16,
        }}>📖</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Aula com o Professor</div>
          <div style={{ fontSize: 11, opacity: 0.75 }}>Fotossíntese • ENEM 2025</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {["▶ Reproduzindo", "⏸", "⏭"].map((b, i) => (
            <div key={i} style={{
              padding: "4px 10px",
              borderRadius: 6,
              background: i === 0 ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.12)",
              fontSize: 12, cursor: "pointer", fontWeight: i === 0 ? 700 : 400,
            }}>{b}</div>
          ))}
        </div>
      </div>

      {/* ── Área principal ── */}
      <div style={{
        flex: 1,
        display: "flex",
        gap: 0,
        padding: "20px",
        alignItems: "stretch",
      }}>
        {/* Lousa */}
        <Whiteboard phase={phase} />

        {/* Professor */}
        <div style={{
          width: 200,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: 8,
          position: "relative",
        }}>
          {/* Balão de fala */}
          {talking && (
            <div style={{
              position: "absolute",
              top: 20,
              left: -130,
              width: 160,
              background: "white",
              borderRadius: 12,
              padding: "10px 14px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              fontSize: 12,
              color: "#374151",
              lineHeight: 1.5,
              border: "1.5px solid #E5E7EB",
            }}>
              <div style={{
                position: "absolute",
                right: -8, top: 14,
                width: 0, height: 0,
                borderTop: "8px solid transparent",
                borderBottom: "8px solid transparent",
                borderLeft: "8px solid white",
                filter: "drop-shadow(2px 0px 1px rgba(0,0,0,0.1))"
              }} />
              <strong>Prestem atenção!</strong> A fase clara ocorre nos tilacóides...
            </div>
          )}

          {/* Personagem animado */}
          <div style={{ width: 180, height: 420 }}>
            <TiagaoSVG talking={talking} />
          </div>

          {/* Indicador de fala */}
          {talking && (
            <div style={{
              display: "flex", gap: 3, alignItems: "center",
              marginTop: -20, marginBottom: 4,
            }}>
              {[0, 80, 160, 80, 0].map((delay, i) => (
                <div key={i} style={{
                  width: 4,
                  background: "#8B5CF6",
                  borderRadius: 2,
                  height: [6, 10, 14, 10, 6][i],
                  animation: `scaleY 0.6s ease-in-out ${delay}ms infinite`,
                }} />
              ))}
            </div>
          )}

          <div style={{
            textAlign: "center",
            fontSize: 11,
            color: "#6B7280",
            fontWeight: 600,
            marginTop: 4,
          }}>
            Prof. Tiagão
          </div>
        </div>
      </div>

      {/* ── Narração ── */}
      <div style={{
        background: "white",
        borderTop: "1px solid #E5E7EB",
        padding: "12px 24px",
        display: "flex",
        gap: 12,
        alignItems: "center",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "linear-gradient(135deg, #4338CA, #7C3AED)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          {talking
            ? <span style={{ fontSize: 16 }}>🎙️</span>
            : <span style={{ fontSize: 16 }}>▶</span>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
            {talking
              ? "\"...a fotossíntese ocorre em dois estágios: a fase clara — que captura energia luminosa — e a fase escura, ou ciclo de Calvin...\""
              : "Clique em ▶ para ouvir o Professor Tiagão explicar o conteúdo"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <span style={{
            fontSize: 11, padding: "3px 8px", borderRadius: 20,
            background: "#EDE9FE", color: "#7C3AED", fontWeight: 700,
          }}>1x</span>
          <span style={{
            fontSize: 11, padding: "3px 8px", borderRadius: 20,
            background: "#F3F4F6", color: "#6B7280",
          }}>🔊</span>
        </div>
      </div>

      {/* ── Etapas ── */}
      <div style={{
        background: "white",
        borderTop: "1px solid #E5E7EB",
        padding: "8px 24px",
        display: "flex",
        gap: 8,
        overflowX: "auto",
      }}>
        {["Introdução", "Fase Clara", "Fase Escura", "Equação", "ENEM Tips"].map((step, i) => (
          <div key={i} style={{
            flexShrink: 0,
            padding: "6px 14px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: i === 1 ? 700 : 400,
            background: i === 1 ? "#4338CA" : "#F9FAFB",
            color: i === 1 ? "white" : "#6B7280",
            border: i === 1 ? "none" : "1px solid #E5E7EB",
            cursor: "pointer",
          }}>
            {i + 1}. {step}
          </div>
        ))}
      </div>
    </div>
  );
}
