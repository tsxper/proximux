export function getEnv<T extends true>(key: string, required: T): string;
export function getEnv<T extends false>(key: string, required?: T): string | undefined;
export function getEnv(key: string, required: boolean = false): string | undefined {
  const val = process.env[key];
  if (required && !val) {
    throw new Error(`Env "${key}" is required`);
  }
  return val;
}
