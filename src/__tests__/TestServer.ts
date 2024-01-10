import net from 'net';
import { Server } from '../services/Server';

export class TestServer extends Server {
  protected dataSeq: string[] = [];

  protected connOnData(data: Buffer, sock: net.Socket): void {
    this.dataSeq.push(data.toString());
    super.connOnData(data, sock);
  }

  getDataSequence(): string[] {
    return this.dataSeq;
  }

  async getConnectionsCnt(): Promise<number> {
    if (!this.server) return 0;
    const server = this.server;
    const num = await new Promise<number>((resolve, reject) => {
      server.getConnections((err, cnt) => {
        if (err) reject(err);
        else resolve(cnt);
      });
    });
    return num;
  }
}
