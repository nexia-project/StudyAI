import { PDFDocument } from 'pdf-lib';
import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function gerarPDF() {
  const pdfDoc = await PDFDocument.create();

  for (let i = 1; i <= 9; i++) {
    const imgPath = join(__dirname, 'slides-screenshots', `slide${i}.jpg`);
    const imgBytes = await readFile(imgPath);
    const img = await pdfDoc.embedJpg(imgBytes);

    const { width, height } = img.scale(1);
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(img, { x: 0, y: 0, width, height });
    console.log(`Slide ${i} adicionado (${width}x${height})`);
  }

  const pdfBytes = await pdfDoc.save();
  const outPath = join(__dirname, 'StudyAI-Apresentacao.pdf');
  await writeFile(outPath, pdfBytes);
  console.log(`\nPDF gerado: ${outPath} (${(pdfBytes.length / 1024).toFixed(0)} KB)`);
}

gerarPDF().catch(console.error);
