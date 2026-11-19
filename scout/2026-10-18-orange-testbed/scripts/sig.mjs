// Signatures. Each agent has a secret key. A daily file is signed over the agent id, the date and the exact calls,
// so it cannot be moved to another agent or another day, or changed after signing.
import crypto from 'crypto';

export const keyFor = (secret, id) => crypto.createHmac('sha256', secret).update('agent:' + id).digest('hex').slice(0, 40);
export const sigFor = (agentKey, id, date, calls) => crypto.createHmac('sha256', agentKey).update(id + '|' + date + '|' + JSON.stringify(calls)).digest('hex');
export function sigOk(secret, id, date, calls, sig) {
  if (typeof sig !== 'string' || !Array.isArray(calls)) return false;
  const want = Buffer.from(sigFor(keyFor(secret, id), id, date, calls)), got = Buffer.from(sig);
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}
