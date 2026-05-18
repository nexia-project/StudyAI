import type { Request, Response, NextFunction } from "express";

// ─── Magic bytes for allowed file types ───────────────────────────────────────
const ALLOWED_MAGIC: Record<string, { magic: Buffer[]; ext: string }> = {
  "application/pdf": {
    magic: [Buffer.from([0x25, 0x50, 0x44, 0x46])], // %PDF
    ext: ".pdf",
  },
  "text/plain": {
    magic: [], // text has no magic bytes — validated by UTF-8 check
    ext: ".txt",
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    magic: [Buffer.from([0x50, 0x4b, 0x03, 0x04])], // ZIP/DOCX magic bytes
    ext: ".docx",
  },
  "application/msword": {
    magic: [Buffer.from([0xd0, 0xcf, 0x11, 0xe0])], // DOC magic bytes
    ext: ".doc",
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    magic: [Buffer.from([0x50, 0x4b, 0x03, 0x04])], // ZIP/PPTX magic bytes
    ext: ".pptx",
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    magic: [Buffer.from([0x50, 0x4b, 0x03, 0x04])], // ZIP/XLSX magic bytes
    ext: ".xlsx",
  },
  "text/csv": {
    magic: [], // CSV has no magic bytes
    ext: ".csv",
  },
  "application/epub+zip": {
    magic: [Buffer.from([0x50, 0x4b, 0x03, 0x04])], // ZIP/EPUB magic bytes
    ext: ".epub",
  },
};

export function validateFileUpload(req: Request, res: Response, next: NextFunction) {
  if (!req.file) { next(); return; }

  const mime = req.file.mimetype;

  if (!ALLOWED_MAGIC[mime]) {
    res.status(400).json({
      ok: false,
      code: "UNSUPPORTED_FILE_TYPE",
      erro: "Tipo de arquivo não permitido. Envie PDF, DOCX, DOC, TXT, XLSX, CSV ou EPUB.",
    });
    return;
  }

  // Verify magic bytes for PDF
  if (mime === "application/pdf") {
    const pdfMagic = ALLOWED_MAGIC["application/pdf"].magic[0];
    if (!req.file.buffer.slice(0, 4).equals(pdfMagic)) {
      res.status(400).json({ ok: false, code: "INVALID_PDF", erro: "Arquivo inválido: não é um PDF real." });
      return;
    }
  }

  // Verify magic bytes for DOCX / PPTX / XLSX / EPUB (all are ZIP containers)
  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "application/epub+zip"
  ) {
    const zipMagic = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    if (!req.file.buffer.slice(0, 4).equals(zipMagic)) {
      res.status(400).json({ ok: false, code: "INVALID_OFFICE_FILE", erro: "Arquivo inválido: não é um arquivo Office/EPUB real." });
      return;
    }
  }

  // Verify magic bytes for DOC
  if (mime === "application/msword") {
    const docMagic = ALLOWED_MAGIC[mime].magic[0];
    if (!req.file.buffer.slice(0, 4).equals(docMagic)) {
      res.status(400).json({ ok: false, code: "INVALID_DOC", erro: "Arquivo inválido: não é um DOC real." });
      return;
    }
  }

  // For text/plain, check it's valid UTF-8 (no binary garbage)
  if (mime === "text/plain") {
    try {
      const decoder = new TextDecoder("utf-8", { fatal: true });
      decoder.decode(req.file.buffer);
    } catch {
      res.status(400).json({ ok: false, code: "INVALID_TEXT_ENCODING", erro: "Arquivo de texto inválido: encoding não suportado." });
      return;
    }
  }

  // File size: 50MB max (already enforced by multer, but double-check)
  if (req.file.size > 50 * 1024 * 1024) {
    res.status(413).json({ ok: false, code: "FILE_TOO_LARGE", erro: "Arquivo muito grande. Máximo 50 MB." });
    return;
  }

  next();
}

// ─── Input sanitization: strip null bytes, limit string lengths ───────────────
const MAX_FIELD_LENGTHS: Record<string, number> = {
  title: 300,
  subject: 200,
  materia: 200,
  nome: 200,
  message: 2000,
  tags: 500,
  gradeLevel: 50,
  serie: 100,
  organ: 300,
  position: 200,
  cpf: 20,
  escola: 300,
  cidade: 200,
  estado: 50,
};

export function sanitizeInputs(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === "object") {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === "string") {
        // Strip null bytes (can break postgres TEXT columns)
        let sanitized = value.replace(/\0/g, "");
        // Enforce field-specific length limits (use hasOwn to avoid prototype pollution)
        const maxLen = Object.hasOwn(MAX_FIELD_LENGTHS, key) ? MAX_FIELD_LENGTHS[key as keyof typeof MAX_FIELD_LENGTHS] : undefined;
        if (maxLen && sanitized.length > maxLen) {
          sanitized = sanitized.slice(0, maxLen);
        }
        req.body[key] = sanitized;
      }
    }
  }
  next();
}

// ─── Security headers (add to sensitive routes) ───────────────────────────────
export function noCache(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
}
