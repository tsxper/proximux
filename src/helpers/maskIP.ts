export function maskIP(ip?: string): string {
  if (!ip) return '';
  return ip.indexOf('.') > 0
    ? ip.replace(/[0-9]+\.[0-9]+$/, 'x.x')
    : ip.split(':').map(s => s.replace(/^[0-9a-fA-F]{1,2}/, 'x')).join(':');
}
