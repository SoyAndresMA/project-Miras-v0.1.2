type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
type LogComponent = 'EventBus' | 'CasparClip' | 'CasparClipUI' | 'CasparServer';

interface LogMessage {
  component: LogComponent;
  level: LogLevel;
  phase: string;
  message: string;
  data?: any;
}

class Logger {
  private static instance: Logger;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  log({ component, level, phase, message, data }: LogMessage): void {
    const timestamp = new Date().toISOString();
    const logPrefix = `[${timestamp}] [${component}] [${level}] [${phase}]`;
    
    switch (level) {
      case 'DEBUG':
        console.debug(`${logPrefix} ${message}`, data ? data : '');
        break;
      case 'INFO':
        console.log(`${logPrefix} ${message}`, data ? data : '');
        break;
      case 'WARN':
        console.warn(`${logPrefix} ${message}`, data ? data : '');
        break;
      case 'ERROR':
        console.error(`${logPrefix} ${message}`, data ? data : '');
        break;
    }
  }

  debug(component: LogComponent, phase: string, message: string, data?: any) {
    this.log({ component, level: 'DEBUG', phase, message, data });
  }

  info(component: LogComponent, phase: string, message: string, data?: any) {
    this.log({ component, level: 'INFO', phase, message, data });
  }

  warn(component: LogComponent, phase: string, message: string, data?: any) {
    this.log({ component, level: 'WARN', phase, message, data });
  }

  error(component: LogComponent, phase: string, message: string, data?: any) {
    this.log({ component, level: 'ERROR', phase, message, data });
  }
}

export default Logger;
