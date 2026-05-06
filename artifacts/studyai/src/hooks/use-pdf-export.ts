import { jsPDF } from "jspdf";
import type { StudyPlan } from "./use-study-plan";

const PRIMARY = "#F26207";
const DARK = "#1A1612";
const GRAY = "#6B7280";
const LIGHT_GRAY = "#F5F5F5";
const BG = "#FAFAFA";

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

// Strip emojis and non-latin extended characters so jsPDF standard fonts render correctly
function safe(str: string | undefined | null): string {
  if (!str) return "";
  return str
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
    .replace(/[\u{2600}-\u{27BF}]/gu, "")
    .replace(/[\u{FE00}-\u{FE0F}]/gu, "")
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, "")
    .replace(/[\u{2300}-\u{23FF}]/gu, "")
    .replace(/\uFFFD/g, "")
    .trim();
}

function wrapText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const lines = doc.splitTextToSize(safe(text), maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function addPageHeader(doc: jsPDF, pageNum: number, subject: string) {
  const [pr, pg, pb] = hexToRgb(PRIMARY);
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 0, 210, 6, "F");
  if (pageNum > 1) {
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.setFont("helvetica", "normal");
    doc.text(`StudyAI — ${safe(subject)} — study.ia.br`, 105, 13, { align: "center" });
  }
}

function addPageFooter(doc: jsPDF, pageNum: number, total: number) {
  const pageH = doc.internal.pageSize.height;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 180, 180);
  doc.text(`Pagina ${pageNum} de ${total}`, 105, pageH - 5, { align: "center" });
  doc.text("Gerado por StudyAI  study.ia.br", 200, pageH - 5, { align: "right" });
  // Bottom rule
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  doc.line(18, pageH - 9, 192, pageH - 9);
}

