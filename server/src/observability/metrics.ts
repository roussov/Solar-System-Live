import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics
} from 'prom-client';

export type CacheBackend = 'memory' | 'redis';
export type CacheState = 'fresh' | 'stale';

export const metricsRegistry = new Registry();

collectDefaultMetrics({ register: metricsRegistry });

const cacheHits = new Counter({
  name: 'horizons_cache_hits_total',
  help: 'Nombre de réponses servies depuis le cache (par backend).',
  labelNames: ['backend', 'state'],
  registers: [metricsRegistry]
});

const cacheMisses = new Counter({
  name: 'horizons_cache_misses_total',
  help: 'Nombre de MISS (requêtes Horizons déclenchées).',
  labelNames: ['backend', 'reason'],
  registers: [metricsRegistry]
});

const cacheAgeGauge = new Gauge({
  name: 'horizons_cache_age_ms',
  help: 'Âge du dernier snapshot renvoyé.',
  labelNames: ['backend'],
  registers: [metricsRegistry]
});

const horizonsLatency = new Histogram({
  name: 'horizons_fetch_duration_ms',
  help: 'Latence des appels agrégés à l’API NASA JPL Horizons (ms).',
  buckets: [50, 100, 200, 400, 800, 1200, 2000, 4000, 8000],
  registers: [metricsRegistry]
});

export function recordCacheHit(
  backend: CacheBackend,
  state: CacheState,
  ageMs: number
): void {
  cacheHits.inc({ backend, state });
  cacheAgeGauge.set({ backend }, ageMs);
}

export function recordCacheMiss(
  backend: CacheBackend,
  reason: string,
  latencyMs?: number
): void {
  cacheMisses.inc({ backend, reason });
  if (latencyMs !== undefined && Number.isFinite(latencyMs)) {
    horizonsLatency.observe(latencyMs);
  }
}

export function recordHorizonsLatency(latencyMs: number): void {
  if (Number.isFinite(latencyMs)) {
    horizonsLatency.observe(latencyMs);
  }
}

export function getMetricsSnapshot(): Promise<string> {
  return metricsRegistry.metrics();
}

export const metricsContentType = metricsRegistry.contentType;
