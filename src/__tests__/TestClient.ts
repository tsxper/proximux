import { NetConnectOpts, Socket } from 'net';
import { Target } from '../services/Target';
import { LoggerFake } from './LoggerFake';

export class TestClient extends Target {
  opts?: Partial<NetConnectOpts>;
  socket?: Socket;

  protected buildLogger(): LoggerFake {
    const obj = new LoggerFake();
    return obj;
  }

  public setOpts(opts: Partial<NetConnectOpts>): this {
    this.opts = opts;
    return this;
  }

  public getOptions(): NetConnectOpts {
    const opts = {
      ...super.getOptions(),
      ...this.opts,
    } as NetConnectOpts;
    return opts;
  }

  public async send(msg: string, connClose = true): Promise<string> {
    if (!this.socket) this.socket = await this.connect();
    const socket = this.socket
    this.socket = socket;
    let result: string = '';
    await new Promise((resolve) => {
      socket.once('data', (data) => {
        result = data.toString();
        resolve(1);
      });
      socket.write(msg);
    });
    if (connClose) {
      this.socket = undefined;
      await new Promise((resolve, reject) => {
        const addr = `${socket.localAddress}:${socket.localPort}`;
        socket.end(() => {
          setTimeout(() => {
            this.log.debug(`Client request finished: ${addr}`);
            resolve(1);
          }, 10); // allows to call "end" callback on the other side first
        });
      });
    }
    return result;
  }
}
