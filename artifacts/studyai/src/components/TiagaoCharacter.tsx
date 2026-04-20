/**
 * TiagaoCharacter — personagem animado com física real
 *
 * Camadas:
 *   1. Sombra dinâmica — escala/opacidade inversamente ao float
 *   2. Aura / brilho — cor muda por estado, pulsa
 *   3. Personagem — flutua, respira, reage ao hover/clique, muda por estado
 *   4. Partículas — explodem no clique ou falando animado
 *   5. Indicador de estado — bolinha pulsante / ondas / pontinhos
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";

/* ─── Types ─────────────────────────────────────────── */
export type CharacterState = "idle" | "listening" | "thinking" | "speaking" | "excited";

interface Props {
  state?: CharacterState;
  size?: number;          // px — largura do personagem
  onClick?: () => void;
  className?: string;
  showLabel?: boolean;
  /** imagem customizada (padrão: /tiagao-character.png) */
  imageSrc?: string;
}

/* ─── Configuração por estado ───────────────────────── */
const STATE_CONFIG: Record<CharacterState, {
  floatY: number[];
  floatDur: number;
  rotateDeg: number[];
  rotateDur: number;
  auraColor: string;
  auraScale: number[];
  auraDur: number;
  label: string;
  labelColor: string;
}> = {
  idle: {
    floatY: [0, -8, 0],
    floatDur: 3.2,
    rotateDeg: [-1, 1, -1],
    rotateDur: 4.5,
    auraColor: "rgba(99,102,241,0.18)",
    auraScale: [1, 1.08, 1],
    auraDur: 3.5,
    label: "Online",
    labelColor: "#22c55e",
  },
  listening: {
    floatY: [0, -5, 2, -5, 0],
    floatDur: 1.8,
    rotateDeg: [-2, 2, -2],
    rotateDur: 1.8,
    auraColor: "rgba(59,130,246,0.25)",
    auraScale: [1, 1.15, 1],
    auraDur: 1.0,
    label: "Ouvindo...",
    labelColor: "#3b82f6",
  },
  thinking: {
    floatY: [0, -6, 0],
    floatDur: 4.0,
    rotateDeg: [-3, 3, -3],
    rotateDur: 3.2,
    auraColor: "rgba(245,158,11,0.22)",
    auraScale: [1, 1.1, 1],
    auraDur: 2.5,
    label: "Pensando...",
    labelColor: "#f59e0b",
  },
  speaking: {
    floatY: [0, -14, -6, -14, 0],
    floatDur: 0.75,
    rotateDeg: [-2, 2, -2],
    rotateDur: 0.75,
    auraColor: "rgba(168,85,247,0.28)",
    auraScale: [1, 1.25, 1],
    auraDur: 0.75,
    label: "Falando",
    labelColor: "#a855f7",
  },
  excited: {
    floatY: [0, -20, -4, -16, 0],
    floatDur: 0.55,
    rotateDeg: [-4, 4, -4],
    rotateDur: 0.55,
    auraColor: "rgba(234,179,8,0.35)",
    auraScale: [1, 1.35, 1],
    auraDur: 0.55,
    label: "Animado!",
    labelColor: "#eab308",
  },
};

/* ─── Partículas ──────────────────────────────────── */
interface Particle {
  id: number;
  x: number;
  y: number;
  emoji: string;
  vx: number;
  vy: number;
}
const EMOJIS = ["⭐", "✨", "💡", "🎉", "📚", "🔥", "💫", "🌟"];