export async function exportStudyPlanPDF(plan: StudyPlan): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = doc.internal.pageSize.height;
  const margin = 18;
  const contentW = pageW - margin * 2;
  const lineH = 5.2;

  let y = 0;
  let pageNum = 1;

  const checkNewPage = (needed: number = 20) => {
    if (y + needed > pageH - 18) {
      addPageFooter(doc, pageNum, 99);
      doc.addPage();
      pageNum++;
      addPageHeader(doc, pageNum, plan.materia || "Plano de Estudos");
      y = 20;
    }
  };

  // ── COVER PAGE ───────────────────────────────────────────────────────────
  addPageHeader(doc, 1, plan.materia || "Plano de Estudos");

  const [pr, pg, pb] = hexToRgb(plan.cor || PRIMARY);

  // Large color band
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 6, 210, 72, "F");

  // Dark overlay bottom (simulate transparency with a near-black blended color)
  doc.setFillColor(20, 15, 10);
  doc.rect(0, 68, 210, 10, "F");

  // Title
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("PLANO DE ESTUDOS", 105, 38, { align: "center" });

  // Subject
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(255, 255, 255);
  const materiaText = safe(plan.materia?.toUpperCase() || "").slice(0, 60);
  doc.text(materiaText, 105, 52, { align: "center" });

  // White card body
  y = 88;

  // Student name
  doc.setFontSize(15);
  doc.setTextColor(...hexToRgb(DARK));
  doc.setFont("helvetica", "bold");
  const alunoText = plan.aluno ? `Aluno(a): ${safe(plan.aluno)}` : "Seu Plano Personalizado";
  doc.text(alunoText, 105, y, { align: "center" });
  y += 7;

  // Date
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(130, 130, 130);
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}`, 105, y, { align: "center" });
  y += 12;

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // Motivational quote box
  if (plan.mensagemMotivacional) {
    doc.setFillColor(245, 245, 245);
    const quoteLines = doc.splitTextToSize(`"${safe(plan.mensagemMotivacional)}"`, contentW - 12);
    const quoteH = quoteLines.length * 5.5 + 14;
    doc.roundedRect(margin, y, contentW, quoteH, 3, 3, "F");
    doc.setFillColor(pr, pg, pb);
    doc.rect(margin, y, 3, quoteH, "F");
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...hexToRgb(DARK));
    doc.text(quoteLines, margin + 8, y + 7);
    y += quoteH + 8;
  }

  // Summary of content
  if (plan.resumoDoConteudo) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hexToRgb(PRIMARY));
    doc.text("RESUMO DO CONTEUDO", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...hexToRgb(DARK));
    y = wrapText(doc, plan.resumoDoConteudo, margin, y, contentW, lineH);
    y += 6;
  }

  // Stats row
  doc.setFillColor(pr, pg, pb);
  doc.roundedRect(margin, y, contentW, 24, 4, 4, "F");
  const colW = contentW / 3;
  const statsValues = [
    { label: "DIAS DE ESTUDO", value: String(plan.dias?.length || 0) },
    { label: "XP TOTAL", value: `${plan.xpTotal || 0} XP` },
    { label: "NIVEL DE DIFICULDADE", value: `${plan.nivel || 1}/5` },
  ];
  statsValues.forEach((stat, i) => {
    const cx = margin + colW * i + colW / 2;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(stat.value, cx, y + 11, { align: "center" });
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(255, 230, 200);
    doc.text(stat.label, cx, y + 17, { align: "center" });
  });
  y += 30;

  // Dicas gerais preview on cover
  if (plan.dicasGerais && plan.dicasGerais.length > 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hexToRgb(PRIMARY));
    doc.text("DICAS GERAIS", margin, y);
    y += 5;
    for (const dica of plan.dicasGerais.slice(0, 4)) {
      const lines = doc.splitTextToSize(`• ${safe(dica)}`, contentW - 4);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...hexToRgb(DARK));
      doc.text(lines, margin + 2, y);
      y += lines.length * lineH + 2;
      if (y > pageH - 30) break;
    }
  }

  addPageFooter(doc, pageNum, 99);

  // ── SUMMARY PAGE ──────────────────────────────────────────────────────────
  if (plan.dias && plan.dias.length > 0) {
    doc.addPage();
    pageNum++;
    addPageHeader(doc, pageNum, plan.materia || "Plano de Estudos");
    y = 22;

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hexToRgb(PRIMARY));
    doc.text("VISAO GERAL DO PLANO", margin, y);
    y += 8;

    // Day index table
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y, contentW, 8, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text("DIA", margin + 4, y + 5.5);
    doc.text("TITULO", margin + 20, y + 5.5);
    doc.text("TOPICOS", margin + 100, y + 5.5);
    doc.text("XP", margin + 135, y + 5.5);
    doc.text("TEMPO", margin + 152, y + 5.5);
    y += 10;

    for (const day of plan.dias) {
      checkNewPage(10);
      const isEven = day.numero % 2 === 0;
      if (isEven) {
        doc.setFillColor(252, 252, 252);
        doc.rect(margin, y - 2, contentW, 8, "F");
      }
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(pr, pg, pb);
      doc.text(`Dia ${day.numero}`, margin + 4, y + 3.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...hexToRgb(DARK));
      const titleSafe = safe(day.titulo || "").slice(0, 50);
      doc.text(titleSafe, margin + 20, y + 3.5);
      doc.setTextColor(100, 100, 100);
      doc.text(String((day.topicos || []).length), margin + 103, y + 3.5);
      doc.text(`${day.xp || 0} XP`, margin + 135, y + 3.5);
      doc.text(safe(day.tempoEstimado || ""), margin + 152, y + 3.5);
      y += 8;
    }

    addPageFooter(doc, pageNum, 99);
  }

  // ── DAY PAGES ────────────────────────────────────────────────────────────
  for (const day of plan.dias || []) {
    doc.addPage();
    pageNum++;
    addPageHeader(doc, pageNum, plan.materia || "Plano de Estudos");
    y = 18;

    // Day header bar
    const dayColor = day.cor || plan.cor || PRIMARY;
    const [dr, dg, db] = hexToRgb(dayColor);
    doc.setFillColor(dr, dg, db);
    doc.roundedRect(margin, y, contentW, 20, 4, 4, "F");

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(`Dia ${day.numero} — ${safe(day.titulo || "")}`, margin + 5, y + 13);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(255, 220, 190);
    const metaText = [safe(day.tempoEstimado || ""), `${day.xp || 0} XP`].filter(Boolean).join("  |  ");
    doc.text(metaText, pageW - margin - 4, y + 13, { align: "right" });
    y += 26;

    // Mission box
    if (day.missao) {
      doc.setFillColor(248, 248, 248);
      const missaoLines = doc.splitTextToSize(safe(day.missao), contentW - 10);
      const missaoH = missaoLines.length * 4.8 + 14;
      doc.roundedRect(margin, y, contentW, missaoH, 3, 3, "F");
      doc.setFillColor(dr, dg, db);
      doc.rect(margin, y, 3, missaoH, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(dr, dg, db);
      doc.text("MISSAO DO DIA", margin + 7, y + 6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...hexToRgb(DARK));
      doc.text(missaoLines, margin + 7, y + 11);
      y += missaoH + 6;
    }

    // Topics
    const topicos = day.topicos || [];
    if (topicos.length > 0) {
      checkNewPage(16);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(dr, dg, db);
      doc.text("TOPICOS DE ESTUDO", margin, y);
      y += 6;

      for (const [i, topic] of topicos.entries()) {
        const name = safe(typeof topic === "string" ? topic : (topic as any).nome || "");
        const exp = safe(typeof topic === "string" ? "" : (topic as any).explicacao || "");
        const gatilho = safe(typeof topic === "string" ? "" : (topic as any).gatilho || "");
        const ex = typeof topic === "string" ? null : (topic as any).exercicio;

        // Estimate block height
        const expLines = exp ? doc.splitTextToSize(exp, contentW - 8) : [];
        const gatilhoLines = gatilho ? doc.splitTextToSize(gatilho, contentW - 10) : [];
        const exLines = ex?.pergunta ? doc.splitTextToSize(safe(ex.pergunta), contentW - 10) : [];
        const exRespLines = ex?.resposta ? doc.splitTextToSize(`Resposta: ${safe(ex.resposta)}`, contentW - 10) : [];
        const blockH = 8 + expLines.length * 4.5 + gatilhoLines.length * 4.5 + (ex?.pergunta ? exLines.length * 4.5 + exRespLines.length * 4.5 + 12 : 0) + 4;
        checkNewPage(blockH);

        // Topic header
        doc.setFillColor(245, 245, 245);
        doc.setDrawColor(dr, dg, db);
        doc.setLineWidth(0.4);
        doc.roundedRect(margin, y, contentW, 7, 2, 2, "FD");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...hexToRgb(DARK));
        doc.text(`${i + 1}. ${name}`, margin + 3, y + 5);
        y += 9;

        if (exp) {
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...(hexToRgb(GRAY) as [number, number, number]));
          doc.text(expLines, margin + 4, y);
          y += expLines.length * 4.5 + 2;
        }

        if (gatilho) {
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(dr, dg, db);
          doc.text(`Gatilho: ${gatilhoLines[0] || ""}`, margin + 4, y);
          y += 5;
        }

        // Exercise
        if (ex?.pergunta) {
          checkNewPage(20);
          doc.setFillColor(240, 245, 255);
          const qLines = doc.splitTextToSize(`P: ${safe(ex.pergunta)}`, contentW - 10);
          const aLines = doc.splitTextToSize(`R: ${safe(ex.resposta || "")}`, contentW - 10);
          const exH = (qLines.length + aLines.length) * 4.5 + 12;
          doc.roundedRect(margin + 2, y, contentW - 4, exH, 2, 2, "F");
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(dr, dg, db);
          doc.text("EXERCICIO RAPIDO", margin + 5, y + 5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...hexToRgb(DARK));
          doc.text(qLines, margin + 5, y + 10);
          doc.setTextColor(...(hexToRgb(GRAY) as [number, number, number]));
          doc.text(aLines, margin + 5, y + 10 + qLines.length * 4.5 + 2);
          y += exH + 4;
        }

        y += 3;
      }
    }

    // Exercicios do dia (dedicated section with full Q&A)
    if (day.exerciciosDoDia && day.exerciciosDoDia.length > 0) {
      checkNewPage(24);
      y += 2;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(dr, dg, db);
      doc.text("EXERCICIOS DO DIA", margin, y);
      y += 6;

      for (const ex of day.exerciciosDoDia) {
        const qLines = doc.splitTextToSize(`${ex.numero}. ${safe(ex.pergunta || "")}`, contentW - 8);
        const gabLines = doc.splitTextToSize(`Gabarito: ${safe(ex.gabarito || "")}`, contentW - 8);
        const exH = (qLines.length + gabLines.length) * 4.8 + 14;
        checkNewPage(exH);

        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, y, contentW, exH, 2, 2, "FD");
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...hexToRgb(DARK));
        doc.text(qLines, margin + 4, y + 5);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 130, 100);
        doc.text(gabLines, margin + 4, y + 5 + qLines.length * 4.8 + 3);
        y += exH + 4;
      }
    }

    // Analysis / Analise do dia
    if ((day as any).analise) {
      checkNewPage(20);
      y += 2;
      const analLines = doc.splitTextToSize(safe((day as any).analise), contentW - 10);
      const analH = analLines.length * 4.8 + 14;
      doc.setFillColor(255, 250, 240);
      doc.setDrawColor(pr, pg, pb);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, y, contentW, analH, 3, 3, "FD");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(pr, pg, pb);
      doc.text("ANALISE DO DIA", margin + 5, y + 6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...hexToRgb(DARK));
      doc.text(analLines, margin + 5, y + 11);
      y += analH + 4;
    }

    // Tip + Activity
    checkNewPage(22);
    y += 2;
    const halfW = (contentW - 6) / 2;

    if (day.dica || day.atividade) {
      const tipLines = day.dica ? doc.splitTextToSize(safe(day.dica), halfW - 8) : [];
      const actLines = day.atividade ? doc.splitTextToSize(safe(day.atividade), halfW - 8) : [];
      const boxH = Math.max(tipLines.length, actLines.length) * 4.5 + 16;
      checkNewPage(boxH);

      // Tip box
      if (day.dica) {
        doc.setFillColor(248, 252, 248);
        doc.setDrawColor(180, 220, 180);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, y, halfW, boxH, 3, 3, "FD");
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60, 150, 60);
        doc.text("DICA DO DIA", margin + 4, y + 6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...hexToRgb(DARK));
        doc.text(tipLines, margin + 4, y + 11);
      }

      // Activity box
      if (day.atividade) {
        doc.setFillColor(248, 248, 255);
        doc.setDrawColor(180, 180, 230);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin + halfW + 6, y, halfW, boxH, 3, 3, "FD");
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(dr, dg, db);
        doc.text("ATIVIDADE", margin + halfW + 10, y + 6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...hexToRgb(DARK));
        doc.text(actLines, margin + halfW + 10, y + 11);
      }

      y += boxH + 6;
    }

    // Resumo do dia
    if ((day as any).resumo) {
      checkNewPage(20);
      const resLines = doc.splitTextToSize(safe((day as any).resumo), contentW - 10);
      const resH = resLines.length * 4.8 + 14;
      doc.setFillColor(245, 245, 250);
      doc.roundedRect(margin, y, contentW, resH, 3, 3, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 60, 160);
      doc.text("RESUMO", margin + 5, y + 6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...hexToRgb(DARK));
      doc.text(resLines, margin + 5, y + 11);
      y += resH + 4;
    }

    addPageFooter(doc, pageNum, 99);
  }

  // ── ALL GENERAL TIPS PAGE ────────────────────────────────────────────────
  if (plan.dicasGerais && plan.dicasGerais.length > 0) {
    doc.addPage();
    pageNum++;
    addPageHeader(doc, pageNum, plan.materia || "Plano de Estudos");
    y = 22;

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hexToRgb(PRIMARY));
    doc.text("DICAS GERAIS DE ESTUDO", margin, y);
    y += 8;

    for (const [i, dica] of plan.dicasGerais.entries()) {
      const dicaLines = doc.splitTextToSize(safe(dica), contentW - 10);
      const h = dicaLines.length * 4.8 + 12;
      checkNewPage(h);
      doc.setFillColor(i % 2 === 0 ? 252 : 248, i % 2 === 0 ? 250 : 248, i % 2 === 0 ? 240 : 252);
      doc.roundedRect(margin, y, contentW, h, 2, 2, "F");
      doc.setFillColor(pr, pg, pb);
      doc.rect(margin, y, 3, h, "F");
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...hexToRgb(DARK));
      doc.text(dicaLines, margin + 7, y + 7);
      y += h + 4;
    }

    addPageFooter(doc, pageNum, 99);
  }

  // Fix page count in all footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.height;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 180, 180);
    doc.text(`Pagina ${i} de ${totalPages}`, 105, ph - 5, { align: "center" });
    doc.text("Gerado por StudyAI  study.ia.br", 200, ph - 5, { align: "right" });
  }

  const safeMateria = safe(plan.materia || "plano").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
  doc.save(`StudyAI_${safeMateria}.pdf`);
}
