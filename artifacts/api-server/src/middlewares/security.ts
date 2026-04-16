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
};

export function validateFileUpload(req: Request, res: Response, next: NextFunction) {
  if (!req.file) { next(); return; }

  const mime = req.file.mimetype;

  // Only allow PDF and plain text
  if (!ALLOWED_MAGIC[mime] && mime !== "text/plain") {
    res.status(400).json({ erro: "Tipo de arquivo não permitido. Envie PDF ou TXT." });
    return;
  }

  // Verify magic bytes for PDF
  if (mime === "application/pdf") {
    const pdfMagic = ALLOWED_MAGIC["application/pdf"].magic[0];
    if (!req.file.buffer.slice(0, 4).equals(pdfMagic)) {
      res.status(400).json({ erro: "Arquivo inválido: não é um PDF real." });
      return;
    }
  }

  // For text/plain, check it's valid UTF-8 (no binary garbage)
  if (mime === "text/plain") {
    try {
      const decoder = new TextDecoder("utf-8", { fatal: true });
      decoder.decode(req.file.buffer);
    } catch {
      res.status(400).json({ erro: "Arquivo de texto inválido: encoding não suportado." });
      return;
    }
  }

  // File size: 50MB max (already enforced by multer, but double-check)
  if (req.file.size > 50 * 1024 * 1024) {
    res.status(400).json({ erro: "Arquivo muito grande. Máximo 50 MB." });
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
        // Enforce field-specific length limits
        const maxLen = MAX_FIELD_LENGTHS[key];
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
