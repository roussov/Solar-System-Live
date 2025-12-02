"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsContentType = exports.metricsRegistry = void 0;
exports.recordCacheHit = recordCacheHit;
exports.recordCacheMiss = recordCacheMiss;
exports.recordHorizonsLatency = recordHorizonsLatency;
exports.getMetricsSnapshot = getMetricsSnapshot;
const prom_client_1 = require("prom-client");
exports.metricsRegistry = new prom_client_1.Registry();
(0, prom_client_1.collectDefaultMetrics)({ register: exports.metricsRegistry });
const cacheHits = new prom_client_1.Counter({
    name: 'horizons_cache_hits_total',
    help: 'Nombre de réponses servies depuis le cache (par backend).',
    labelNames: ['backend', 'state'],
    registers: [exports.metricsRegistry]
});
const cacheMisses = new prom_client_1.Counter({
    name: 'horizons_cache_misses_total',
    help: 'Nombre de MISS (requêtes Horizons déclenchées).',
    labelNames: ['backend', 'reason'],
    registers: [exports.metricsRegistry]
});
const cacheAgeGauge = new prom_client_1.Gauge({
    name: 'horizons_cache_age_ms',
    help: 'Âge du dernier snapshot renvoyé.',
    labelNames: ['backend'],
    registers: [exports.metricsRegistry]
});
const horizonsLatency = new prom_client_1.Histogram({
    name: 'horizons_fetch_duration_ms',
    help: 'Latence des appels agrégés à l’API NASA JPL Horizons (ms).',
    buckets: [50, 100, 200, 400, 800, 1200, 2000, 4000, 8000],
    registers: [exports.metricsRegistry]
});
function recordCacheHit(backend, state, ageMs) {
    cacheHits.inc({ backend, state });
    cacheAgeGauge.set({ backend }, ageMs);
}
function recordCacheMiss(backend, reason, latencyMs) {
    cacheMisses.inc({ backend, reason });
    if (latencyMs !== undefined && Number.isFinite(latencyMs)) {
        horizonsLatency.observe(latencyMs);
    }
}
function recordHorizonsLatency(latencyMs) {
    if (Number.isFinite(latencyMs)) {
        horizonsLatency.observe(latencyMs);
    }
}
function getMetricsSnapshot() {
    return exports.metricsRegistry.metrics();
}
exports.metricsContentType = exports.metricsRegistry.contentType;
