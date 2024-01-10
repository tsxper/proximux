import { TestClient } from '../TestClient';
import { TestServer } from '../TestServer';
import { serviceBuilder } from '../../serviceBuilder';
import { ConfigObject, TargetServerConfig } from '../../services/Config';
import { LOG_LEVEL } from '../../services/Logger';

describe('Server', () => {
  it('Can close server with active connections', async () => {
    const logLevel: LOG_LEVEL = 0;
    const baseConfig: ConfigObject = {
      logLevel: logLevel,
      localServerHost: 'localhost',
      localServerPort: undefined as unknown as number,
      localServerIpv6Only: false,
      localServerMaxConnections: -1,
      targetServers: [
        {
          host: 'localhost',
          port: -1,
        }
      ],
      proxyConnectionsCount: 1,
      proxyInactivityTimeout: -1,
      exchangeFunnelAsync: false,
    };
    const sm = serviceBuilder();
    sm.get('config').setConfiguration(baseConfig);
    const server = new TestServer(
      sm.get('exchange'),
      sm.get('logger'),
      sm.get('config'),
      sm.get('events'),
    );
    const port = await server.start();
    const config = sm.get('config').getConfiguration();
    const client1 = new TestClient(1, config).setOpts({ host: 'localhost', port });
    const socketConn = client1.connect();
    await new Promise((resolve) => {
      sm.get('events').once('connected', () => resolve(1));
    });
    const socket = await socketConn;
    expect(await server.getConnectionsCnt()).toBe(1);
    const isConnClosed = new Promise((resolve) => {
      socket.once('close', () => resolve(1));
    });
    await server.stop();
    await isConnClosed;
    expect(await server.getConnectionsCnt()).toBe(0);
  });

  it('Server drops extra connections', async () => {
    const logLevel: LOG_LEVEL = 0;
    const targetConf: [TargetServerConfig, TargetServerConfig] = [
      {
        host: 'localhost',
        port: undefined as unknown as number,
      },
      {
        host: 'localhost',
        port: undefined as unknown as number,
      }
    ];
    const config: ConfigObject = {
      logLevel: logLevel,
      localServerHost: 'localhost',
      localServerPort: undefined as unknown as number,
      localServerIpv6Only: false,
      localServerMaxConnections: 1,
      targetServers: targetConf,
      proxyConnectionsCount: 2,
      proxyInactivityTimeout: -1,
      exchangeFunnelAsync: false,
    };
    const sm = serviceBuilder();
    sm.get('config').setConfiguration(config);
    const server = new TestServer(
      sm.get('exchange'),
      sm.get('logger'),
      sm.get('config'),
      sm.get('events'),
    );
    const port = await server.start();
    targetConf[0].port = port;
    const client1 = new TestClient(1, config);
    client1.connect();
    await new Promise((resolve) => {
      sm.get('events').once('connected', () => resolve(1));
    });
    expect(await server.getConnectionsCnt()).toBe(1);
    const client2 = new TestClient(1, config);
    const socket = await client2.connect();
    await new Promise((resolve) => {
      socket.once('close', () => resolve(1));
    });
    await server.stop();
    expect(await server.getConnectionsCnt()).toBe(0);
  });
});
