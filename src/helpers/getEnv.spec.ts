import { getEnv } from './getEnv';

describe('getEnv()', () => {
  it('getEnv param is mandatory', () => {
    expect(() => { getEnv('key', true); }).toThrow();
  });
  it('getEnv param is not mandatory', () => {
    expect(getEnv('key')).not.toBeDefined();
  });
});
