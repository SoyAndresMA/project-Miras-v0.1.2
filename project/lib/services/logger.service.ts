import { writeFile, appendFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { format } from 'date-fns';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  error?: Error;
  metadata?: Record<string, any>;
}

export class LoggerService {
  private static instance: LoggerService;
  private logDir: string;
  private currentLogFile: string;
  private logCache: Map<string, LogEntry[]>;
  private readonly MAX_CACHE_SIZE = 100;
  private defaultContext?: string;

  private constructor() {
    this.logDir = join(process.cwd(), 'logs');
    this.currentLogFile = this.getLogFileName();
    this.logCache = new Map();
    this.initializeLogDirectory();
  }

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  public static create(context: string): LoggerService {
    const instance = LoggerService.getInstance();
    instance.defaultContext = context;
    return instance;
  }

  private async initializeLogDirectory() {
    try {
      await mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  private getLogFileName(): string {
    const date = new Date();
    return join(this.logDir, `app-${format(date, 'yyyy-MM-dd')}.log`);
  }

  private formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, message, context, error, metadata } = entry;
    let logMessage = `[${timestamp}] ${level}${context ? ` [${context}]` : ''}: ${message}`;
    
    if (error) {
      logMessage += `\nError: ${error.message}\nStack: ${error.stack}`;
    }
    
    if (metadata) {
      logMessage += `\nMetadata: ${JSON.stringify(metadata, null, 2)}`;
    }
    
    return logMessage + '\n';
  }

  private async writeToFile(entry: LogEntry) {
    const formattedEntry = this.formatLogEntry(entry);
    try {
      await appendFile(this.currentLogFile, formattedEntry);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private cacheLog(context: string, entry: LogEntry) {
    let contextLogs = this.logCache.get(context) || [];
    contextLogs.push(entry);
    
    if (contextLogs.length > this.MAX_CACHE_SIZE) {
      contextLogs = contextLogs.slice(-this.MAX_CACHE_SIZE);
    }
    
    this.logCache.set(context, contextLogs);
  }

  public getRecentLogs(context: string): LogEntry[] {
    return this.logCache.get(context) || [];
  }

  public async log(
    level: LogLevel,
    message: string,
    context?: string,
    error?: Error,
    metadata?: Record<string, any>
  ) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
      metadata
    };

    // Cache the log
    if (context) {
      this.cacheLog(context, entry);
    }

    // Write to file
    await this.writeToFile(entry);

    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = {
        [LogLevel.DEBUG]: console.debug,
        [LogLevel.INFO]: console.info,
        [LogLevel.WARN]: console.warn,
        [LogLevel.ERROR]: console.error
      }[level];

      consoleMethod(this.formatLogEntry(entry));
    }
  }

  public debug(message: string, context?: string, metadata?: Record<string, any>) {
    return this.log(LogLevel.DEBUG, message, context || this.defaultContext, undefined, metadata);
  }

  public info(message: string, context?: string, metadata?: Record<string, any>) {
    return this.log(LogLevel.INFO, message, context || this.defaultContext, undefined, metadata);
  }

  public warn(message: string, context?: string, metadata?: Record<string, any>) {
    return this.log(LogLevel.WARN, message, context || this.defaultContext, undefined, metadata);
  }

  public error(message: string, error?: Error, context?: string, metadata?: Record<string, any>) {
    return this.log(LogLevel.ERROR, message, context || this.defaultContext, error, metadata);
  }
}
