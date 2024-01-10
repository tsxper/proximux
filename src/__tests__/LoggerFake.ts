import { Logger } from '../services/Logger';

export class LoggerFake extends Logger {
  log(data: unknown): void { }
  debug(data: unknown): void { }
  error(data: unknown): void { }
}
