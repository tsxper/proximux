import { serviceBuilder } from '../../serviceBuilder';
import { Config, ConfigObject, TargetServerConfig } from '../../services/Config';
import { LOG_LEVEL } from '../../services/Logger';
import { TargetServer } from '../TargetServer';

describe('Pool', () => {
  it('Disconnect from target server after socket inactivity', async () => {
    const logLevel: LOG_LEVEL = 0;
    const baseConfig: ConfigObject = {
      logLevel: logLevel,
      localServerHost: 'localhost',
      localServerPort: -1,
      localServerIpv6Only: false,
      localServerMaxConnections: -1,
      targetServers: [{
        host: 'localhost',
        port: undefined as unknown as number,
      }],
      proxyConnectionsCount: 1,
      proxyInactivityTimeout: 200,
      exchangeFunnelAsync: false,
    };
    const sm = serviceBuilder().replace(
      'config',
      () => new Config().setConfiguration(baseConfig)
    );
    const config = sm.get('config').getConfiguration();
    const targetConf = config.targetServers?.[0];
    if (!targetConf) throw new Error('Unknown targetConf');
    const targetServer = new TargetServer(targetConf.host, targetConf.port, logLevel);
    const port = await targetServer.start();
    targetConf.port = port;
    const server = targetServer.getServer();
    let isDisconnected = false;
    const disconnect = new Promise((resolve) => {
      server.once('connection', (s) => {
        s.once('close', () => {
          isDisconnected = true;
          resolve(1);
        });
      });
    });
    const pool = sm.get('pool');
    await pool.connect();
    await disconnect;
    await targetServer.stop();
    expect(isDisconnected).toBe(true);
  });

  it('Increase number of upstream connections on select()', async () => {
    const logLevel: LOG_LEVEL = 0;
    const targetConf: [TargetServerConfig, TargetServerConfig] = [
      {
        host: 'localhost',
        port: undefined as unknown as number,
      }, {
        host: 'localhost',
        port: undefined as unknown as number,
      }
    ];
    const config: ConfigObject = {
      logLevel: logLevel,
      localServerHost: 'localhost',
      localServerPort: undefined as unknown as number,
      localServerIpv6Only: false,
      localServerMaxConnections: -1,
      targetServers: targetConf,
      proxyConnectionsCount: 2,
      proxyInactivityTimeout: 200,
      exchangeFunnelAsync: false,
    };
    const sm = serviceBuilder().replace(
      'config',
      () => new Config().setConfiguration(config)
    );
    const targetServer = new TargetServer(targetConf[0].host, targetConf[0].port, logLevel);
    const port = await targetServer.start();
    targetConf[0].port = port;
    targetConf[1].port = port;

    const pool = sm.get('pool');
    expect(pool.getTargetCount()).toBeGreaterThan(1);
    expect(pool.getActiveConnectionsCount()).toBe(0);

    await pool.select();
    expect(pool.getActiveConnectionsCount()).toBe(1);

    await pool.select();
    expect(pool.getActiveConnectionsCount()).toBe(2);

    await pool.disconnect();
    expect(pool.getActiveConnectionsCount()).toBe(0);

    await targetServer.stop();
  });
});
