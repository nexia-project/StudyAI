// Override Express params to always return string (we never use multi-value routes)
declare global {
  namespace Express {
    interface Request {
      params: Record<string, string>;
    }
  }
}
export {};
