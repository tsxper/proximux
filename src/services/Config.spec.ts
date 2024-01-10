import { Config, ConfigObject } from './Config';

describe('Config', () => {
  it('should parse ConfigObject', () => {
    const configObj: ConfigObject = {
      logLevel: 3,
      localServerHost: 'localhost',
      localServerPort: 5511,
      localServerIpv6Only: false,
      localServerMaxConnections: -1,
      exchangeFunnelAsync: false,
      targetServers: [{
        host: 'localhost',
        port: 7711,
        keepAlive: false,
      }],
      proxyConnectionsCount: 1,
      proxyInactivityTimeout: -1,
    };
    process.env['PROXY_CONNECTIONS_CNT'] = configObj.proxyConnectionsCount.toString();
    process.env['TARGET_PORT_1'] = configObj.targetServers?.[0]?.port?.toString() || '';
    process.env['TARGET_HOST_1'] = configObj.targetServers?.[0]?.host || '';
    process.env['TARGET_CONN_1_KEEP_ALIVE'] = configObj.targetServers?.[0]?.keepAlive ? '1' : '0';
    process.env['LOCAL_PORT'] = configObj.localServerPort.toString();
    process.env['LOCAL_HOST'] = configObj.localServerHost;
    process.env['LOG_LEVEL'] = configObj.logLevel.toString();
    process.env['EXCHANGE_FUNNEL_ASYNC'] = configObj.exchangeFunnelAsync ? '1' : '0';
    expect(new Config().getConfiguration()).toMatchObject(configObj);
    process.env['PROXY_CONNECTIONS_CNT'] = undefined;
    process.env['TARGET_PORT_1'] = undefined;
    process.env['TARGET_HOST_1'] = undefined;
    process.env['TARGET_CONN_1_KEEP_ALIVE'] = undefined;
    process.env['LOCAL_PORT'] = undefined;
    process.env['LOCAL_HOST'] = undefined;
    process.env['LOG_LEVEL'] = undefined;
    process.env['EXCHANGE_FUNNEL_ASYNC'] = undefined;
  });

  it('setConfiguration() triggers error when proxyConnectionsCount not match to targets', () => {
    const conf = {
      proxyConnectionsCount: 1,
      targetServers: [],
    } as unknown as ConfigObject;
    expect(() => new Config().setConfiguration(conf)).toThrow('proxyConnectionsCount does not match number of target servers');
  });
});
