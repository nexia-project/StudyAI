/**
 * TiagaoFullBody — personagem SVG de corpo inteiro, estilo Bible Project
 *
 * Animações:
 *  - Respiração (translateY suave)
 *  - Cabeça balançando (headBob)
 *  - Olhos piscando (blinkLid)
 *  - Boca falando (talkMouth) — ativa quando state="speaking"
 *  - Sobrancelhas subindo (eyebrowRaise)
 *  - Braço apontando (armPoint)
 *  - Pensamento (thinking dots)
 */

import { motion, AnimatePresence } from "framer-motion";
import type { CharacterState } from "./TiagaoCharacter";

const SVG_STYLE = `
  @keyframes breathe {
    0%,100% { transform: translateY(0); }
    50%     { transform: translateY(-4px); }
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
  @keyframes thinkingBob {
    0%,100% { transform: rotate(-3deg) translateY(0); }
    50%     { transform: rotate(3deg) translateY(-5px); }
  }
  @keyframes excitedBounce {
    0%,100% { transform: translateY(0) rotate(0); }
    25%     { transform: translateY(-8px) rotate(-3deg); }
    75%     { transform: translateY(-4px) rotate(3deg); }
  }

  .tb-body-idle    { animation: breathe 3.5s ease-in-out infinite; transform-origin: 83px 300px; }
  .tb-body-speaking { animation: breathe 1.2s ease-in-out infinite; transform-origin: 83px 300px; }
  .tb-body-thinking { animation: thinkingBob 4s ease-in-out infinite; transform-origin: 83px 300px; }
  .tb-body-excited  { animation: excitedBounce 0.55s ease-in-out infinite; transform-origin: 83px 300px; }
  .tb-body-listening { animation: breathe 2s ease-in-out infinite; transform-origin: 83px 300px; }

  .tb-head-idle    { animation: headBob 3.5s ease-in-out infinite; transform-origin: 83px 170px; }
  .tb-head-speaking { animation: headBob 1.2s ease-in-out infinite; transform-origin: 83px 170px; }
  .tb-head-thinking { animation: headBob 4s ease-in-out infinite 0.5s; transform-origin: 83px 170px; }
  .tb-head-excited  { animation: headBob 0.55s ease-in-out infinite; transform-origin: 83px 170px; }
  .tb-head-listening { animation: headBob 2s ease-in-out infinite; transform-origin: 83px 170px; }

  .tb-arm          { animation: armPoint 2s ease-in-out infinite; transform-origin: 115px 165px; }
  .tb-brow-l       { animation: eyebrowRaise 3.5s ease-in-out infinite; }
  .tb-brow-r       { animation: eyebrowRaise 3.5s ease-in-out infinite 0.2s; }
  .tb-eyelid-l     { animation: blinkLid 4.2s ease-in-out infinite; transform-origin: 62px 46px; }
  .tb-eyelid-r     { animation: blinkLid 4.2s ease-in-out infinite 0.06s; transform-origin: 101px 46px; }
`;

interface Props {
  state?: CharacterState;
  width?: number;
}

