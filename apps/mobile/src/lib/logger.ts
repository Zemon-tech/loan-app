/**
 * Tiny PII-free logger.
 *
 * Callers pass a feature tag, a short event name and an optional context of primitives.
 * Never pass mobile numbers, OTPs, tokens, DOB or loan values. As a safety net, context keys
 * that look sensitive are dropped and any string value is scrubbed of digit runs (4+ digits)
 * and bearer/JWT-looking text.
 *
 * Dev: console. Release: no-op for debug/info; warn/error go through `setErrorSink` if one is
 * registered (Sentry is NOT installed yet; wire it there when added).
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogContext = Record<string, string | number | boolean | null | undefined>;

const SENSITIVE_KEY = /mobile|phone|otp|token|secret|password|authorization|dob|birth|pan|aadhaar|email/i;

function scrub(value: string): string {
  return value
    .replace(/Bearer\s+\S+/gi, '[redacted]')
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[redacted]')
    .replace(/\d{4,}/g, '[redacted]');
}

/** Drop sensitive keys and scrub string values. */
export function redactContext(ctx?: LogContext): LogContext | undefined {
  if (!ctx) return undefined;
  const out: LogContext = {};
  for (const [key, value] of Object.entries(ctx)) {
    if (SENSITIVE_KEY.test(key)) continue;
    out[key] = typeof value === 'string' ? scrub(value) : value;
  }
  return out;
}

type ErrorSink = (level: 'warn' | 'error', tag: string, event: string, ctx?: LogContext) => void;
let sink: ErrorSink | null = null;

/** Register a release-time error reporter (e.g. Sentry). */
export function setErrorSink(next: ErrorSink | null): void {
  sink = next;
}

function emit(level: LogLevel, tag: string, event: string, ctx?: LogContext): void {
  try {
    const safe = redactContext(ctx);
    if (__DEV__) {
      const line = `[${tag}] ${event}`;
      if (level === 'error') console.error(line, safe ?? '');
      else if (level === 'warn') console.warn(line, safe ?? '');
      else console.log(line, safe ?? '');
    } else if ((level === 'warn' || level === 'error') && sink) {
      sink(level, tag, event, safe);
    }
  } catch {
    // Logging must never break the app.
  }
}

export const logger = {
  debug: (tag: string, event: string, ctx?: LogContext) => emit('debug', tag, event, ctx),
  info: (tag: string, event: string, ctx?: LogContext) => emit('info', tag, event, ctx),
  warn: (tag: string, event: string, ctx?: LogContext) => emit('warn', tag, event, ctx),
  error: (tag: string, event: string, ctx?: LogContext) => emit('error', tag, event, ctx),
};