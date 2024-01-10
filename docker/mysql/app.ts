import net from 'net';
import { Proximux } from '../../src';

const app = new Proximux(false);
app.run();

app.getEventEmitter().on('connected', (logger, remote) => {
  const remoteIp = remote?.address || '';
  const remoteType = remote?.family?.toLowerCase() === 'ipv6' ? 'ipv6' : 'ipv4';
  const blockList = new net.BlockList();
  blockList.addAddress('123.123.123.123');
  if (blockList.check(remoteIp, remoteType)) {
    throw new Error('IP is blacklisted');
  }
  logger.debug('Blocklist check passed');
});

const parseMySQLRawRequest = (s: string) => s.match(/\u0000\u0000\u0000\u0003(.+)/iu)?.[1];

app.getEventEmitter().on('request', (logger, rawReq, rawRespPromise) => {
  const t1 = new Date();
  rawRespPromise.then(() => {
    const time = new Date().getTime() - t1.getTime();
    logger.debug({
      msg: 'Data interceptor',
      req: parseMySQLRawRequest(rawReq.toString()),
      time,
    });
  }).catch((err) => {
    logger.error(err);
  });
});
