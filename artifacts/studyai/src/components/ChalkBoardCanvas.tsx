/**
 * WhiteBoardCanvas — lousa clara estilo Bible Project
 *
 * Marcador desenha letra por letra com:
 * - Fonte caligráfica (Caveat)
 * - Fundo creme/branco com linhas sutis
 * - Cursor de marcador animado
 * - Caixas coloridas para destaque/fórmula/exemplo
 * - Setas desenhadas
 * - Sublinhado animado em títulos
 * - Auto-scroll suave
 */

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import "@fontsource/caveat";

// ─── Types ─────────────────────────────────────────────────────────────────
export interface BoardElement {
  tipo: "titulo" | "formula" | "texto" | "destaque" | "seta" | "separador" | "exemplo";
  texto?: string;
  cor?: string;
  destaque?: string;
  corTexto?: string;
}

export interface ChalkBoardHandle {
  restart: () => void;
}

interface Props {
  elementos: BoardElement[];
  playing: boolean;
  speedMultiplier?: number;
  /** When provided, the writing pace is scaled so the board finishes drawing exactly
   *  when the narration finishes. Pass the audio duration in milliseconds. */
  audioDurationMs?: number;
  onFirstChar?: () => void;
  onAllDone?: () => void;
}

// ─── Estilo por tipo — cores de marcador para lousa clara ───────────────────
interface ElStyle {
  fontSize: number;
  fontWeight: string;
  color: string;
  lineHeight: number;
  msPerChar: number;
  pauseAfter: number;
  bgColor?: string;
  textColor?: string;
  padding?: number;
  hasUnderline?: boolean;
  hasArrow?: boolean;
  hasBorder?: string;
  underlineColor?: string;
}

