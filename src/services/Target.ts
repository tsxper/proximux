import net, { NetConnectOpts } from 'net';
import { Logger } from './Logger';
import { ConfigObject } from './Config';


export class Target {
  protected id: number;
  protected log: Logger;
  protected config: ConfigObject;

  constructor(id: number, config: ConfigObject) {
    this.id = id;
    this.config = config;
    this.log = this.buildLogger();
  }

  protected buildLogger(): Logger {
    const obj = new Logger(this.config.logLevel, 'target');
    return obj;
  }

  public getId(): number {
    return this.id;
  }

  public getOptions(): NetConnectOpts {
    const port = this.config.targetServers[this.id - 1]?.port;
    if (!port) throw new Error(`Env "TARGET_PORT_${this.id}" is required`);
    const host = this.config.targetServers[this.id - 1]?.host;
    if (!host) throw new Error(`Env "TARGET_HOST_${this.id}" is required`);
    const keepAlive = this.config.targetServers[this.id - 1]?.keepAlive || false;
    const options: NetConnectOpts = {
      host: host,
      port: port,
      keepAlive: keepAlive,
    };
    return options;
  }

  public async connect(): Promise<net.Socket> {
    const options = this.getOptions();
    const connection: net.Socket = await new Promise((resolve, reject) => {
      try {
        const conn = net.connect(options, () => {
          this.log.log({ target: this.id, msg: 'Connection opened' });
          resolve(conn);
        });
      } catch (e) {
        reject(e);
      }
    });
    return connection;
  }
}