/* ─── Componente principal ───────────────────────── */
export function TiagaoCharacter({
  state = "idle",
  size = 120,
  onClick,
  className = "",
  showLabel = true,
  imageSrc = "/tiagao-character.png",
}: Props) {
  const cfg = STATE_CONFIG[state];
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isJumping, setIsJumping] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const particleIdRef = useRef(0);

  /* ── Float y value — usado para sincronizar sombra ── */
  const floatY = useMotionValue(0);
  // Sombra: quanto mais alto o personagem, menor e mais transparente a sombra
  const shadowScale = useTransform(floatY, [-20, 0, 4], [0.65, 1, 1.08]);
  const shadowOpacity = useTransform(floatY, [-20, 0, 4], [0.25, 0.45, 0.5]);

  /* ── Animate float loop ── */
  useEffect(() => {
    let cancelled = false;
    const loop = () => {
      if (cancelled) return;
      const yVals = cfg.floatY;
      const dur = cfg.floatDur;
      // Animate through keyframes manually to keep floatY in sync
      const half = dur / (yVals.length - 1);
      let p = Promise.resolve();
      for (let i = 1; i < yVals.length; i++) {
        const target = yVals[i];
        const prev = yVals[i - 1];
        p = p.then(() => {
          if (cancelled) return;
          return animate(floatY, target, {
            duration: half,
            ease: i === Math.floor(yVals.length / 2) ? "easeOut" : "easeInOut",
          }).then(() => {});
        });
      }
      p.then(() => { if (!cancelled) loop(); });
    };
    loop();
    return () => { cancelled = true; };
  }, [state]); // eslint-disable-line

  /* ── Spawn particles ── */
  const spawnParticles = useCallback((count = 6) => {
    const newPs: Particle[] = Array.from({ length: count }, () => ({
      id: ++particleIdRef.current,
      x: 50 + (Math.random() - 0.5) * 40,
      y: 40 + (Math.random() - 0.5) * 30,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      vx: (Math.random() - 0.5) * 80,
      vy: -(40 + Math.random() * 60),
    }));
    setParticles(p => [...p, ...newPs]);
    setTimeout(() => {
      setParticles(p => p.filter(x => !newPs.find(n => n.id === x.id)));
    }, 1200);
  }, []);

  /* ── Spawn partículas ao falar animado ── */
  useEffect(() => {
    if (state === "excited") spawnParticles(8);
  }, [state]); // eslint-disable-line

  /* ── Clique ── */
  function handleClick() {
    if (isJumping) return;
    setIsJumping(true);
    spawnParticles(5);
    setTimeout(() => setIsJumping(false), 700);
    onClick?.();
  }

  const shadowSize = size * 0.65;

  return (
    <div
      className={`relative select-none cursor-pointer ${className}`}
      style={{ width: size, height: size + 24 }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Sombra dinâmica (sincronizada com float) ── */}
      <motion.div
        style={{
          position: "absolute",
          bottom: 4,
          left: "50%",
          x: "-50%",
          width: shadowSize,
          height: shadowSize * 0.22,
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(0,0,0,0.55) 0%, transparent 70%)",
          scale: shadowScale,
          opacity: shadowOpacity,
          filter: "blur(4px)",
          pointerEvents: "none",
        }}
      />

      {/* ── Aura / brilho por estado ── */}
      <motion.div
        style={{
          position: "absolute",
          top: "10%",
          left: "50%",
          x: "-50%",
          width: size * 1.1,
          height: size * 1.1,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${cfg.auraColor} 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
        animate={{ scale: cfg.auraScale }}
        transition={{ repeat: Infinity, duration: cfg.auraDur, ease: "easeInOut" }}
        key={`aura-${state}`}
      />

      {/* ── Personagem principal ── */}
      <motion.div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          y: floatY,
        }}
        animate={
          isJumping
            ? { y: [-30, 4, -14, 0], scaleY: [1.08, 0.92, 1.04, 1], scaleX: [0.94, 1.06, 0.97, 1] }
            : isHovered
              ? { y: -12, scale: 1.07, rotate: 0 }
              : {}
        }
        transition={
          isJumping
            ? { duration: 0.65, ease: "easeOut", times: [0, 0.45, 0.7, 1] }
            : isHovered
              ? { duration: 0.22, ease: "easeOut" }
              : {}
        }
      >
        {/* Respiração + tilt + imagem */}
        <motion.div
          animate={!isJumping && !isHovered ? {
            scale: [1, 1.025, 1],
            rotate: cfg.rotateDeg,
          } : {}}
          transition={{
            scale: { repeat: Infinity, duration: 4.2, ease: "easeInOut" },
            rotate: { repeat: Infinity, duration: cfg.rotateDur, ease: "easeInOut" },
          }}
          key={`char-${state}`}
        >
          <img
            src={imageSrc}
            alt="Professor Tiagão"
            style={{
              width: size,
              height: size,
              objectFit: "contain",
              filter: isHovered
                ? "drop-shadow(0 8px 24px rgba(99,102,241,0.55))"
                : `drop-shadow(0 4px 14px ${cfg.auraColor.replace("0.18", "0.5").replace("0.22", "0.5").replace("0.25", "0.5").replace("0.28", "0.5").replace("0.35", "0.5")})`,
              transition: "filter 0.25s",
            }}
            draggable={false}
          />
        </motion.div>

        {/* ── Indicador de estado ── */}
        {state === "thinking" && (
          <div className="absolute -top-2 right-2 flex gap-1">
            {[0, 120, 240].map(delay => (
              <motion.span
                key={delay}
                animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 0.9, delay: delay / 1000, ease: "easeInOut" }}
                className="w-2 h-2 rounded-full bg-amber-400 shadow-sm"
              />
            ))}
          </div>
        )}
        {state === "speaking" && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 items-end">
            {[0, 80, 160, 80, 0].map((delay, i) => (
              <motion.span
                key={i}
                animate={{ scaleY: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 0.65, delay: delay / 1000, ease: "easeInOut" }}
                className="w-1 bg-violet-400 rounded-full origin-bottom"
                style={{ height: [5, 8, 10, 8, 5][i] }}
              />
            ))}
          </div>
        )}
        {state === "listening" && (
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut" }}
            className="absolute -top-1 right-1 w-3 h-3 rounded-full bg-blue-400 shadow-md"
          />
        )}
      </motion.div>

      {/* ── Partículas ── */}
      <AnimatePresence>
        {particles.map(p => (
          <motion.span
            key={p.id}
            initial={{ x: `${p.x}%`, y: `${p.y}%`, scale: 0.4, opacity: 1 }}
            animate={{
              x: `calc(${p.x}% + ${p.vx}px)`,
              y: `calc(${p.y}% + ${p.vy}px)`,
              scale: [0.4, 1.1, 0],
              opacity: [1, 1, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0, ease: "easeOut" }}
            style={{ position: "absolute", fontSize: size * 0.18, pointerEvents: "none", zIndex: 10 }}
          >
            {p.emoji}
          </motion.span>
        ))}
      </AnimatePresence>

      {/* ── Label de estado ── */}
      {showLabel && (
        <motion.div
          key={`label-${state}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap"
          style={{ fontSize: size * 0.115 }}
        >
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold"
            style={{
              backgroundColor: cfg.labelColor + "22",
              color: cfg.labelColor,
              border: `1px solid ${cfg.labelColor}44`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ backgroundColor: cfg.labelColor }}
            />
            {cfg.label}
          </span>
        </motion.div>
      )}
    </div>
  );
}

/* ─── Demo interativo (para testes) ─────────────────────── */
export function TiagaoDemo() {
  const [state, setState] = useState<CharacterState>("idle");
  const states: CharacterState[] = ["idle", "listening", "thinking", "speaking", "excited"];

  useEffect(() => {
    const t = setTimeout(() => {
      const next = states[(states.indexOf(state) + 1) % states.length];
      setState(next);
    }, 3500);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <div className="flex flex-col items-center gap-6 p-8 bg-[#0a0a0f] min-h-screen">
      <h1 className="text-white text-2xl font-black">Professor Tiagão — Animação</h1>
      <TiagaoCharacter state={state} size={180} onClick={() => setState("excited")} />
      <div className="flex gap-2 flex-wrap justify-center mt-4">
        {states.map(s => (
          <button
            key={s}
            onClick={() => setState(s)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              state === s
                ? "bg-violet-600 text-white shadow-lg scale-105"
                : "bg-white/10 text-white/60 hover:bg-white/20"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <p className="text-white/30 text-xs">Clique no personagem para uma surpresa ✨</p>
    </div>
  );
}
