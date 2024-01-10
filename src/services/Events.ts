import EventEmitter from 'node:events';
import { Logger } from './Logger';
import { AddressInfo } from 'node:net';

interface EventHandlers {
  connected: (logger: Logger, remote: Partial<AddressInfo>) => void;
  request: (logger: Logger, data: Buffer, response: Promise<Buffer>) => void;
}

export class Events extends EventEmitter {
  addListener<K extends keyof EventHandlers>(event: K, listener: EventHandlers[K]): this {
    return super.addListener(event, listener);
  }
  on<K extends keyof EventHandlers>(event: K, listener: EventHandlers[K]): this {
    return super.on(event, listener);
  }
  once<K extends keyof EventHandlers>(event: K, listener: EventHandlers[K]): this {
    return super.once(event, listener);
  }
  removeListener<K extends keyof EventHandlers>(event: K, listener: EventHandlers[K]): this {
    return super.removeListener(event, listener);
  }
  off<K extends keyof EventHandlers>(event: K, listener: EventHandlers[K]): this {
    return super.off(event, listener);
  }
  removeAllListeners<K extends keyof EventHandlers>(event?: K): this {
    return event ? super.removeAllListeners(event) : super.removeAllListeners();
  }
  listeners<K extends keyof EventHandlers>(event: K): ReturnType<EventEmitter['listeners']> {
    return super.listeners(event);
  }
  rawListeners<K extends keyof EventHandlers>(event: K): ReturnType<EventEmitter['rawListeners']> {
    return super.rawListeners(event);
  }
  emit<K extends keyof EventHandlers>(event: K, ...args: Parameters<EventHandlers[K]>): boolean {
    return super.emit(event, ...args);
  }
  listenerCount<K extends keyof EventHandlers>(event: K, listener?: EventHandlers[K]): number {
    return super.listenerCount(event, listener);
  }
  prependListener<K extends keyof EventHandlers>(event: K, listener: EventHandlers[K]): this {
    return super.prependListener(event, listener);
  }
  prependOnceListener<K extends keyof EventHandlers>(event: K, listener: EventHandlers[K]): this {
    return super.prependOnceListener(event, listener);
  }
}
