import { getEnv } from '../helpers';
import { LOG_LEVEL, Logger } from './Logger';

export type TargetServerConfig = {
  host: string;
  port: number;
  keepAlive?: boolean;
};
export type ConfigObject = {
  logLevel: LOG_LEVEL;
  localServerHost: string;
  localServerPort: number;
  localServerIpv6Only: boolean;
  localServerMaxConnections: number;
  exchangeFunnelAsync: boolean;
  targetServers: TargetServerConfig[];
  proxyConnectionsCount: number;
  proxyInactivityTimeout: number;
};

export class Config {
  protected configuration?: ConfigObject;
  setConfiguration(conf: ConfigObject): this {
    if (conf.targetServers.length !== conf.proxyConnectionsCount) {
      throw new Error(`proxyConnectionsCount does not match number of target servers`);
    }
    this.configuration = conf;
    return this;
  }
  getConfiguration(): ConfigObject {
    if (!this.configuration) {
      const proxyConnectionsCount = parseInt(getEnv('PROXY_CONNECTIONS_CNT', true));
      const targetServers = [];
      for (let id = 1; id <= proxyConnectionsCount; id += 1) {
        const targetConf: TargetServerConfig = {
          host: getEnv(`TARGET_HOST_${id}`, true),
          port: parseInt(getEnv(`TARGET_PORT_${id}`, true)),
          keepAlive: getEnv(`TARGET_CONN_${id}_KEEP_ALIVE`, false) === '1',
        };
        targetServers.push(targetConf);
      }
      const logLevel = parseInt(getEnv('LOG_LEVEL', true));
      if (!Logger.checkLogLevel(logLevel)) throw new Error("Unknown LOG_LEVEL");
      this.configuration = {
        logLevel: logLevel,
        localServerHost: getEnv('LOCAL_HOST', true),
        localServerPort: parseInt(getEnv('LOCAL_PORT', true)),
        localServerIpv6Only: parseInt(getEnv('LOCAL_IPV6_ONLY') || '0') === 1,
        localServerMaxConnections: parseInt(getEnv('LOCAL_MAX_CONNECTIONS') || '-1'),
        exchangeFunnelAsync: parseInt(getEnv('EXCHANGE_FUNNEL_ASYNC') || '0') === 1,
        targetServers,
        proxyConnectionsCount,
        proxyInactivityTimeout: parseInt(getEnv('PROXY_INACTIVE_TIMEOUT') || '-1'),
      };
    }
    return this.configuration;
  }
}
