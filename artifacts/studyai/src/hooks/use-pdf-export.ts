import { jsPDF } from "jspdf";
import type { StudyPlan } from "./use-study-plan";

const PRIMARY = "#F26207";
const DARK = "#1A1612";
const GRAY = "#6B7280";
const LIGHT_GRAY = "#F5F5F5";

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function wrapText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function addPageHeader(doc: jsPDF, pageNum: number) {
  const [pr, pg, pb] = hexToRgb(PRIMARY);
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 0, 210, 8, "F");
  if (pageNum > 1) {
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text("StudyAI — study.ia.br", 105, 14, { align: "center" });
  }
}

function addPageFooter(doc: jsPDF, pageNum: number, total: number) {
  const pageH = doc.internal.pageSize.height;
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text(`Página ${pageNum} de ${total}`, 105, pageH - 6, { align: "center" });
  doc.text("Gerado por StudyAI • study.ia.br", 200, pageH - 6, { align: "right" });
}

export async function exportStudyPlanPDF(plan: StudyPlan): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = doc.internal.pageSize.height;
  const margin = 18;
  const contentW = pageW - margin * 2;
  const lineH = 5.5;

  let y = 0;
  let pageNum = 1;

  const checkNewPage = (needed: number = 20) => {
    if (y + needed > pageH - 18) {
      addPageFooter(doc, pageNum, 99);
      doc.addPage();
      pageNum++;
      addPageHeader(doc, pageNum);
      y = 22;
    }
  };

  // ── COVER PAGE ───────────────────────────────────────────────────────────
  addPageHeader(doc, 1);

  // Colored accent band
  const [pr, pg, pb] = hexToRgb(plan.cor || PRIMARY);
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 8, 210, 70, "F");

  // Emoji block
  doc.setFontSize(48);
  doc.text(plan.emoji || "📚", 105, 48, { align: "center" });

  // Title
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("PLANO DE ESTUDOS", 105, 62, { align: "center" });

  // Subject
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(255, 255, 255);
  doc.text(plan.materia?.toUpperCase() || "", 105, 70, { align: "center" });

  y = 92;

  // Student name
  doc.setFontSize(14);
  doc.setTextColor(...hexToRgb(DARK));
  doc.setFont("helvetica", "bold");
  doc.text(plan.aluno ? `Aluno(a): ${plan.aluno}` : "Seu Plano Personalizado", 105, y, { align: "center" });
  y += 8;

  // Date
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...(hexToRgb(GRAY) as [number, number, number]));
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}`, 105, y, { align: "center" });
  y += 12;

  // Motivational quote box
  doc.setFillColor(...hexToRgb(LIGHT_GRAY));
  doc.roundedRect(margin, y, contentW, 22, 4, 4, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...hexToRgb(DARK));
  const quoteLines = doc.splitTextToSize(`"${plan.mensagemMotivacional}"`, contentW - 8);
  doc.text(quoteLines, 105, y + 8, { align: "center" });
  y += 26;

  // Summary box
  if (plan.resumoDoConteudo) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hexToRgb(PRIMARY));
    doc.text("RESUMO DO CONTEÚDO", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...hexToRgb(DARK));
    y = wrapText(doc, plan.resumoDoConteudo, margin, y, contentW, lineH);
    y += 6;
  }

  // Stats row
  doc.setFillColor(pr, pg, pb);
  doc.roundedRect(margin, y, contentW, 20, 4, 4, "F");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  const statsY = y + 8;
  doc.text(`${plan.dias?.length || 0} DIAS`, margin + contentW * 0.16, statsY, { align: "center" });
  doc.text(`${plan.xpTotal || 0} XP`, margin + contentW * 0.5, statsY, { align: "center" });
  doc.text(`NÍVEL ${plan.nivel || 1}`, margin + contentW * 0.84, statsY, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(255, 255, 255);
  doc.text("de estudo", margin + contentW * 0.16, statsY + 5, { align: "center" });
  doc.text("total", margin + contentW * 0.5, statsY + 5, { align: "center" });
  doc.text("de dificuldade", margin + contentW * 0.84, statsY + 5, { align: "center" });
  y += 26;

  addPageFooter(doc, pageNum, 99);

  // ── DAY PAGES ────────────────────────────────────────────────────────────
  for (const day of plan.dias || []) {
    doc.addPage();
    pageNum++;
    addPageHeader(doc, pageNum);
    y = 16;

    // Day header bar
    const dayColor = day.cor || plan.cor || PRIMARY;
    const [dr, dg, db] = hexToRgb(dayColor);
    doc.setFillColor(dr, dg, db);
    doc.roundedRect(margin, y, contentW, 18, 4, 4, "F");
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(`${day.emoji || "📅"} Dia ${day.numero} — ${day.titulo}`, margin + 5, y + 12);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`${day.tempoEstimado || ""}  •  ${day.xp || 0} XP`, pageW - margin - 4, y + 12, { align: "right" });
    y += 24;

    // Mission
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, y, contentW, 14, 3, 3, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(dr, dg, db);
    doc.text("🎯 MISSÃO DO DIA", margin + 4, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...hexToRgb(DARK));
    const missionLines = doc.splitTextToSize(day.missao || "", contentW - 8);
    doc.text(missionLines.slice(0, 2), margin + 4, y + 10);
    y += 18;

    // Topics
    const topicos = day.topicos || [];
    if (topicos.length > 0) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(dr, dg, db);
      doc.text("TÓPICOS DE ESTUDO", margin, y);
      y += 5;

      for (const [i, topic] of topicos.entries()) {
        checkNewPage(28);
        const name = typeof topic === "string" ? topic : (topic as any).nome || "";
        const exp = typeof topic === "string" ? "" : (topic as any).explicacao || "";
        const gatilho = typeof topic === "string" ? "" : (topic as any).gatilho || "";

        // Topic row
        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(dr, dg, db);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin, y, contentW, 6, 2, 2, "FD");
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...hexToRgb(DARK));
        doc.text(`${i + 1}. ${name}`, margin + 3, y + 4.5);
        y += 7;

        if (exp) {
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...(hexToRgb(GRAY) as [number, number, number]));
          const expLines = doc.splitTextToSize(exp, contentW - 6);
          doc.text(expLines.slice(0, 3), margin + 3, y);
          y += Math.min(expLines.length, 3) * 4.2;
        }

        if (gatilho) {
          checkNewPage(10);
          doc.setFontSize(7);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(dr, dg, db);
          doc.text(`⚡ ${gatilho}`, margin + 3, y);
          y += 5;
        }

        // Exercício do tópico
        const ex = typeof topic === "string" ? null : (topic as any).exercicio;
        if (ex?.pergunta) {
          checkNewPage(12);
          doc.setFillColor(240, 240, 240);
          doc.roundedRect(margin + 2, y, contentW - 4, 10, 2, 2, "F");
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(dr, dg, db);
          doc.text("? " + ex.pergunta, margin + 5, y + 4);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...(hexToRgb(GRAY) as [number, number, number]));
          doc.text("Resp: " + ex.resposta, margin + 5, y + 8.5);
          y += 13;
        }

        y += 2;
      }
    }

    // Exercícios do dia
    if (day.exerciciosDoDia && day.exerciciosDoDia.length > 0) {
      checkNewPage(20);
      y += 2;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(dr, dg, db);
      doc.text("EXERCÍCIOS DO DIA", margin, y);
      y += 5;

      for (const ex of day.exerciciosDoDia) {
        checkNewPage(16);
        doc.setFillColor(248, 248, 248);
        doc.roundedRect(margin, y, contentW, 14, 2, 2, "F");
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...hexToRgb(DARK));
        const qLines = doc.splitTextToSize(`${ex.numero}. ${ex.pergunta}`, contentW - 6);
        doc.text(qLines.slice(0, 2), margin + 3, y + 4);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(...(hexToRgb(GRAY) as [number, number, number]));
        doc.text(`Gabarito: ${ex.gabarito}`, margin + 3, y + 11);
        y += 17;
      }
    }

    // Tip + Activity
    checkNewPage(22);
    y += 2;
    const halfW = (contentW - 4) / 2;

    // Tip box
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, y, halfW, 16, 3, 3, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(dr, dg, db);
    doc.text("💡 DICA", margin + 3, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...hexToRgb(DARK));
    const tipLines = doc.splitTextToSize(day.dica || "", halfW - 6);
    doc.text(tipLines.slice(0, 2), margin + 3, y + 10);

    // Activity box
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin + halfW + 4, y, halfW, 16, 3, 3, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(dr, dg, db);
    doc.text("🎮 ATIVIDADE", margin + halfW + 7, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...hexToRgb(DARK));
    const actLines = doc.splitTextToSize(day.atividade || "", halfW - 6);
    doc.text(actLines.slice(0, 2), margin + halfW + 7, y + 10);
    y += 20;

    addPageFooter(doc, pageNum, 99);
  }

  // ── GENERAL TIPS PAGE ────────────────────────────────────────────────────
  if (plan.dicasGerais && plan.dicasGerais.length > 0) {
    doc.addPage();
    pageNum++;
    addPageHeader(doc, pageNum);
    y = 20;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hexToRgb(PRIMARY));
    doc.text("📌 DICAS GERAIS", margin, y);
    y += 8;

    for (const dica of plan.dicasGerais) {
      checkNewPage(12);
      doc.setFillColor(250, 245, 241);
      doc.roundedRect(margin, y, contentW, 10, 2, 2, "F");
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...hexToRgb(DARK));
      const dicaLines = doc.splitTextToSize(`• ${dica}`, contentW - 8);
      doc.text(dicaLines.slice(0, 2), margin + 4, y + 6.5);
      y += 13;
    }

    addPageFooter(doc, pageNum, 99);
  }

  // Fix page count
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.height;
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text(`Página ${i} de ${totalPages}`, 105, ph - 6, { align: "center" });
    doc.text("Gerado por StudyAI • study.ia.br", 200, ph - 6, { align: "right" });
  }

  const safeMateria = (plan.materia || "plano").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
  doc.save(`StudyAI_${safeMateria}.pdf`);
}