export function TiagaoFullBody({ state = "idle", width = 200 }: Props) {
  const talking = state === "speaking" || state === "excited";
  const height = width * (415 / 165);

  const bodyClass = `tb-body-${state}`;
  const headClass = `tb-head-${state}`;

  return (
    <div style={{ position: "relative", width, height, flexShrink: 0 }}>
      <svg
        viewBox="0 0 165 415"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", height: "100%", overflow: "visible" }}
      >
        <style>{SVG_STYLE}</style>

        {/* ── Corpo (camisa + calça + sapatos) ── */}
        <g className={bodyClass}>
          {/* Sombra no chão */}
          <ellipse cx="83" cy="412" rx="38" ry="6" fill="rgba(0,0,0,0.12)" />

          {/* Sapatos */}
          <ellipse cx="60" cy="398" rx="24" ry="9" fill="#1F1F1F" />
          <ellipse cx="106" cy="398" rx="24" ry="9" fill="#1F1F1F" />

          {/* Pernas/calça */}
          <rect x="45" y="292" width="34" height="112" rx="9" fill="#1E3A6E" />
          <rect x="87" y="292" width="34" height="112" rx="9" fill="#1E3A6E" />

          {/* Cinto */}
          <rect x="41" y="288" width="83" height="12" rx="5" fill="#0f172a" />
          <rect x="74" y="290" width="18" height="8" rx="2" fill="#D97706" />

          {/* Camisa (corpo) */}
          <rect x="37" y="162" width="91" height="136" rx="14" fill="#4338CA" />

          {/* Botões */}
          <circle cx="83" cy="186" r="3" fill="#3730A3" />
          <circle cx="83" cy="202" r="3" fill="#3730A3" />
          <circle cx="83" cy="218" r="3" fill="#3730A3" />

          {/* Bolso */}
          <rect x="89" y="177" width="24" height="19" rx="3" fill="none" stroke="#3730A3" strokeWidth="2" />

          {/* Braço esquerdo (relaxado) */}
          <rect x="14" y="164" width="28" height="80" rx="13" fill="#4338CA" />
          <ellipse cx="28" cy="250" rx="14" ry="13" fill="#F4A261" />

          {/* Braço direito (apontando) */}
          <g className="tb-arm">
            <rect x="123" y="154" width="28" height="85" rx="13" fill="#4338CA"
              transform="rotate(-38 137 157)" />
            <g transform="rotate(-38 137 157)">
              <ellipse cx="137" cy="244" rx="13" ry="12" fill="#F4A261" />
              <rect x="144" y="231" width="8" height="22" rx="3.5" fill="#F4A261"
                transform="rotate(-8 148 242)" />
            </g>
          </g>

          {/* Colarinho */}
          <polygon points="65,162 83,183 101,162" fill="white" opacity="0.9" />
          <polygon points="69,162 83,177 97,162" fill="white" opacity="0.6" />
        </g>

        {/* ── Cabeça ── */}
        <g className={headClass}>
          {/* Pescoço */}
          <rect x="68" y="142" width="29" height="31" rx="7" fill="#F4A261" />

          {/* Orelha esquerda */}
          <ellipse cx="20" cy="50" rx="11" ry="15" fill="#F4A261" />
          <ellipse cx="22" cy="50" rx="7" ry="11" fill="#E8956D" />

          {/* Orelha direita */}
          <ellipse cx="145" cy="50" rx="11" ry="15" fill="#F4A261" />
          <ellipse cx="143" cy="50" rx="7" ry="11" fill="#E8956D" />

          {/* Cabeça principal */}
          <ellipse cx="83" cy="50" rx="62" ry="64" fill="#F4A261" />

          {/* Cabelo */}
          <path d="M 21 27 Q 30 -17 83 -14 Q 136 -17 145 27 Q 140 6 126 2 Q 100 -10 83 -10 Q 66 -10 40 2 Q 26 6 21 27 Z"
            fill="#2D1B0E" />
          <path d="M 21 27 Q 17 14 21 7 Q 27 -2 36 -4 Q 24 5 21 27 Z" fill="#2D1B0E" />
          <path d="M 145 27 Q 149 14 145 7 Q 139 -2 130 -4 Q 142 5 145 27 Z" fill="#2D1B0E" />

          {/* Sobrancelha esquerda */}
          <path className="tb-brow-l"
            d="M 48 34 Q 62 28 76 32" stroke="#2D1B0E" strokeWidth="3.5"
            strokeLinecap="round" fill="none" />

          {/* Sobrancelha direita */}
          <path className="tb-brow-r"
            d="M 90 32 Q 104 28 118 34" stroke="#2D1B0E" strokeWidth="3.5"
            strokeLinecap="round" fill="none" />

          {/* Olho esquerdo */}
          <circle cx="62" cy="48" r="12" fill="white" />
          <circle cx="63" cy="49" r="8" fill="#5D3A1A" />
          <circle cx="65" cy="47" r="4" fill="#1a0a00" />
          <circle cx="67" cy="45" r="1.8" fill="white" />
          <ellipse className="tb-eyelid-l" cx="62" cy="42" rx="12" ry="11" fill="#F4A261" />

          {/* Olho direito */}
          <circle cx="103" cy="48" r="12" fill="white" />
          <circle cx="104" cy="49" r="8" fill="#5D3A1A" />
          <circle cx="106" cy="47" r="4" fill="#1a0a00" />
          <circle cx="108" cy="45" r="1.8" fill="white" />
          <ellipse className="tb-eyelid-r" cx="103" cy="42" rx="12" ry="11" fill="#F4A261" />

          {/* Nariz */}
          <path d="M 79 54 Q 78 65 74 68 Q 83 71 92 68 Q 88 65 87 54"
            stroke="#E8956D" strokeWidth="2.2" fill="none" strokeLinecap="round" />

          {/* Boca */}
          <ellipse
            cx="83" cy="81"
            rx="13"
            ry={talking ? undefined : undefined}
            fill="#C0392B"
            style={{
              animation: talking
                ? "talkMouth 0.38s ease-in-out infinite"
                : "none",
              transformOrigin: "83px 81px",
            }}
          />
          {/* Se não está falando, mostrar linha fechada */}
          {!talking && (
            <path d="M 70 80 Q 83 88 96 80" stroke="#8B2020" strokeWidth="2"
              fill="none" strokeLinecap="round" />
          )}
          {/* Dentes quando fala */}
          {talking && (
            <rect x="74" y="79" width="18" height="6" rx="2" fill="white" opacity="0.9" />
          )}

          {/* Óculos */}
          <rect x="47" y="40" width="27" height="19" rx="5" fill="none"
            stroke="#2D1B0E" strokeWidth="2.5" opacity="0.85" />
          <rect x="91" y="40" width="27" height="19" rx="5" fill="none"
            stroke="#2D1B0E" strokeWidth="2.5" opacity="0.85" />
          <line x1="74" y1="50" x2="91" y2="50" stroke="#2D1B0E" strokeWidth="2" opacity="0.85" />
          <line x1="20" y1="49" x2="47" y2="48" stroke="#2D1B0E" strokeWidth="2" opacity="0.85" />
          <line x1="118" y1="48" x2="143" y2="49" stroke="#2D1B0E" strokeWidth="2" opacity="0.85" />

          {/* Cavanhaque */}
          <path d="M 74 92 Q 83 100 92 92 Q 90 104 83 106 Q 76 104 74 92 Z"
            fill="#4A2E14" opacity="0.65" />

          {/* Pontinhos de pensamento */}
          {state === "thinking" && (
            <g>
              <motion.circle cx="100" cy="15" r="4" fill="#F59E0B"
                animate={{ y: [0, -6, 0], opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut" }} />
              <motion.circle cx="115" cy="8" r="5.5" fill="#F59E0B"
                animate={{ y: [0, -6, 0], opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 0.9, delay: 0.15, ease: "easeInOut" }} />
              <motion.circle cx="132" cy="0" r="7" fill="#F59E0B"
                animate={{ y: [0, -6, 0], opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 0.9, delay: 0.3, ease: "easeInOut" }} />
            </g>
          )}

          {/* Coração excitado */}
          {state === "excited" && (
            <motion.text x="110" y="5" style={{ fontSize: 20 }}
              animate={{ scale: [0.8, 1.3, 0.8], rotate: [-10, 10, -10] }}
              transition={{ repeat: Infinity, duration: 0.55, ease: "easeInOut" }}>
              ⭐
            </motion.text>
          )}
        </g>
      </svg>

      {/* Barras de fala */}
      <AnimatePresence>
        {(state === "speaking" || state === "excited") && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position: "absolute",
              bottom: 12,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 3,
              alignItems: "center",
            }}>
            {[0, 80, 160, 80, 0].map((delay, i) => (
              <motion.div key={i}
                animate={{ scaleY: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 0.65, delay: delay / 1000, ease: "easeInOut" }}
                style={{
                  width: 4,
                  background: "#8B5CF6",
                  borderRadius: 2,
                  transformOrigin: "bottom",
                  height: [5, 8, 11, 8, 5][i],
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
