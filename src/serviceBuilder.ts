import { ServiceManager } from '@tsxper/service-manager';
import { Server } from './services/Server';
import { Pool } from './services/Pool';
import { Exchange } from './services/Exchange';
import { Logger } from './services/Logger';
import { Config } from './services/Config';
import { Events } from './services/Events';

export const serviceBuilder = (global = false) => new ServiceManager({
  'config': () => new Config(),
  'events': () => new Events(),
}, global)
  .add('logger', (sm) => new Logger(sm.get('config').getConfiguration().logLevel))
  .add('pool', (sm) => new Pool(sm.get('logger', true).setScope('pool'), sm.get('config')))
  .add('exchange', (sm) => new Exchange(sm.get('pool'), sm.get('logger', true).setScope('exchange'), sm.get('config').getConfiguration()))
  .add(
    'server',
    (sm) => new Server(
      sm.get('exchange'),
      sm.get('logger', true).setScope('server'),
      sm.get('config'),
      sm.get('events')
    )
  );
export type ServiceMan = ReturnType<typeof serviceBuilder>;
