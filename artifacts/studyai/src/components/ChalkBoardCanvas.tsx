/**
 * ChalkBoardCanvas — lousa em canvas real
 *
 * Professor escreve letra por letra com:
 * - Fonte caligráfica (Caveat)
 * - Cursor de caneta animado que precede o texto
 * - Efeito de marcador (múltiplas camadas suaves)
 * - Caixas/fundo para destaque/fórmula/exemplo
 * - Setas desenhadas no canvas
 * - Sublinhado animado em títulos
 * - Auto-scroll quando o conteúdo ultrapassa a área visível
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
  onFirstChar?: () => void;
  onAllDone?: () => void;
}

// ─── Estilo por tipo ────────────────────────────────────────────────────────
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
}

const STYLES: Record<BoardElement["tipo"], ElStyle> = {
  titulo:    { fontSize: 30, fontWeight: "700", color: "#1e1b4b", lineHeight: 42, msPerChar: 55, pauseAfter: 650, hasUnderline: true },
  formula:   { fontSize: 25, fontWeight: "700", color: "#7c3aed", lineHeight: 42, msPerChar: 75, pauseAfter: 900, bgColor: "#fef9c3", padding: 12, hasBorder: "#fde047" },
  texto:     { fontSize: 21, fontWeight: "400", color: "#374151", lineHeight: 32, msPerChar: 25, pauseAfter: 350 },
  destaque:  { fontSize: 21, fontWeight: "700", color: "#166534", lineHeight: 32, msPerChar: 38, pauseAfter: 480, bgColor: "#bbf7d0", textColor: "#166534", padding: 10 },
  seta:      { fontSize: 21, fontWeight: "400", color: "#4338ca", lineHeight: 32, msPerChar: 26, pauseAfter: 320, hasArrow: true },
  separador: { fontSize: 0,  fontWeight: "400", color: "#e2e8f0", lineHeight: 22, msPerChar: 0,  pauseAfter: 160 },
  exemplo:   { fontSize: 20, fontWeight: "400", color: "#1e40af", lineHeight: 32, msPerChar: 30, pauseAfter: 520, bgColor: "#dbeafe", padding: 12, hasBorder: "#93c5fd" },
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
  const PAD_X = 32;
  let y = 24;
  const layout: LayoutEl[] = [];

  for (const el of elementos) {
    const base = STYLES[el.tipo];
    const s: ElStyle = {
      ...base,
      ...(el.cor ? { color: el.cor } : {}),
      ...(el.corTexto ? { textColor: el.corTexto } : {}),
    };

    if (el.tipo === "separador") {
      layout.push({ el, style: s, lines: [], startY: y, contentY: y + 8, height: 24, chars: [] });
      y += 24;
      continue;
    }

    const paddingX = s.padding ?? 0;
    const paddingY = s.padding ?? 0;
    const arrowOffset = s.hasArrow ? 24 : 0;
    const innerW = canvasW - PAD_X * 2 - paddingX * 2 - arrowOffset;

    ctx.font = `${s.fontWeight} ${s.fontSize}px 'Caveat', cursive`;
    const rawText = el.texto ?? "";
    const lines = wrapText(ctx, rawText, innerW);

    const topLabelH = (el.tipo === "destaque" || el.tipo === "exemplo") ? 14 : 0;
    const textH = lines.length * s.lineHeight;
    const height = textH + paddingY * 2 + topLabelH + (s.hasUnderline ? 8 : 0) + 14;

    const startY = y;
    const contentY = y + paddingY + topLabelH;

    // Build char positions
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
    y += height + 4;
  }

  return { layout, totalHeight: y + 24 };
}

// ─── Draw one element ─────────────────────────────────────────────────────────
function drawElement(
  ctx: CanvasRenderingContext2D,
  lel: LayoutEl,
  charCount: number,   // number of chars drawn; -1 = fully done
  scrollY: number,
  canvasW: number,
) {
  const s = lel.style;
  const PAD_X = 32;
  ctx.save();
  ctx.translate(0, -scrollY);

  // ── Separador ──
  if (lel.el.tipo === "separador") {
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PAD_X, lel.startY + 10);
    ctx.lineTo(canvasW - PAD_X, lel.startY + 10);
    ctx.stroke();
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
    const topLabelH = (lel.el.tipo === "destaque" || lel.el.tipo === "exemplo") ? 14 : 0;
    const bx = PAD_X - paddingX;
    const by = lel.startY;
    const bw = canvasW - PAD_X * 2 + paddingX * 2;
    const bh = lel.height - 14;
    const rx = 10;

    ctx.save();
    ctx.fillStyle = hexToRgba(s.bgColor, 0.92);
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
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // Top label
    if (lel.el.tipo === "exemplo") {
      ctx.font = "700 10px 'Inter', sans-serif";
      ctx.fillStyle = hexToRgba("#1e40af", 0.75);
      ctx.fillText("EXEMPLO", bx + paddingX, lel.startY + topLabelH - 2);
    } else if (lel.el.tipo === "destaque") {
      ctx.font = "700 10px 'Inter', sans-serif";
      ctx.fillStyle = hexToRgba("#166534", 0.7);
      ctx.fillText("CONCEITO", bx + paddingX, lel.startY + topLabelH - 2);
    }
    ctx.restore();
  }

  // ── Arrow ──
  if (s.hasArrow) {
    const ax = PAD_X + 2;
    const ay = lel.contentY + s.lineHeight * 0.44;
    const aLen = 14;
    ctx.save();
    ctx.strokeStyle = hexToRgba(s.color, 0.8);
    ctx.fillStyle = hexToRgba(s.color, 0.8);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + aLen, ay);
    ctx.moveTo(ax + aLen - 5, ay - 4);
    ctx.lineTo(ax + aLen, ay);
    ctx.lineTo(ax + aLen - 5, ay + 4);
    ctx.stroke();
    ctx.restore();
  }

  // ── Characters (chalk layering effect) ──
  const textColor = s.textColor ?? s.color;
  ctx.font = `${s.fontWeight} ${s.fontSize}px 'Caveat', cursive`;

  // Pass 1 — ghost
  ctx.fillStyle = hexToRgba(textColor, 0.12);
  for (let i = 0; i < drawChars; i++) {
    const ch = lel.chars[i];
    ctx.fillText(ch.char, ch.x + 0.5, ch.y + 0.4);
  }
  // Pass 2 — mid
  ctx.fillStyle = hexToRgba(textColor, 0.28);
  for (let i = 0; i < drawChars; i++) {
    const ch = lel.chars[i];
    ctx.fillText(ch.char, ch.x - 0.3, ch.y - 0.3);
  }
  // Pass 3 — main stroke
  ctx.fillStyle = hexToRgba(textColor, 0.9);
  for (let i = 0; i < drawChars; i++) {
    const ch = lel.chars[i];
    ctx.fillText(ch.char, ch.x, ch.y);
  }

  // ── Cursor dot (moving pen tip) ──
  if (!isDone && drawChars > 0 && drawChars < lel.chars.length) {
    const last = lel.chars[drawChars - 1];
    ctx.font = `${s.fontWeight} ${s.fontSize}px 'Caveat', cursive`;
    const cw = ctx.measureText(last.char).width;
    const cx = last.x + cw + 3;
    const cy = last.y - s.fontSize * 0.38;
    // Ink blob
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(textColor, 0.65);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(textColor, 0.1);
    ctx.fill();
    ctx.restore();
  }

  // ── Underline for titles ──
  if (s.hasUnderline && (isDone || drawChars >= lel.chars.length)) {
    const uly = lel.contentY + lel.lines.length * s.lineHeight + 4;
    ctx.save();
    ctx.strokeStyle = hexToRgba(textColor, 0.3);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAD_X, uly);
    ctx.lineTo(canvasW - PAD_X, uly);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

// ─── Component ──────────────────────────────────────────────────────────────
export const ChalkBoardCanvas = forwardRef<ChalkBoardHandle, Props>(
  ({ elementos, playing, speedMultiplier = 1, onFirstChar, onAllDone }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

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

    // ── Redraw all elements up to current state ─────────────────────────────
    const redraw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const st = stateRef.current;
      const { canvasW, canvasH, layout, elIdx, charIdx, scrollY, phase } = st;

      ctx.clearRect(0, 0, canvasW, canvasH);

      // Subtle ruled lines
      ctx.save();
      for (let ly = 40; ly < st.totalHeight; ly += 32) {
        const screenY = ly - scrollY;
        if (screenY < -32 || screenY > canvasH + 32) continue;
        ctx.strokeStyle = "rgba(203,213,225,0.35)";
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(canvasW, screenY);
        ctx.stroke();
      }
      ctx.restore();

      // All elements
      for (let i = 0; i < layout.length; i++) {
        if (i < elIdx) {
          // Previously completed elements: fully drawn
          drawElement(ctx, layout[i], -1, scrollY, canvasW);
        } else if (i === elIdx) {
          // Current element: fully drawn during pause/done, progressive during drawing
          const count = (phase === "pause" || phase === "done") ? -1 : charIdx;
          drawElement(ctx, layout[i], count, scrollY, canvasW);
        }
        // Future elements: not drawn
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
          // Advance to next element
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

        // Separador: instant
        if (lel.el.tipo === "separador") {
          redraw();
          st.phase = "pause";
          st.pauseRemaining = s.pauseAfter / speedMultiplier;
          rafRef.current = requestAnimationFrame(animate);
          return;
        }

        // Fire firstChar callback
        if (!st.firstCharFired && st.charIdx === 0) {
          st.firstCharFired = true;
          onFirstCharRef.current?.();
        }

        // Advance chars based on elapsed time
        st.msAccum += dt;
        const msPerChar = Math.max(1, s.msPerChar / speedMultiplier);
        const add = Math.floor(st.msAccum / msPerChar);
        if (add > 0) {
          st.msAccum -= add * msPerChar;
          st.charIdx = Math.min(st.charIdx + add, lel.chars.length);
        }

        // Auto-scroll: keep writing cursor in lower 3/4 of canvas
        const lastCharY = (lel.chars[Math.max(0, st.charIdx - 1)]?.y ?? 0) - (st.scrollY);
        if (lastCharY > st.canvasH * 0.7) {
          st.scrollY += lastCharY - st.canvasH * 0.55;
        }

        if (st.charIdx >= lel.chars.length) {
          // Element fully written: enter pause (elIdx stays at current element)
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

      // Size canvas for sharp rendering
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Reset transform then apply DPR scale
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
      ctx.clearRect(0, 0, w, h);

      if (playing) {
        rafRef.current = requestAnimationFrame(animate);
      }
    }, [elementos, playing, animate]);

    useImperativeHandle(ref, () => ({ restart: () => setup() }), [setup]);

    // Rebuild when elementos change
    useEffect(() => {
      document.fonts.ready.then(() => setup());
      return () => cancelAnimationFrame(rafRef.current);
    }, [elementos]); // eslint-disable-line

    // playing toggle
    useEffect(() => {
      const st = stateRef.current;
      if (playing && st.phase === "idle") {
        st.phase = "drawing";
        st.lastTime = 0;
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(animate);
      }
    }, [playing, animate]);

    // Resize observer
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
      <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-white">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    );
  }
);
ChalkBoardCanvas.displayName = "ChalkBoardCanvas";
