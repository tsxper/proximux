import net from 'net';
import { maskIP } from '../helpers';
import { Exchange } from './Exchange';
import { Logger } from './Logger';
import { Config } from './Config';
import { Events } from './Events';

export class Server {
  protected host: string;
  protected port: number;
  protected data: { s: net.Socket, d: Buffer }[] = [];
  protected maxConnections = -1;
  protected exchange: Exchange;
  protected isFIFO = false;
  protected logger: Logger;
  protected isProcessing = false;
  protected events: Events;
  protected processInterval?: NodeJS.Timeout;
  protected server?: net.Server;
  protected acceptConnections = true;
  protected sockets: Set<net.Socket> = new Set();

  constructor(exchange: Exchange, logger: Logger, configService: Config, events: Events) {
    this.events = events;
    const config = configService.getConfiguration();
    this.exchange = exchange;
    this.isFIFO = exchange.isFIFO();
    this.port = config.localServerPort;
    this.host = config.localServerHost;
    this.logger = logger;
    this.maxConnections = config.localServerMaxConnections;
  }

  async start(): Promise<number> {
    const server = net.createServer();
    const mode = this.exchange.getMode();
    if (this.maxConnections >= 0) {
      server.maxConnections = this.maxConnections;
    }
    const port = await new Promise<number>((resolve, reject) => {
      try {
        server.listen(this.port, this.host, () => {
          const addr = server.address() as Partial<net.AddressInfo>;
          const port = addr?.port || this.port;
          this.logger.log(`Server is running on ${this.host}:${port} in ${mode} mode`);
          resolve(port);
        });
      } catch (err) {
        reject(err);
      }
    });
    server.on('connection', (socket) => {
      if (!this.acceptConnections) throw new Error('Server does not accept new connections');
      this.logger.debug('Client connected: ' + maskIP(socket.remoteAddress) + ':' + socket.remotePort);
      try {
        this.events.emit(
          'connected',
          this.logger,
          {
            address: socket.remoteAddress,
            port: socket.remotePort,
            family: socket.remoteFamily
          }
        );
        socket.on('close', () => { this.connOnClose(socket); });
        this.sockets.add(socket);
        if (this.exchange.isProxy()) {
          return this.exchange.pair(socket, this.events);
        }
        socket.on('data', (data) => { this.connOnData(data, socket); });
      } catch (e) {
        this.logger.error(e);
        socket.destroy();
      }
    });
    server.on('close', () => { this.stopProcessingInterval(); });
    server.on('drop', (d) => { this.logger.log(`Connection from ${maskIP(d?.remoteAddress) + ':' + d?.remotePort} dropped`); });
    this.server = server;
    return port;
  }

  async stop(): Promise<void> {
    this.logger.debug(`Stopping server`);
    if (this.server) {
      this.acceptConnections = false;
      this.destroyAllConnections();
      const server = this.server;
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          this.logger.log(`Server stopped`);
          this.events.removeAllListeners();
          resolve(true);
        });
        this.stopProcessingInterval();
        this.data = [];
      });
      this.server = undefined;
    }
  }

  protected destroyAllConnections(): void {
    this.sockets.forEach((s) => {
      s.destroy();
    });
    this.sockets.clear();
  }

  protected stopProcessingInterval(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
    }
  }

  protected startProcessingInterval(): void {
    if (this.isProcessing) return;
    this.stopProcessingInterval();
    this.processInterval = setTimeout(
      () => {
        this.process().catch((e) => this.logger.error(e));
      },
      50
    );
  }

  protected async process(): Promise<void> {
    this.isProcessing = true;
    do {
      const item = this.data.shift();
      this.logger.debug({ processingItem: item?.d.toString() });
      if (!item) break;
      await this.exchange.exchangeMessage(item.d, item.s, this.events);
    } while (this.data.length > 0);
    this.isProcessing = false;
  }

  protected connOnData(data: Buffer, socket: net.Socket): void {
    this.logger.debug({ data: data.toString(), from: maskIP(socket.remoteAddress) + ':' + socket.remotePort });
    if (this.isFIFO) {
      this.data.push({
        d: data,
        s: socket,
      });
      this.startProcessingInterval();
    } else {
      this.exchange.exchangeMessage(data, socket, this.events)
        .catch((e) => this.logger.error(e));
    }
  }

  protected connOnClose(socket: net.Socket): void {
    socket.removeAllListeners();
    this.sockets.delete(socket);
    this.logger.debug('Client disconnected: ' + maskIP(socket.remoteAddress) + ':' + socket.remotePort);
  }
}
