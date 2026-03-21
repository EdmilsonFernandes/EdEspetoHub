// src/logger/transports/FileTransport.ts
import * as fs from 'fs';
import * as path from 'path';
import { ILoggerTransport, LogLevel } from '../models/logger-types.model';
import { Provide } from '../ioc/ioc';
import { Tokens } from '../ioc/injectiontokens';

@Provide(Tokens.Utils.FileTransport)
export class FileTransport implements ILoggerTransport {
  private logDir: string;
  private currentDate: string;
  private appStream: fs.WriteStream | null = null;
  private errorStream: fs.WriteStream | null = null;
  private levelRank: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

  constructor() {
    this.logDir = process.env.LOG_DIR || 'logs';
    this.currentDate = new Date().toISOString().slice(0, 10);
    this.ensureStreams();
  }

  public log(entry: any): void { // Receives the raw object or pre-formatted string? Let's use string for file write
    // Re-using the logic that writes the JSON string directly
    const payload = typeof entry === 'string' ? entry : JSON.stringify(entry);
    const level = typeof entry === 'string' ? JSON.parse(entry).level : entry.level;

    this.writeToFile(level, payload);
  }

  // Exposed specifically to write pre-formatted strings to avoid double serialization
  public writePayload(level: LogLevel, payload: string): void {
     this.writeToFile(level, payload);
  }

  private ensureStreams() {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.currentDate || !this.appStream || !this.errorStream) {
      this.currentDate = today;
      if (this.appStream) this.appStream.end();
      if (this.errorStream) this.errorStream.end();

      try {
        if (!fs.existsSync(this.logDir)) {
           fs.mkdirSync(this.logDir, { recursive: true });
        }
        this.appStream = fs.createWriteStream(path.join(this.logDir, `app-${this.currentDate}.log`), { flags: 'a' });
        this.errorStream = fs.createWriteStream(path.join(this.logDir, `error-${this.currentDate}.log`), { flags: 'a' });
      } catch (err) {
        console.error('FATAL: Could not initialize file logging streams', err);
      }
    }
  }

  private writeToFile(level: LogLevel, payload: string) {
    try {
      this.ensureStreams();
      this.appStream?.write(`${payload}\n`);

      if (this.levelRank[level] >= this.levelRank.warn) {
        this.errorStream?.write(`${payload}\n`);
      }
    } catch (e) {
      // Fail silently specifically for file IO to not crash app
      console.error('Error writing to log file', e);
    }
  }
}