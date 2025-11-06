// ------------------------------------------------------------------------------------------------
//                logging.ts - Lightweight JSON-ish console logger
// ------------------------------------------------------------------------------------------------

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogMetadata = Record<string, unknown>;

export interface Logger {
  readonly debug: (message: string, metadata?: LogMetadata) => void;
  readonly info: (message: string, metadata?: LogMetadata) => void;
  readonly warn: (message: string, metadata?: LogMetadata) => void;
  readonly error: (message: string, metadata?: LogMetadata) => void;
  readonly child: (context: LogMetadata) => Logger;
}

function normaliseMetadata(metadata?: LogMetadata): LogMetadata | undefined {
  if (!metadata) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [key, value instanceof Error ? value.message : value]),
  );
}

function write(level: LogLevel, message: string, metadata?: LogMetadata): void {
  const payload: Record<string, unknown> = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  const serialisedMetadata = normaliseMetadata(metadata);
  if (serialisedMetadata && Object.keys(serialisedMetadata).length > 0) {
    payload.metadata = serialisedMetadata;
  }

  switch (level) {
    case 'debug':
      console.debug(payload);
      break;
    case 'info':
      console.info(payload);
      break;
    case 'warn':
      console.warn(payload);
      break;
    case 'error':
      console.error(payload);
      break;
  }
}

function createLogger(baseContext: LogMetadata = {}): Logger {
  const withContext = (metadata?: LogMetadata): LogMetadata | undefined => {
    if (!metadata || Object.keys(metadata).length === 0) {
      return Object.keys(baseContext).length > 0 ? baseContext : undefined;
    }

    return {
      ...baseContext,
      ...metadata,
    } satisfies LogMetadata;
  };

  return {
    debug(message, metadata) {
      write('debug', message, withContext(metadata));
    },
    info(message, metadata) {
      write('info', message, withContext(metadata));
    },
    warn(message, metadata) {
      write('warn', message, withContext(metadata));
    },
    error(message, metadata) {
      write('error', message, withContext(metadata));
    },
    child(context) {
      return createLogger({
        ...baseContext,
        ...context,
      });
    },
  } satisfies Logger;
}

export const logger = createLogger();

export function createLoggerWithContext(context: LogMetadata): Logger {
  return createLogger(context);
}
