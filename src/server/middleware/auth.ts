// src/server/middleware/auth.ts
import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = process.env.MCP_API_KEY;
  if (!apiKey) return next(); // No key configured = no auth (local dev)

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token !== apiKey) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
