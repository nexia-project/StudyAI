import { type Request, type Response, type NextFunction } from "express";

interface UserBucket {
  count: number;
  resetAt: number;
}

const userBuckets = new Map<string, UserBucket>();

// Limpa buckets expirados a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of userBuckets) {
    if (now > bucket.resetAt) userBuckets.delete(key);
  }
}, 5 * 60 * 1000).unref();

/**
 * Rate limiter por userId (não por IP).
 * Mais justo que IP em ambientes como Replit onde vários users compartilham IP.
 * @param max Máximo de requests por janela
 * @param windowMs Janela em ms (default 15 min)
 */
export function userRateLimit(max: number, windowMs = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    if (!userId) { next(); return; } // sem auth = cai no IP rate limit geral

    const key = `${userId}:${req.baseUrl || req.path}`;
    const now = Date.now();
    const bucket = userBuckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      userBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (bucket.count >= max) {
      res.status(429).json({
        error: "Você atingiu o limite de uso. Aguarde alguns minutos.",
        retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
      });
      return;
    }

    bucket.count++;
    next();
  };
}
