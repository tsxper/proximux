import net from 'net';
import { Target } from './Target';
import { TargetConnection } from './TargetConnection';
import { Logger } from './Logger';
import { Config, ConfigObject } from './Config';

export class Pool {
  protected connections: Map<number, TargetConnection> = new Map();
  protected targetCount: number;
  protected logger: Logger;
  protected config: ConfigObject;

  constructor(log: Logger, configService: Config) {
    this.config = configService.getConfiguration();
    this.targetCount = this.config.proxyConnectionsCount;
    this.logger = log;
  }

  getTargetCount(): number {
    return this.targetCount;
  }

  getMaxConnections(): number {
    return this.config.localServerMaxConnections;
  }

  getActiveConnectionsCount(): number {
    return this.connections.size;
  }

  /**
   * Selects a ready to use connection from opened connections list.
   * Opens a new connection if there is a capacity left.
   * 
   * @returns {TargetConnection}
   */
  async select(): Promise<TargetConnection> {
    let conn: TargetConnection | null = null;
    for (; ;) {
      conn = this.selectConnection();
      if (conn) break;
      await this.checkConnections(1);
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(true);
        }, 20);
      });
    }
    conn.isReady = false;
    return conn;
  }

  release(conn: TargetConnection): void {
    conn.isReady = true;
  }

  /**
   * Opens ALL connections specified in TCP TARGETS configuration section.
   */
  async connect(): Promise<void> {
    await this.checkConnections();
  }

  async disconnect(): Promise<void> {
    this.targetCount = 0;
    const pList: Promise<boolean>[] = [];
    for (const [, conn] of this.connections.entries()) {
      pList.push(new Promise((resolve, reject) => {
        conn.socket.once('close', (err) => {
          if (err) reject(err);
          resolve(true);
        });
        conn.socket.destroy();
      }));
    }
    await Promise.all(pList);
  }

  protected selectConnection(): TargetConnection | null {
    let connection: TargetConnection | null = null;
    for (const [, conn] of this.connections.entries()) {
      if (conn.isReady) {
        connection = conn;
        break;
      }
    }
    return connection;
  }

  protected async checkConnections(incr?: number): Promise<void> {
    const count = this.targetCount;
    const currentCount = this.connections.size;
    const diff = count - currentCount;
    if (diff > 0) {
      await this.addConnections(incr);
    }
  }

  protected async addConnections(connsToAdd?: number): Promise<void> {
    const pList: Promise<net.Socket>[] = [];
    const ids: number[] = [];
    let added = 0;
    for (let id = 1; id <= this.targetCount; id += 1) {
      if (this.connections.has(id)) continue;
      const target = new Target(id, this.config);
      ids.push(target.getId());
      pList.push(target.connect());
      if (connsToAdd && ++added >= connsToAdd) break;
    }
    const connections = await Promise.all(pList);
    for (let i = 0; i < connections.length; i += 1) {
      const connection = connections[i];
      if (!connection) throw new Error('Unknown connection error');
      const id = ids[i];
      if (!id) throw new Error('Unknown id error');
      const conn: TargetConnection = {
        socket: connection,
        isReady: true,
        id,
      };
      this.connections.set(conn.id, conn);
      this.addHandlers(conn);
    }
  }

  protected addHandlers(conn: TargetConnection): void {
    const connection = conn.socket;
    const id = conn.id;
    connection.on('error', (e) => {
      this.logger.error({ target: id, error: e });
    });
    connection.on('close', () => {
      this.connections.delete(id);
      this.logger.log({ target: id, msg: 'Connection closed' });
    });
    if (this.config.proxyInactivityTimeout >= 0) {
      connection.setTimeout(this.config.proxyInactivityTimeout, () => {
        this.connections.delete(id);
        this.logger.log({ target: id, msg: 'Connection timed out' });
        connection.destroy();
      });
    }
  }
}
