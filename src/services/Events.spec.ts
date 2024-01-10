import { Events } from './Events';
import { Logger } from './Logger';

describe('Events', () => {
  it('Adds listener', () => {
    const events = new Events();
    const listener = () => { };
    events.addListener('connected', listener);
    expect(events.eventNames()).toMatchObject(['connected']);
    events.removeListener('connected', listener);
    expect(events.eventNames()).toMatchObject([]);
  });

  it('Emits event', () => {
    const events = new Events();
    const listener = jest.fn(() => { });
    events.on('connected', listener);
    const remote = {
      address: '127.0.0.1'
    };
    const log = new Logger;
    events.emit('connected', log, remote);
    expect(listener).toHaveBeenCalledWith(log, remote);
    events.removeAllListeners();
    expect(events.eventNames()).toMatchObject([]);
  });

});
