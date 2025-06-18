/**
 * React Native logger utility for structured logging
 * Provides consistent logging format across the mobile app
 * Follows styling guidelines for React Native/Expo logging
 */

interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  service: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * React Native logger class for structured logging
 * Uses console logging with structured formats for React Native/Expo
 */
class Logger {
  private service = 'archie-mobile';
  private version = '1.0.0';

  /**
   * Creates a structured log entry
   * @param level - Log level (debug, info, warn, error)
   * @param message - Log message
   * @param metadata - Additional metadata to include
   * @returns Structured log entry object
   */
  private createLogEntry(
    level: LogEntry['level'],
    message: string,
    metadata: Record<string, any> = {}
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.service,
      ...metadata,
    };
  }

  /**
   * Logs debug information (development only)
   * @param message - Debug message
   * @param metadata - Additional context metadata
   */
  debug(message: string, metadata?: Record<string, any>): void {
    if (__DEV__) {
      const entry = this.createLogEntry('debug', message, metadata);
      console.log('🐛 DEBUG:', JSON.stringify(entry, null, 2));
    }
  }

  /**
   * Logs general information
   * @param message - Info message
   * @param metadata - Additional context metadata
   */
  info(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry('info', message, metadata);
    console.log('ℹ️ INFO:', JSON.stringify(entry, null, 2));
  }

  /**
   * Logs warning messages
   * @param message - Warning message
   * @param metadata - Additional context metadata
   */
  warn(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry('warn', message, metadata);
    console.warn('⚠️ WARN:', JSON.stringify(entry, null, 2));
  }

  /**
   * Logs error messages
   * @param message - Error message
   * @param metadata - Additional context metadata
   */
  error(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry('error', message, metadata);
    console.error('❌ ERROR:', JSON.stringify(entry, null, 2));
    
    // In production, send to remote logging service
    if (!__DEV__) {
      this.sendToRemoteLogging(entry);
    }
  }

  /**
   * Sends critical logs to remote service in production
   * Failsafe: Don't let logging errors crash the app
   * @param entry - Log entry to send remotely
   */
  private async sendToRemoteLogging(entry: LogEntry): Promise<void> {
    try {
      // Example: Send to your logging API endpoint
      await fetch(`${process.env.EXPO_PUBLIC_API_URL}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    } catch (error) {
      // Failsafe: Don't let logging errors crash the app
      console.error('Failed to send log to remote service:', error);
    }
  }

  /**
   * Creates a context-specific logger instance
   * @param context - The context/component name for the logger
   * @returns Logger instance with context metadata
   */
  child(context: Record<string, any>): Logger {
    const childLogger = new Logger();
    // Override methods to include context in metadata
    const originalMethods = ['debug', 'info', 'warn', 'error'] as const;
    
    originalMethods.forEach(method => {
      const originalMethod = this[method].bind(this);
      childLogger[method] = (message: string, metadata: Record<string, any> = {}) => {
        originalMethod(message, { ...context, ...metadata });
      };
    });
    
    return childLogger;
  }
}

/**
 * Global logger instance for the application
 */
export const logger = new Logger();

/**
 * Helper function to create context-specific loggers
 * @param context - The context/component name for the logger
 * @returns Logger instance with context metadata
 */
export const createContextLogger = (context: string): Logger => {
  return logger.child({ context });
}; 