import net from 'net';
import { LOG_LEVEL, Logger } from '../services/Logger';

type DelayMs = number;

export class TargetServer {
  protected responseMap: Record<string, [string, DelayMs]> = {};
  protected requestSequence: string[] = [];
  protected server: net.Server;
  protected host: string;
  protected port: number;
  protected logger: Logger;
  protected logLevel: LOG_LEVEL;

  constructor(host: string, port: number, logLevel: LOG_LEVEL = 0) {
    this.host = host;
    this.port = port;
    this.logLevel = logLevel;
    this.server = net.createServer();
    this.logger = this.buildLogger();
  }

  protected buildLogger(): Logger {
    const obj = new Logger(this.logLevel, 'TargetServer');
    return obj;
  }

  setResponseMap(responseMap: Record<string, [string, DelayMs]>): this {
    this.responseMap = responseMap;
    return this;
  }

  clearRequests(): this {
    this.requestSequence = [];
    return this;
  }

  getRequests(): string[] {
    return this.requestSequence;
  }

  getServer(): net.Server {
    return this.server;
  }

  async start(): Promise<number> {
    const port = await new Promise<number>((resolve, reject) => {
      try {
        this.server.listen(this.port, this.host, () => {
          const addr = this.server.address() as Partial<net.AddressInfo>;
          const port = addr?.port || this.port;
          this.logger.log(`Target server is running on ${this.host}:${port}`);
          resolve(port);
        });
      } catch (err) {
        reject(err);
      }
    });
    this.server.on('connection', (sock) => {
      sock.on('data', (data) => { this.onData(data, sock); });
    });
    this.server.on('error', (err) => { this.logger.error(err); });
    return port;
  }

  async stop(): Promise<void> {
    await new Promise((resolve, reject) => {
      this.logger.log("Closing target server");
      this.server.close((err) => {
        if (err) reject(err);
        this.logger.log("Target server closed");
        resolve(true);
      });
    });
  }

  protected onData(data: Buffer, socket: net.Socket): void {
    const request = data.toString();
    this.requestSequence.push(request);
    this.logger.debug({ received: request });
    const resp = this.responseMap[request]?.[0] ?? '';
    const delay = this.responseMap[request]?.[1] ?? 0;
    setTimeout(() => {
      socket.write(resp);
      this.logger.debug({ sent: resp });
    }, delay);
  }
}
