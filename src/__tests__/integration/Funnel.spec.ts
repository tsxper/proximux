import { serviceBuilder } from '../../serviceBuilder';
import { Config, ConfigObject, TargetServerConfig } from '../../services/Config';
import { LOG_LEVEL } from '../../services/Logger';
import { TargetServer } from '../TargetServer';
import { TestClient } from '../TestClient';

describe('FIFO', () => {
  it('Create funnel with 2 target connections', async () => {
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
    await pool.connect();
    expect(pool.getActiveConnectionsCount()).toBe(pool.getTargetCount());

    const server = sm.get('server');
    const clientPort = await server.start();
    const targetId = 1;
    const client1 = new TestClient(targetId, config).setOpts({ port: clientPort });
    const client2 = new TestClient(targetId, config).setOpts({ port: clientPort });
    const reqRes: Record<string, [string, number]> = {
      'req1': ['resp1', 50],
      'req2': ['resp2', 0],
      'req3': ['resp3', 0],
    };
    targetServer.setResponseMap(reqRes);
    const results: string[] = await Promise.all([
      client1.send('req1', false),
      client2.send('req2'),
    ]);
    results.push(...(await Promise.all([
      client1.send('req3'),
    ])));
    expect(results[0]).toBe('resp1');
    expect(results[1]).toBe('resp2');
    expect(results[2]).toBe('resp3');

    await server.stop();
    await pool.disconnect();
    await targetServer.stop();
  });
});
