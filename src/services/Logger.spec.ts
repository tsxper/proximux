import { Duplex } from 'node:stream';
import { TextEncoderStream } from 'node:stream/web';
import { LOG_LEVEL_DEBUG, Logger } from './Logger';

describe('Logger', () => {
  it('should log all levels', async () => {
    const logger = new Logger(LOG_LEVEL_DEBUG);
    logger.setScope('test');
    const streamText = new TextEncoderStream();
    const stream = Duplex.from(streamText);
    logger.replaceLogTargets(stream, stream);

    const debugPr = new Promise<Buffer>((resolve) => {
      stream.once('data', (d) => resolve(d));
    });
    logger.debug('1');
    const debugRes = await debugPr;
    expect(JSON.parse(debugRes.toString())?.d).toBe('1');

    const infoPr = new Promise<Buffer>((resolve) => {
      stream.once('data', (d) => resolve(d));
    });
    logger.log('2');
    const infoRes = await infoPr;
    expect(JSON.parse(infoRes.toString())?.d).toBe('2');

    const errPr = new Promise<Buffer>((resolve) => {
      stream.once('data', (d) => resolve(d));
    });
    logger.error(new Error('3'));
    const errRes = await errPr;
    const err = JSON.parse(errRes.toString())?.e as { message?: string; name?: string; stack?: string; };

    expect(err.message).toBe('3');
    expect(err.name).toBe('Error');
    expect(err.stack).toBeDefined();

    stream.destroy();
  });
});
