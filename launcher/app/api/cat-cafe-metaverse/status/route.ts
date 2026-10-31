import { getRuntime } from '../../../../../projects/cat-cafe-metaverse/server/vercel-runtime.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'hnd1';
export async function GET() {
  const status = await getRuntime().status();
  return Response.json(status, { status: status.available ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
