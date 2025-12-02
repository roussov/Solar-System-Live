type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

function baseLog(level: LogLevel, message: string, context?: LogContext): void {
  const payload = {
    level,
    message,
    time: new Date().toISOString(),
    ...context
  };

  const serialized = JSON.stringify(payload);

  if (level === 'error') {
    // eslint-disable-next-line no-console
    console.error(serialized);
  } else {
    // eslint-disable-next-line no-console
    console.log(serialized);
  }
}

export function logInfo(message: string, context?: LogContext): void {
  baseLog('info', message, context);
}

export function logWarn(message: string, context?: LogContext): void {
  baseLog('warn', message, context);
}

export function logError(message: string, context?: LogContext): void {
  baseLog('error', message, context);
}
