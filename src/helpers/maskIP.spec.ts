import { maskIP } from './maskIP';

describe('maskIP()', () => {
  it('mask IPv4', () => {
    expect(maskIP('1.2.3.4')).toBe('1.2.x.x');
    expect(maskIP('01.2.128.255')).toBe('01.2.x.x');
  });
  it('mask IPv6', () => {
    expect(maskIP('2001:db8:3333:4444:5555:6666:7777:8888')).toBe('x01:x8:x33:x44:x55:x66:x77:x88');
    expect(maskIP('2001:db8::')).toBe('x01:x8::');
    expect(maskIP('::1234:5678')).toBe('::x34:x78');
  });
});
