/**
 * Enhanced Logger with Analytics Integration for The Architect
 * Provides structured logging AND analytics event tracking
 * Follows modular architecture and comment everything rules
 */

interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  service: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

interface AnalyticsEvent {
  eventName: string;
  parameters?: Record<string, any>;
  userId?: string;
  timestamp: string;
}

/**
 * React Native logger utility with integrated analytics
 * Provides consistent logging format AND event tracking across the mobile app
 * Integrates with multiple analytics providers for comprehensive insights
 */
class Logger {
  private service = 'archie-mobile';
  private version = '1.0.0';
  private sessionId: string;

  constructor() {
    // Generate unique session ID for this app session
    this.sessionId = this.generateSessionId();
  }

  /**
   * Generates a unique session identifier
   * Used to track user sessions across analytics events
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Creates a structured log entry with session context
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
      sessionId: this.sessionId,
      ...metadata,
    };
  }

  /**
   * Creates an analytics event for tracking user behavior
   * Used by third-party analytics services (PostHog, Mixpanel, etc.)
   */
  private createAnalyticsEvent(
    eventName: string,
    parameters: Record<string, any> = {},
    userId?: string
  ): AnalyticsEvent {
    return {
      eventName,
      parameters: {
        ...parameters,
        sessionId: this.sessionId,
        appVersion: this.version,
        timestamp: new Date().toISOString(),
      },
      userId,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Logs debug information (development only)
   * Does not trigger analytics events
   */
  debug(message: string, metadata?: Record<string, any>): void {
    if (__DEV__) {
      const entry = this.createLogEntry('debug', message, metadata);
      console.log('🐛 DEBUG:', JSON.stringify(entry, null, 2));
    }
  }

  /**
   * Logs general information
   * Can optionally trigger analytics events for user behavior tracking
   */
  info(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry('info', message, metadata);
    console.log('ℹ️ INFO:', JSON.stringify(entry, null, 2));
  }

  /**
   * Logs warning messages
   * Automatically sends to analytics for monitoring
   */
  warn(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry('warn', message, metadata);
    console.warn('⚠️ WARN:', JSON.stringify(entry, null, 2));
    
    // Send warning to analytics for monitoring
    this.trackEvent('app_warning', {
      message,
      ...metadata,
    });
  }

  /**
   * Logs error messages
   * Always sends to analytics and remote logging for critical monitoring
   */
  error(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry('error', message, metadata);
    console.error('❌ ERROR:', JSON.stringify(entry, null, 2));
    
    // Send error to analytics for critical monitoring
    this.trackEvent('app_error', {
      message,
      ...metadata,
    });
    
    // In production, send to remote logging service
    if (!__DEV__) {
      this.sendToRemoteLogging(entry);
    }
  }

  /**
   * Tracks user behavior events for analytics
   * Central method for all user interaction tracking
   * 
   * @param eventName - Descriptive name of the user action
   * @param parameters - Additional context about the event
   * @param userId - Optional user identifier for user-specific analytics
   */
  trackEvent(
    eventName: string, 
    parameters?: Record<string, any>, 
    userId?: string
  ): void {
    const analyticsEvent = this.createAnalyticsEvent(eventName, parameters, userId);
    
    // Log the event for debugging
    this.debug('Analytics Event Tracked', {
      eventName,
      parameters,
      userId,
    });

    // Send to analytics providers
    this.sendToAnalyticsProviders(analyticsEvent);
  }

  /**
   * Tracks screen views for user journey analysis
   * Automatically called by navigation system
   */
  trackScreenView(screenName: string, userId?: string): void {
    this.trackEvent('screen_view', {
      screenName,
      navigation: 'automatic',
    }, userId);
  }

  /**
   * Tracks user actions for behavioral analysis
   * Used for button clicks, feature usage, etc.
   */
  trackUserAction(
    action: string, 
    feature: string, 
    parameters?: Record<string, any>,
    userId?: string
  ): void {
    this.trackEvent('user_action', {
      action,
      feature,
      ...parameters,
    }, userId);
  }

  /**
   * Tracks business events for conversion analysis
   * Used for journal entries, reframes, premium upgrades, etc.
   */
  trackBusinessEvent(
    businessEvent: string,
    value?: number,
    parameters?: Record<string, any>,
    userId?: string
  ): void {
    this.trackEvent('business_event', {
      businessEvent,
      value,
      ...parameters,
    }, userId);
  }

  /**
   * Sends analytics events to configured providers
   * Handles multiple analytics services (PostHog, Mixpanel, etc.)
   */
  private async sendToAnalyticsProviders(event: AnalyticsEvent): Promise<void> {
    try {
      // Example integrations (implement based on chosen providers):
      
      // PostHog integration (recommended for privacy-first analytics)
      // await this.sendToPostHog(event);
      
      // Mixpanel integration (for detailed user behavior)
      // await this.sendToMixpanel(event);
      
      // Amplitude integration (for user journey analysis)
      // await this.sendToAmplitude(event);
      
      // Custom analytics endpoint (for proprietary tracking)
      // await this.sendToCustomAnalytics(event);
      
    } catch (error) {
      // Failsafe: Don't let analytics errors crash the app
      console.error('Failed to send analytics event:', error);
    }
  }

  /**
   * Sends critical logs to remote service in production
   * Used for error monitoring and app health tracking
   */
  private async sendToRemoteLogging(entry: LogEntry): Promise<void> {
    try {
      // Example: Send to your logging API endpoint or service
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
   * Sets user context for analytics tracking
   * Call this when user logs in/out
   */
  setUserContext(userId: string | null, userProperties?: Record<string, any>): void {
    this.info('User context updated', {
      userId,
      userProperties,
      action: userId ? 'user_login' : 'user_logout',
    });

    // Update analytics user context
    this.trackEvent('user_context_change', {
      userId,
      userProperties,
      action: userId ? 'login' : 'logout',
    });
  }

  /**
   * Flushes any pending analytics events
   * Called when app goes to background
   */
  flush(): void {
    this.debug('Flushing analytics events');
    // Implementation depends on chosen analytics providers
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