// src/server/middleware/tenant.ts
import type { Request, Response, NextFunction } from "express";
import { db } from "../../db/client.js";
import { sql } from "drizzle-orm";

export async function resolveTenant(req: Request, _res: Response, next: NextFunction) {
  const tenantId = (req.headers["x-tenant-id"] as string) || process.env.DEFAULT_TENANT || "flutur";
  await db.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, false)`);
  (req as any).tenantId = tenantId;
  next();
}
