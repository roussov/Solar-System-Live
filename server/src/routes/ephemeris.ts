import { Router, Request, Response } from 'express';
import { CACHE_TTL_MS, getSnapshot } from '../cache/ephemerisCache';
import { logError } from '../observability/logger';

const router = Router();

async function handleSnapshotRequest(req: Request, res: Response): Promise<void> {
  const refreshParam = req.query?.refresh;
  const refreshParamValue =
    typeof refreshParam === 'string'
      ? refreshParam
      : Array.isArray(refreshParam)
      ? refreshParam.find((v) => v === '1' || v === 'true')
      : undefined;
  const refreshHeaderRaw = req.headers['x-refresh-cache'];
  const refreshHeader = Array.isArray(refreshHeaderRaw)
    ? refreshHeaderRaw[0]
    : refreshHeaderRaw;

  const forceRefresh =
    refreshParamValue === '1' ||
    refreshParamValue === 'true' ||
    refreshHeader === '1' ||
    refreshHeader === 'true';

  try {
    const { payload, cacheState, cacheBackend, cacheAgeMs } = await getSnapshot({
      forceRefresh
    });

    if (payload?.metadata?.responseTimeMs !== undefined) {
      res.setHeader('X-Horizons-Latency', payload.metadata.responseTimeMs);
    }

    res.setHeader('X-Horizons-Cache', cacheState);
    res.setHeader('X-Horizons-Cache-Backend', cacheBackend);
    res.setHeader('X-Horizons-Cache-Age', cacheAgeMs.toString());
    res.setHeader('X-Horizons-TTL', CACHE_TTL_MS.toString());
    res.setHeader('X-Horizons-Cache-Stale', cacheState === 'STALE' ? '1' : '0');
    res.json(payload);
  } catch (err: any) {
    logError('ephemeris_fetch_failed', { error: err?.message ?? String(err) });
    res
      .status(500)
      .json({ error: 'Erreur lors de la récupération des éphémérides' });
  }
}

router.get('/planets', handleSnapshotRequest);
router.get('/planets/state-vectors', handleSnapshotRequest);

export default router;
