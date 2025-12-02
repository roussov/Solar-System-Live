import axios from 'axios';
import { PlanetName } from '../config/planets';
import { logInfo } from '../observability/logger';

export interface PlanetStateVector {
  name: PlanetName;
  x_au: number;
  y_au: number;
  z_au: number;
  vx_au_per_day?: number;
  vy_au_per_day?: number;
  vz_au_per_day?: number;
  velocityUnit?: string;
  referenceFrame?: string;
  source?: string;
  timestamp: string;
}

const HORIZONS_URL = 'https://ssd-api.jpl.nasa.gov/horizons.api';

function formatUtcDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hour = pad(d.getUTCHours());
  const minute = pad(d.getUTCMinutes());
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

export async function fetchPlanetStateVector(
  horizonsId: string,
  name: PlanetName
): Promise<PlanetStateVector> {
  const requestStarted = Date.now();
  const now = new Date();
  const start = formatUtcDate(now);
  const stopDate = new Date(now.getTime() + 60 * 60 * 1000);
  const stop = formatUtcDate(stopDate);

  const params: Record<string, string> = {
    format: 'json',
    COMMAND: horizonsId,
    EPHEM_TYPE: 'VECTORS',
    CENTER: '@0',
    REF_PLANE: 'ECLIPTIC',
    REF_SYSTEM: 'J2000',
    START_TIME: start,
    STOP_TIME: stop,
    STEP_SIZE: '1 d',
    OUT_UNITS: 'AU-D',
    VEC_TABLE: '2',
    CSV_FORMAT: 'TEXT'
  };

  const response = await axios.get(HORIZONS_URL, { params });
  const latencyMs = Date.now() - requestStarted;

  const data = response.data;
  if (!data || !data.result || !Array.isArray(data.result.vectors) || data.result.vectors.length === 0) {
    throw new Error('Réponse Horizons invalide ou vide');
  }

  const vec = data.result.vectors[0];
  const x = parseFloat(vec.X);
  const y = parseFloat(vec.Y);
  const z = parseFloat(vec.Z);
  const vx = vec.VX !== undefined ? parseFloat(vec.VX) : undefined;
  const vy = vec.VY !== undefined ? parseFloat(vec.VY) : undefined;
  const vz = vec.VZ !== undefined ? parseFloat(vec.VZ) : undefined;

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    throw new Error('Vecteur Horizons invalide (X, Y, Z)');
  }

  const referenceFrame = `${params.REF_SYSTEM}-${params.REF_PLANE}`; // ex: J2000-ECLIPTIC
  const velocityUnit = 'AU/day';

  logInfo('horizons_fetch', { name, horizonsId, latencyMs });

  return {
    name,
    x_au: x,
    y_au: y,
    z_au: z,
    vx_au_per_day: Number.isFinite(vx) ? vx : undefined,
    vy_au_per_day: Number.isFinite(vy) ? vy : undefined,
    vz_au_per_day: Number.isFinite(vz) ? vz : undefined,
    velocityUnit,
    referenceFrame,
    source: 'NASA-JPL-Horizons',
    timestamp: vec.calendar_date || now.toISOString()
  };
}
