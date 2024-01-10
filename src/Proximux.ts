import { Events } from './services/Events';
import { ServiceMan, serviceBuilder } from './serviceBuilder';
import { ConfigObject } from './services/Config';

export class Proximux {
  protected sm: ServiceMan;
  protected warmup: boolean = false;

  constructor(warmup = false, conf?: ConfigObject) {
    this.sm = serviceBuilder();
    if (conf) this.sm.get('config').setConfiguration(conf);
    if (this.sm.get('exchange').getMode() !== 'PROXY') {
      this.warmup = warmup;
    }
  }

  async run(): Promise<void> {
    const sm = this.sm;
    const pool = sm.get('pool');
    const server = sm.get('server');
    try {
      if (this.warmup) {
        await pool.connect();
      }
      await server.start();
    } catch (err) {
      await server.stop();
      await pool.disconnect();
    }
  }

  getEventEmitter(): Events {
    return this.sm.get('events');
  }
}
