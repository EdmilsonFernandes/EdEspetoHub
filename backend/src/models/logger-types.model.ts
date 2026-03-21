export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  [key: string]: any; // Meta data
}

export interface ILoggerTransport {
  log(entry: LogEntry): void;
}