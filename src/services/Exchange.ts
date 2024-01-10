import net from 'net';
import { Pool } from './Pool';
import { maskIP } from '../helpers';
import { Logger } from './Logger';
import { Events } from './Events';
import { ConfigObject } from './Config';

export class Exchange {
  static MODE_FIFO = 1 as const;
  static MODE_PROXY = 2 as const;
  static MODE_FUNNEL = 3 as const;
  static EXCHANGE_MODE = {
    1: 'FIFO',
    2: 'PROXY',
    3: 'FUNNEL',
  } as const;

  protected pool: Pool;
  protected logger: Logger;
  protected method: 'detached' | 'piped' = 'detached';
  protected keepOrder = true;

  constructor(pool: Pool, log: Logger, conf: ConfigObject) {
    this.pool = pool;
    this.logger = log;
    if (this.getMode() === 'FUNNEL') {
      this.keepOrder = conf.exchangeFunnelAsync === false;
    }
  }

  getMode(): typeof Exchange.EXCHANGE_MODE[keyof typeof Exchange.EXCHANGE_MODE] {
    if (this.isFIFO()) return Exchange.EXCHANGE_MODE[Exchange.MODE_FIFO];
    else if (this.isProxy()) return Exchange.EXCHANGE_MODE[Exchange.MODE_PROXY];
    return Exchange.EXCHANGE_MODE[Exchange.MODE_FUNNEL];
  }

  isFIFO(): boolean {
    return this.pool.getTargetCount() === 1 && !this.isProxy();
  }

  isProxy(): boolean {
    return this.pool.getTargetCount() === this.pool.getMaxConnections();
  }

  isFunnel(): boolean {
    return !this.isFIFO() && !this.isProxy();
  }

  pair(incoming: net.Socket, events: Events): void {
    this.pool.select().then((upstream) => {
      incoming.pipe(upstream.socket);
      upstream.socket.pipe(incoming);
      upstream.socket.once('close', () => !incoming.destroyed && incoming.destroy());
      this.bindProxyDataEvents(incoming, upstream.socket, events);
      this.logExchange(incoming, upstream.id);
    });
  }

  protected bindProxyDataEvents(client: net.Socket, upstream: net.Socket, events: Events): void {
    client.on('data', (req) => {
      const response = new Promise<Buffer>((resolve, reject) => {
        try {
          upstream.once('data', (resp) => resolve(resp));
          upstream.once('error', (err) => reject(err));
        } catch (err) {
          reject(err);
        }
      });
      events.emit('request', this.logger, req, response);
    });
  }

  async exchangeMessage(data: Buffer, incoming: net.Socket, events: Events): Promise<void> {
    const upstream = await this.pool.select();
    const out = upstream.socket;
    this.logExchange(incoming, upstream.id);
    const resp = this.exchangeDetached(data, incoming, out);
    try {
      events.emit('request', this.logger, data, resp);
    } catch (err) {
      this.logger.error(err);
    }
    if (this.keepOrder) {
      await resp;
    }
    this.pool.release(upstream);
  }

  protected async exchangeDetached(data: Buffer, incoming: net.Socket, out: net.Socket): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const errHandler = (e: unknown) => reject(e);
      out.once('data', (response) => {
        try {
          out.off('error', errHandler);
          incoming.write(response, undefined, () => {
            incoming.off('error', errHandler);
            resolve(response);
          });
          incoming.once('error', errHandler);
        } catch (err) {
          reject(err);
        }
      });
      out.once('error', errHandler);
      out.write(data);
    });
  }

  protected logExchange(incoming: net.Socket, upstreamId: number): void {
    const act = this.isProxy() ? 'paired with' : 'exchanges data over';
    this.logger.debug(`"${maskIP(incoming.remoteAddress) + ':' + incoming.remotePort}" ${act} upstream ${upstreamId}`);
  }
}
