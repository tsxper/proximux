import { TargetServer } from '../TargetServer';
import { TestClient } from '../TestClient';
import { TestServer } from '../TestServer';
import { serviceBuilder } from '../../serviceBuilder';
import { Config, ConfigObject } from '../../services/Config';
import { LOG_LEVEL } from '../../services/Logger';

describe('FIFO', () => {
  it('Test FIFO order', async () => {
    const logLevel: LOG_LEVEL = 0;
    const baseConfig: ConfigObject = {
      logLevel: logLevel,
      localServerHost: 'localhost',
      localServerPort: 2211,
      localServerIpv6Only: false,
      localServerMaxConnections: -1,
      targetServers: [{
        host: 'localhost',
        port: 3311,
      }],
      proxyConnectionsCount: 1,
      proxyInactivityTimeout: -1,
      exchangeFunnelAsync: false,
    };
    const sm = serviceBuilder()
      .replace(
        'config',
        () => new Config().setConfiguration(baseConfig)
      )
      .replace(
        'server',
        (sm) => new TestServer(
          sm.get('exchange'),
          sm.get('logger').setScope('server'),
          sm.get('config'),
          sm.get('events')
        )
      );
    const config = sm.get('config').getConfiguration();
    const targetConf = config.targetServers?.[0];
    if (!targetConf) throw new Error('Unknown targetConf');
    const targetServer = new TargetServer(targetConf.host, targetConf.port, logLevel);
    await targetServer.start();

    const pool = sm.get('pool');
    await pool.connect();
    const server = sm.get('server', true);
    await server.start();
    const targetId = 1;
    const client1 = new TestClient(targetId, config).setOpts({ host: 'localhost', port: config.localServerPort });
    const client2 = new TestClient(targetId, config).setOpts({ host: 'localhost', port: config.localServerPort });
    const client3 = new TestClient(targetId, config).setOpts({ host: 'localhost', port: config.localServerPort });
    const reqRes: Record<string, [string, number]> = {
      'req1': ['resp1', 50],
      'req2': ['resp2', 20],
      'req3': ['resp3', 0],
      'req1_2': ['resp1_2', 0],
      'req2_2': ['resp2_2', 0],
    };
    targetServer.setResponseMap(reqRes);
    const results: string[] = await Promise.all([
      client1.send('req1', false),
      client2.send('req2', false),
      client3.send('req3'),
    ]);
    results.push(...(await Promise.all([
      client1.send('req1_2'),
      client2.send('req2_2'),
    ])));
    const seq = server.getDataSequence();
    expect(results[0]).toBe('resp1');
    expect(results[1]).toBe('resp2');
    expect(results[2]).toBe('resp3');
    expect(results[3]).toBe('resp1_2');
    expect(results[4]).toBe('resp2_2');
    const reqSeq = targetServer?.getRequests() ?? [];
    expect(reqSeq).toMatchObject(seq);
    await server.stop();
    await pool.disconnect();
    await targetServer.stop();
  });
});
