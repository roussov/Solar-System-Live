import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { EphemerisSnapshot } from '../models/planet';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RealEphemerisService {
  // URL de base de l’API backend (configurable via environment)
  private readonly baseUrl = environment.apiBaseUrl || 'http://localhost:3000/api/ephemeris';

  constructor(private http: HttpClient) {}

  private generateRequestId(): string {
    const globalCrypto = (globalThis as any)?.crypto;
    if (globalCrypto?.randomUUID) {
      return globalCrypto.randomUUID();
    }

    return 'req-' + Math.random().toString(16).slice(2) + Date.now().toString(16);
  }

  getCurrentPlanetPositions(options?: { forceRefresh?: boolean }): Observable<EphemerisSnapshot> {
    const requestId = this.generateRequestId();

    return this.http
      .get<EphemerisSnapshot>(`${this.baseUrl}/planets`, {
        observe: 'response',
        params: options?.forceRefresh ? { refresh: '1' } : undefined,
        headers: { 'X-Request-Id': requestId }
      })
      .pipe(
        map((response) => {
          const body = response.body as EphemerisSnapshot | null;
          const headers = response.headers;

          const cacheStatus = headers.get('X-Horizons-Cache') ?? body?.metadata?.cacheStatus;
          const cacheBackend =
            (headers.get('X-Horizons-Cache-Backend') as 'memory' | 'redis' | null) ??
            body?.metadata?.cacheBackend ??
            undefined;
          const cacheAgeHeader = Number.parseInt(headers.get('X-Horizons-Cache-Age') || '', 10);
          const ttlHeader = Number.parseInt(headers.get('X-Horizons-TTL') || '', 10);
          const latencyHeader = Number.parseInt(headers.get('X-Horizons-Latency') || '', 10);
          const frozenHeader = headers.get('X-Horizons-Frozen') === '1';
          const requestId = headers.get('X-Request-Id') ?? body?.metadata?.requestId;

          const safeCacheAge = Number.isFinite(cacheAgeHeader)
            ? cacheAgeHeader
            : body?.metadata?.cacheAgeMs;
          const safeLatency = Number.isFinite(latencyHeader)
            ? latencyHeader
            : body?.metadata?.responseTimeMs;

          if (!body) {
            return {
              timestamp: new Date().toISOString(),
              bodies: [],
              metadata: {
                cacheStatus: cacheStatus as EphemerisSnapshot['metadata']['cacheStatus'],
                cacheBackend,
                cacheAgeMs: safeCacheAge,
              cacheExpiresInMs: Number.isFinite(ttlHeader)
                ? Math.max(0, ttlHeader - (safeCacheAge || 0))
                : undefined,
              responseTimeMs: safeLatency,
              frozenSnapshot: frozenHeader,
              requestId
            }
          };
        }

          return {
            ...body,
            metadata: {
              ...body.metadata,
              cacheStatus: cacheStatus as EphemerisSnapshot['metadata']['cacheStatus'],
              cacheBackend,
              cacheAgeMs: safeCacheAge ?? body.metadata?.cacheAgeMs,
              cacheExpiresInMs: Number.isFinite(ttlHeader)
                ? Math.max(0, ttlHeader - (safeCacheAge || 0))
                : body.metadata?.cacheExpiresInMs,
              responseTimeMs: safeLatency ?? body.metadata?.responseTimeMs,
              frozenSnapshot: frozenHeader || body.metadata?.frozenSnapshot,
              freezeReason: body.metadata?.freezeReason,
              requestId
            }
          };
        })
      );
  }
}
