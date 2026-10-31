import { upgradeWebSocket } from '@vercel/functions';
import { allowUpgrade, getRuntime } from '../../../../../projects/cat-cafe-metaverse/server/vercel-runtime.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'hnd1';
export const maxDuration = 300;
export async function GET(request: Request) {
  if (!allowUpgrade(request)) return new Response('Forbidden', { status: 403 });
  const service = getRuntime();
  if (!(await service.status()).available) return new Response('Realtime service unavailable', { status: 503 });
  return upgradeWebSocket(async ws => {
    service.gateway().attach(ws);
    if (ws.readyState !== 3) await new Promise<void>(resolve => ws.once('close', () => resolve()));
  }, { maxPayload: 2048 });
}
