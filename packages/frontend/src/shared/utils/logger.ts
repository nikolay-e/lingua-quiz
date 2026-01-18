type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

const SENSITIVE_KEYS = ['password', 'token', 'secret', 'authorization', 'apiKey', 'api_key', 'refreshToken'];
const SENSITIVE_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

function maskSensitiveData(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return obj.replace(SENSITIVE_PATTERN, '***@***.***');
  }

  if (Array.isArray(obj)) {
    return obj.map(maskSensitiveData);
  }

  if (typeof obj === 'object') {
    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
        masked[key] = '***';
      } else {
        masked[key] = maskSensitiveData(value);
      }
    }
    return masked;
  }

  return obj;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private isDevelopment: boolean;
  private minLevel: LogLevel;
  private requestId: string | null = null;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.minLevel = this.isDevelopment ? 'debug' : 'info';
  }

  setRequestId(requestId: string | null): void {
    this.requestId = requestId;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const maskedContext = context !== undefined ? maskSensitiveData(context) : undefined;
    const contextStr = maskedContext !== undefined ? ` ${JSON.stringify(maskedContext)}` : '';
    const requestIdStr =
      this.requestId !== null && this.requestId.length > 0 ? ` [req=${this.requestId.slice(0, 8)}]` : '';
    return `[${timestamp}] [${level.toUpperCase()}]${requestIdStr} ${message}${contextStr}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog('error')) {
      let errorDetails: Record<string, unknown> = { ...context };

      if (error instanceof Error) {
        errorDetails = {
          ...errorDetails,
          errorName: error.name,
          errorMessage: error.message,
          stack: error.stack?.split('\n').slice(0, 5).join('\n'),
        };
      } else if (error !== undefined) {
        errorDetails = { ...errorDetails, error: maskSensitiveData(error) };
      }

      console.error(this.formatMessage('error', message, errorDetails));
    }
  }
}

export const logger = new Logger();
