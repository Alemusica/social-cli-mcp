// src/lib/logger.ts
type LogLevel = "debug" | "info" | "warn" | "error";

interface Logger {
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

function write(level: LogLevel, module: string, msg: string, data?: Record<string, unknown>) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;
  const entry = JSON.stringify({ ts: new Date().toISOString(), level, module, msg, ...data });
  // CRITICAL: stderr only. stdout would corrupt JSON-RPC messages in stdio transport.
  process.stderr.write(entry + "\n");
}

export function createLogger(module: string): Logger {
  return {
    debug: (msg, data) => write("debug", module, msg, data),
    info: (msg, data) => write("info", module, msg, data),
    warn: (msg, data) => write("warn", module, msg, data),
    error: (msg, data) => write("error", module, msg, data),
  };
}