// Calmer, more human-paced writing speeds — adjusted via audioDurationMs prop.
// Lower bound clamp (in syncFactorRef) prevents going faster than baseline so the
// student can actually follow letter-by-letter, like a real teacher on a board.
const STYLES: Record<BoardElement["tipo"], ElStyle> = {
  titulo:    { fontSize: 30, fontWeight: "700", color: "#1e1b4b", lineHeight: 44, msPerChar: 145, pauseAfter: 1400, hasUnderline: true, underlineColor: "#F59E0B" },
  formula:   { fontSize: 25, fontWeight: "700", color: "#6D28D9", lineHeight: 42, msPerChar: 195, pauseAfter: 1800, bgColor: "#FEF9C3", padding: 12, hasBorder: "#FDE047" },
  texto:     { fontSize: 21, fontWeight: "400", color: "#374151", lineHeight: 34, msPerChar: 95,  pauseAfter: 950 },
  destaque:  { fontSize: 21, fontWeight: "700", color: "#065F46", lineHeight: 34, msPerChar: 115, pauseAfter: 1100, bgColor: "#D1FAE5", textColor: "#065F46", padding: 10, hasBorder: "#6EE7B7" },
  seta:      { fontSize: 21, fontWeight: "400", color: "#4338CA", lineHeight: 34, msPerChar: 95,  pauseAfter: 850, hasArrow: true },
  separador: { fontSize: 0,  fontWeight: "400", color: "#D1D5DB", lineHeight: 22, msPerChar: 0,   pauseAfter: 400 },
  exemplo:   { fontSize: 20, fontWeight: "400", color: "#1e40af", lineHeight: 34, msPerChar: 100, pauseAfter: 1100, bgColor: "#DBEAFE", padding: 12, hasBorder: "#93C5FD" },
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

// ─── Layout elements ─────────────────────────────────────────────────────────
interface LayoutChar { char: string; x: number; y: number; }
interface LayoutEl {
  el: BoardElement;
  style: ElStyle;
  lines: string[];
  startY: number;
  contentY: number;
  height: number;
  chars: LayoutChar[];
}

// ─── Build layout ─────────────────────────────────────────────────────────────
function buildLayout(ctx: CanvasRenderingContext2D, canvasW: number, elementos: BoardElement[]): { layout: LayoutEl[]; totalHeight: number } {
  const PAD_X = 36;
  let y = 28;
  const layout: LayoutEl[] = [];

  for (const el of elementos) {
    const base = STYLES[el.tipo];
    const s: ElStyle = {
      ...base,
      ...(el.cor ? { color: el.cor } : {}),
      ...(el.corTexto ? { textColor: el.corTexto } : {}),
    };

    if (el.tipo === "separador") {
      layout.push({ el, style: s, lines: [], startY: y, contentY: y + 8, height: 28, chars: [] });
      y += 28;
      continue;
    }

    const paddingX = s.padding ?? 0;
    const paddingY = s.padding ?? 0;
    const arrowOffset = s.hasArrow ? 26 : 0;
    const innerW = canvasW - PAD_X * 2 - paddingX * 2 - arrowOffset;

    ctx.font = `${s.fontWeight} ${s.fontSize}px 'Caveat', cursive`;
    const rawText = el.texto ?? "";
    const lines = wrapText(ctx, rawText, innerW);

    const topLabelH = (el.tipo === "destaque" || el.tipo === "exemplo") ? 15 : 0;
    const textH = lines.length * s.lineHeight;
    const height = textH + paddingY * 2 + topLabelH + (s.hasUnderline ? 10 : 0) + 16;

    const startY = y;
    const contentY = y + paddingY + topLabelH;

    const chars: LayoutChar[] = [];
    let lineY = contentY;
    for (const line of lines) {
      ctx.font = `${s.fontWeight} ${s.fontSize}px 'Caveat', cursive`;
      let charX = PAD_X + paddingX + arrowOffset;
      for (const ch of line) {
        chars.push({ char: ch, x: charX, y: lineY + s.fontSize * 0.82 });
        charX += ctx.measureText(ch).width;
      }
      lineY += s.lineHeight;
    }

    layout.push({ el, style: s, lines, startY, contentY, height, chars });
    y += height + 6;
  }

  return { layout, totalHeight: y + 28 };
}

// ─── Draw one element ─────────────────────────────────────────────────────────
function drawElement(
  ctx: CanvasRenderingContext2D,
  lel: LayoutEl,
  charCount: number,
  scrollY: number,
  canvasW: number,
) {
  const s = lel.style;
  const PAD_X = 36;
  ctx.save();
  ctx.translate(0, -scrollY);

  // ── Separador ──
  if (lel.el.tipo === "separador") {
    ctx.strokeStyle = "#E5E7EB";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(PAD_X, lel.startY + 12);
    ctx.lineTo(canvasW - PAD_X, lel.startY + 12);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    return;
  }

  const isDone = charCount < 0;
  const drawChars = isDone ? lel.chars.length : Math.min(charCount, lel.chars.length);
  if (drawChars === 0 && !isDone) { ctx.restore(); return; }

  // ── Background box ──
  if (s.bgColor) {
    const paddingX = s.padding ?? 0;
    const paddingY = s.padding ?? 0;
    const topLabelH = (lel.el.tipo === "destaque" || lel.el.tipo === "exemplo") ? 15 : 0;
    const bx = PAD_X - paddingX;
    const by = lel.startY;
    const bw = canvasW - PAD_X * 2 + paddingX * 2;
    const bh = lel.height - 16;
    const rx = 10;

    ctx.save();
    ctx.fillStyle = hexToRgba(s.bgColor, 0.95);
    ctx.beginPath();
    ctx.moveTo(bx + rx, by); ctx.lineTo(bx + bw - rx, by);
    ctx.arcTo(bx + bw, by, bx + bw, by + rx, rx);
    ctx.lineTo(bx + bw, by + bh - rx);
    ctx.arcTo(bx + bw, by + bh, bx + bw - rx, by + bh, rx);
    ctx.lineTo(bx + rx, by + bh);
    ctx.arcTo(bx, by + bh, bx, by + bh - rx, rx);
    ctx.lineTo(bx, by + rx);
    ctx.arcTo(bx, by, bx + rx, by, rx);
    ctx.closePath();
    ctx.fill();
    if (s.hasBorder) {
      ctx.strokeStyle = s.hasBorder;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // Top label
    if (lel.el.tipo === "exemplo") {
      ctx.font = "800 10px 'Inter', sans-serif";
      ctx.fillStyle = hexToRgba("#1e40af", 0.7);
      ctx.fillText("EXEMPLO", bx + paddingX + 2, lel.startY + topLabelH - 2);
    } else if (lel.el.tipo === "destaque") {
      ctx.font = "800 10px 'Inter', sans-serif";
      ctx.fillStyle = hexToRgba("#065F46", 0.65);
      ctx.fillText("CONCEITO", bx + paddingX + 2, lel.startY + topLabelH - 2);
    }
    ctx.restore();
  }

  // ── Arrow ──
  if (s.hasArrow) {
    const ax = PAD_X + 2;
    const ay = lel.contentY + s.lineHeight * 0.44;
    const aLen = 16;
    ctx.save();
    ctx.strokeStyle = hexToRgba(s.color, 0.85);
    ctx.fillStyle = hexToRgba(s.color, 0.85);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + aLen, ay);
    ctx.moveTo(ax + aLen - 6, ay - 5);
    ctx.lineTo(ax + aLen, ay);
    ctx.lineTo(ax + aLen - 6, ay + 5);
    ctx.stroke();
    ctx.restore();
  }

  // ── Characters (marcador limpo, 2 passes) ──
  const textColor = s.textColor ?? s.color;
  ctx.font = `${s.fontWeight} ${s.fontSize}px 'Caveat', cursive`;

  // Pass 1 — sombra suave
  ctx.fillStyle = hexToRgba(textColor, 0.08);
  for (let i = 0; i < drawChars; i++) {
    const ch = lel.chars[i];
    ctx.fillText(ch.char, ch.x + 0.8, ch.y + 0.8);
  }
  // Pass 2 — traço principal
  ctx.fillStyle = hexToRgba(textColor, 0.92);
  for (let i = 0; i < drawChars; i++) {
    const ch = lel.chars[i];
    ctx.fillText(ch.char, ch.x, ch.y);
  }

  // ── Cursor (ponta do marcador) ──
  if (!isDone && drawChars > 0 && drawChars < lel.chars.length) {
    const last = lel.chars[drawChars - 1];
    ctx.font = `${s.fontWeight} ${s.fontSize}px 'Caveat', cursive`;
    const cw = ctx.measureText(last.char).width;
    const cx = last.x + cw + 2;
    const cy = last.y - s.fontSize * 0.36;
    ctx.save();
    // Ponta do marcador — retângulo inclinado
    ctx.translate(cx, cy);
    ctx.rotate(-0.3);
    ctx.fillStyle = hexToRgba(textColor, 0.8);
    ctx.fillRect(-3, -4, 6, 10);
    ctx.fillStyle = hexToRgba(textColor, 0.15);
    ctx.fillRect(-6, -6, 12, 16);
    ctx.restore();
  }

  // ── Underline colorido para títulos ──
  if (s.hasUnderline && (isDone || drawChars >= lel.chars.length)) {
    const uly = lel.contentY + lel.lines.length * s.lineHeight + 5;
    ctx.save();
    // Linha principal
    ctx.strokeStyle = hexToRgba(s.underlineColor ?? "#F59E0B", 0.9);
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(PAD_X, uly);
    ctx.lineTo(canvasW - PAD_X, uly);
    ctx.stroke();
    // Linha secundária mais fina
    ctx.strokeStyle = hexToRgba(s.underlineColor ?? "#F59E0B", 0.35);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PAD_X, uly + 5);
    ctx.lineTo(canvasW * 0.5, uly + 5);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

// ─── Component ──────────────────────────────────────────────────────────────
export const ChalkBoardCanvas = forwardRef<ChalkBoardHandle, Props>(
  ({ elementos, playing, speedMultiplier = 1, audioDurationMs, onFirstChar, onAllDone }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    // syncFactor scales every drawing tick so the board finishes when narration finishes.
    // <1 = faster than base, >1 = slower. Recomputed when audio duration is known.
    const syncFactorRef = useRef<number>(1);

    const stateRef = useRef({
      elIdx: 0,
      charIdx: 0,
      phase: "idle" as "idle" | "drawing" | "pause" | "done",
      pauseRemaining: 0,
      lastTime: 0,
      msAccum: 0,
      allDoneFired: false,
      firstCharFired: false,
      scrollY: 0,
      layout: [] as LayoutEl[],
      totalHeight: 0,
      canvasW: 0,
      canvasH: 0,
    });

    const rafRef = useRef<number>(0);
    const onFirstCharRef = useRef(onFirstChar);
    const onAllDoneRef = useRef(onAllDone);
    onFirstCharRef.current = onFirstChar;
    onAllDoneRef.current = onAllDone;

    // ── Redraw ──────────────────────────────────────────────────────────────
    const redraw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const st = stateRef.current;
      const { canvasW, canvasH, layout, elIdx, charIdx, scrollY, phase } = st;

      ctx.clearRect(0, 0, canvasW, canvasH);

      // Fundo creme
      ctx.fillStyle = "#FFFEF5";
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Linhas pautadas suaves (azul-acinzentado)
      ctx.save();
      for (let ly = 44; ly < st.totalHeight; ly += 36) {
        const screenY = ly - scrollY;
        if (screenY < -36 || screenY > canvasH + 36) continue;
        ctx.strokeStyle = "rgba(180,200,230,0.18)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(canvasW, screenY);
        ctx.stroke();
      }
      // Margem esquerda vertical (vermelho bem suave)
      ctx.strokeStyle = "rgba(239,68,68,0.08)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(22, canvasH);
      ctx.stroke();
      ctx.restore();

      // All elements
      for (let i = 0; i < layout.length; i++) {
        if (i < elIdx) {
          drawElement(ctx, layout[i], -1, scrollY, canvasW);
        } else if (i === elIdx) {
          const count = (phase === "pause" || phase === "done") ? -1 : charIdx;
          drawElement(ctx, layout[i], count, scrollY, canvasW);
        }
      }
    }, []);

    // ── Animation loop ──────────────────────────────────────────────────────
    const animate = useCallback((timestamp: number) => {
      const st = stateRef.current;
      if (st.phase === "done") return;

      const dt = st.lastTime ? Math.min(timestamp - st.lastTime, 80) : 16;
      st.lastTime = timestamp;

      if (st.phase === "pause") {
        st.pauseRemaining -= dt;
        if (st.pauseRemaining <= 0) {
          const nextIdx = st.elIdx + 1;
          if (nextIdx >= st.layout.length) {
            st.elIdx = nextIdx;
            st.phase = "done";
            redraw();
            if (!st.allDoneFired) { st.allDoneFired = true; onAllDoneRef.current?.(); }
            return;
          }
          st.elIdx = nextIdx;
          st.charIdx = 0;
          st.phase = "drawing";
          st.msAccum = 0;
        }
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      if (st.phase === "drawing") {
        const lel = st.layout[st.elIdx];
        if (!lel) { st.phase = "done"; return; }
        const s = lel.style;

        if (lel.el.tipo === "separador") {
          redraw();
          st.phase = "pause";
          st.pauseRemaining = s.pauseAfter / speedMultiplier;
          rafRef.current = requestAnimationFrame(animate);
          return;
        }

        if (!st.firstCharFired && st.charIdx === 0) {
          st.firstCharFired = true;
          onFirstCharRef.current?.();
        }

        st.msAccum += dt;
        const msPerChar = Math.max(1, (s.msPerChar * syncFactorRef.current) / speedMultiplier);
        const add = Math.floor(st.msAccum / msPerChar);
        if (add > 0) {
          st.msAccum -= add * msPerChar;
          st.charIdx = Math.min(st.charIdx + add, lel.chars.length);
        }

        const lastCharY = (lel.chars[Math.max(0, st.charIdx - 1)]?.y ?? 0) - (st.scrollY);
        if (lastCharY > st.canvasH * 0.7) {
          st.scrollY += lastCharY - st.canvasH * 0.55;
        }

        if (st.charIdx >= lel.chars.length) {
          st.phase = "pause";
          st.pauseRemaining = s.pauseAfter / speedMultiplier;
        }

        redraw();
      }

      rafRef.current = requestAnimationFrame(animate);
    }, [redraw, speedMultiplier]); // eslint-disable-line

    // ── Setup ───────────────────────────────────────────────────────────────
    const setup = useCallback(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const { layout, totalHeight } = buildLayout(ctx, w, elementos);
      const st = stateRef.current;
      st.layout = layout;
      st.totalHeight = totalHeight;
      st.canvasW = w;
      st.canvasH = h;
      st.elIdx = 0;
      st.charIdx = 0;
      st.phase = playing ? "drawing" : "idle";
      st.pauseRemaining = 0;
      st.lastTime = 0;
      st.msAccum = 0;
      st.allDoneFired = false;
      st.firstCharFired = false;
      st.scrollY = 0;

      cancelAnimationFrame(rafRef.current);
      redraw();

      if (playing) {
        rafRef.current = requestAnimationFrame(animate);
      }
    }, [elementos, playing, animate, redraw]);

    useImperativeHandle(ref, () => ({ restart: () => setup() }), [setup]);

    // Recompute syncFactor whenever the audio duration becomes known.
    // Goal: total drawing time ≈ audioDurationMs.
    useEffect(() => {
      if (!audioDurationMs || audioDurationMs <= 0) {
        syncFactorRef.current = 1;
        return;
      }
      // Estimate base total drawing time from the elementos
      let baseTotalMs = 0;
      for (const el of elementos) {
        const s = STYLES[el.tipo];
        const len = (el.texto?.length ?? 0);
        baseTotalMs += len * s.msPerChar + s.pauseAfter;
      }
      if (baseTotalMs <= 0) return;
      // Reserve ~15% buffer so writing finishes slightly before audio ends
      const targetMs = audioDurationMs * 0.92;
      const factor = targetMs / baseTotalMs;
      // Clamp: never go BELOW the calmer baseline (factor >= 1) — student must follow.
      // Allow stretching (up to 3.5x) when the narration is very long.
      syncFactorRef.current = Math.max(1.0, Math.min(3.5, factor));
    }, [audioDurationMs, elementos]);

    useEffect(() => {
      document.fonts.ready.then(() => setup());
      return () => cancelAnimationFrame(rafRef.current);
    }, [elementos]); // eslint-disable-line

    useEffect(() => {
      const st = stateRef.current;
      if (playing) {
        // Start or resume drawing
        if (st.phase === "idle") st.phase = "drawing";
        if (st.phase !== "done") {
          st.lastTime = 0; // reset dt so first frame has sane delta
          cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(animate);
        }
      } else {
        // Pause: stop the animation loop, keep state intact for resume
        cancelAnimationFrame(rafRef.current);
        st.lastTime = 0;
      }
    }, [playing, animate]);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      const ro = new ResizeObserver(() => {
        document.fonts.ready.then(() => setup());
      });
      ro.observe(container);
      return () => ro.disconnect();
    }, [setup]);

    return (
      <div ref={containerRef} className="w-full h-full relative overflow-hidden"
        style={{ background: "#FFFEF5" }}>
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    );
  }
);
ChalkBoardCanvas.displayName = "ChalkBoardCanvas";
