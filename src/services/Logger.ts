import { Console } from 'console';

export const LOG_LEVEL_NONE = 0;
export const LOG_LEVEL_ERROR = 1;
export const LOG_LEVEL_INFO = 2;
export const LOG_LEVEL_DEBUG = 3;
export type LOG_LEVEL = typeof LOG_LEVEL_NONE | typeof LOG_LEVEL_ERROR | typeof LOG_LEVEL_INFO | typeof LOG_LEVEL_DEBUG;

export class Logger {
  protected scope: string;
  protected logger: Console;
  protected logDebug: boolean;
  protected logInfo: boolean;
  protected logError: boolean;

  constructor(logLevel: LOG_LEVEL = 0, scope: string = '') {
    this.scope = scope;
    this.logError = logLevel >= LOG_LEVEL_ERROR;
    this.logInfo = logLevel >= LOG_LEVEL_INFO;
    this.logDebug = logLevel >= LOG_LEVEL_DEBUG;
    this.logger = new Console(process.stdout, process.stderr);
  }

  static checkLogLevel(level: number): level is LOG_LEVEL {
    return (level >= LOG_LEVEL_NONE && level <= LOG_LEVEL_DEBUG);
  }

  replaceLogTargets(stdOut: NodeJS.WritableStream, stdErr: NodeJS.WritableStream): void {
    this.logger = new Console(stdOut, stdErr);
  }

  setScope(scope: string): this {
    this.scope = scope;
    return this;
  }

  log(data: unknown): void {
    this.logInfo && this.logger.log(this.createMsg(data, LOG_LEVEL_INFO));
  }

  debug(data: unknown): void {
    this.logDebug && this.logger.log(this.createMsg(data, LOG_LEVEL_DEBUG));
  }

  error(data: unknown): void {
    this.logError && this.logger.error(this.createMsg(data, LOG_LEVEL_ERROR));
  }

  protected createMsg(data: unknown, level: number): string {
    const err = data instanceof Error ? {
      name: data.name,
      message: data.message,
      stack: data.stack,
    } : null;
    const msg = {
      t: new Date().getTime(),
      s: this.scope,
      l: level,
      ... (err ? { e: err } : { d: data }),
    };
    return JSON.stringify(msg);
  }
}
