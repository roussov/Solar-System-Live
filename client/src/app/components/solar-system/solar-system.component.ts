import {
  Component,
  OnInit,
  OnDestroy,
  HostListener
} from '@angular/core';
import { Subscription, interval, startWith, switchMap, finalize, Observable } from 'rxjs';

import {
  Planet,
  EphemerisSnapshot,
  PlanetPosition
} from '../../models/planet';
import { PlanetService } from '../../services/planet.service';
import { RealEphemerisService } from '../../services/real-ephemeris.service';

type ViewMode = '2d' | '3d';
type PlanetNameType = Planet['name'];

interface DisplayPlanet {
  planet: Planet;
  x: number;
  y: number;
  rAu: number;
  isSelected: boolean;
  isFocused: boolean;
  axis?: { x1: number; y1: number; x2: number; y2: number };
  shadow?: { cx: number; cy: number; rx: number; ry: number };
}

@Component({
  selector: 'app-solar-system',
  templateUrl: './solar-system.component.html',
  styleUrls: ['./solar-system.component.css']
})
export class SolarSystemComponent implements OnInit, OnDestroy {
  /**
   * Métadonnées des planètes (rayon, masse, demi-grand axe…).
   * Fournies par PlanetService (valeurs physiques “moyennes”).
   */
  planets: Planet[] = [];

  /**
   * Planète actuellement sélectionnée (pour affichage dans PlanetInfoPanel).
   */
  selectedPlanet: Planet | null = null;

  /**
   * Données projetées sur l’écran (positions en pixels) dérivées
   * des éphémérides réelles fournies par le backend.
   */
  displayPlanets: DisplayPlanet[] = [];

  /**
   * Dimensions logiques du SVG (viewBox).
   * Elles peuvent être ajustées sur resize pour rester responsives.
   */
  width = 800;
  height = 800;
  centerX = this.width / 2;
  centerY = this.height / 2;

  /**
   * Mode de vue : 2D (vue du dessus) ou 3D (projection oblique).
   * Ne modifie que la projection, pas les coordonnées physiques (X,Y,Z).
   */
  viewMode: ViewMode = '2d';

  /**
   * Timelapse : décalage temporel (en jours) appliqué aux éphémérides reçues.
   * Un slider permet d’avancer/reculer d’un an, avec des pas jour/semaine/mois.
   */
  timeOffsetDays = 0;
  readonly maxTimeOffsetDays = 365;
  timeStepDays = 1;

  /**
   * Options d’affichage avancées en vue 3D.
   */
  showOrbitalPlanes = true;
  showPlanetAxes = true;
  showShadows = true;

  /**
   * Angle de caméra utilisé en projection 3D (rotation dans le plan Y–Z).
   */
  cameraAngleRad = Math.PI / 6; // ≈ 30°

  /**
   * Longueur (en pixels) correspondant à 1 UA dans l’échelle radiale compressée.
   * Affichée dans la barre d’échelle.
   */
  oneAuPixels = 0;

  /**
   * Valeur max du demi-grand axe (en UA) parmi les planètes.
   * Sert de référence pour compresser l’échelle radiale (Neptune ~ max).
   */
  private maxSemiMajorAxisAu = 30.1; // valeur par défaut, réajustée en ngOnInit
  focusPlanetName: PlanetNameType | null = null;

  /**
   * Dernier snapshot d’éphémérides reçu (positions réelles).
   * Permet de recalculer l’affichage sur changement de mode ou resize
   * sans réinterroger le backend.
   */
  private lastSnapshot: EphemerisSnapshot | null = null;
  metadata: EphemerisSnapshot['metadata'] | null = null;
  private snapshotReceivedAt: number | null = null;
  private lastLatencyTimestamp: string | null = null;
  autoRefreshEnabled = true;
  readonly refreshIntervalMs = 60_000;
  lastCacheStatus: 'HIT' | 'MISS' | 'STALE' | null = null;
  lastCacheBackend: 'memory' | 'redis' | null = null;
  cacheAgeMs: number | null = null;
  cacheTtlMs: number | null = null;
  currentLatencyMs: number | null = null;

  /**
   * Abonnement au flux de mise à jour périodique des éphémérides.
   */
  private ephemerisSub?: Subscription;
  private animationFrameId: number | null = null;
  enableInertialPlayback = true;
  private readonly msPerDay = 86_400_000;
  private latencySumMs = 0;
  private latencyCount = 0;

  /**
   * Indicateur de chargement (optionnel, au cas où tu veux l’exploiter dans le template).
   */
  isLoading = false;

  /**
   * Message d’erreur éventuel lors de l’appel au backend.
   */
  errorMessage: string | null = null;

  /**
   * Timestamp de la dernière mise à jour (vient du backend).
   */
  lastUpdateTimestamp: string | null = null;

  constructor(
    private planetService: PlanetService,
    private ephemerisService: RealEphemerisService
  ) {}

  // ---------------------------------------------------------------------------
  // Cycle de vie
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    this.planets = this.planetService.getPlanets();

    // Détermine le plus grand demi-grand axe pour l’échelle
    this.maxSemiMajorAxisAu =
      this.planets.reduce(
        (max, p) => (p.semiMajorAxisAU > max ? p.semiMajorAxisAU : max),
        0
      ) || 30.1;

    // Initialisation des dimensions (responsive basique)
    this.updateDimensionsFromWindow();
    this.oneAuPixels = this.distanceToPixels(1);

    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
    this.stopInertialAnimation();
  }

  // ---------------------------------------------------------------------------
  // Rafraîchissement / appels API
  // ---------------------------------------------------------------------------

  private fetchSnapshot(options?: { forceRefresh?: boolean }): Observable<EphemerisSnapshot> {
    this.isLoading = true;
    this.errorMessage = null;

    return this.ephemerisService
      .getCurrentPlanetPositions(options)
      .pipe(finalize(() => (this.isLoading = false)));
  }

  private handleSnapshot(snapshot: EphemerisSnapshot): void {
    this.errorMessage = null;
    this.lastSnapshot = snapshot;
    this.snapshotReceivedAt = Date.now();
    this.metadata = snapshot.metadata ?? null;
    this.lastUpdateTimestamp = snapshot.timestamp || new Date().toISOString();
    this.trackLatency(snapshot);
    this.trackCache(snapshot);
    this.updateDisplayFromSnapshot(snapshot);
    this.startInertialAnimation();
  }

  private handleSnapshotError(err: unknown): void {
    console.error('Erreur éphémérides:', err);
    this.errorMessage =
      'Erreur lors de la récupération des positions réelles des planètes.';
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.autoRefreshEnabled = true;

    this.ephemerisSub = interval(this.refreshIntervalMs)
      .pipe(
        startWith(0),
        switchMap(() => this.fetchSnapshot())
      )
      .subscribe({
        next: (snapshot) => this.handleSnapshot(snapshot),
        error: (err) => this.handleSnapshotError(err)
      });
  }

  private stopAutoRefresh(): void {
    this.ephemerisSub?.unsubscribe();
    this.ephemerisSub = undefined;
  }

  toggleAutoRefresh(): void {
    if (this.autoRefreshEnabled) {
      this.autoRefreshEnabled = false;
      this.stopAutoRefresh();
    } else {
      this.startAutoRefresh();
    }
  }

  triggerManualRefresh(forceNetwork = false): void {
    this.fetchSnapshot({ forceRefresh: forceNetwork }).subscribe({
      next: (snapshot) => this.handleSnapshot(snapshot),
      error: (err) => this.handleSnapshotError(err)
    });
  }

  // ---------------------------------------------------------------------------
  // Gestion de la fenêtre (responsivité)
  // ---------------------------------------------------------------------------

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateDimensionsFromWindow();
    this.oneAuPixels = this.distanceToPixels(1);

    // Si on a déjà des données d’éphémérides, on recalcule les positions
    if (this.lastSnapshot) {
      this.updateDisplayFromSnapshot(this.lastSnapshot);
    }
  }

  /**
   * Ajuste la largeur/hauteur du SVG en fonction de la taille de la fenêtre,
   * en gardant un canvas carré centré et une marge raisonnable.
   */
  private updateDimensionsFromWindow(): void {
    const viewportWidth = window.innerWidth || 1024;
    const maxSvg = 800;

    // Petite marge latérale pour ne pas coller au bord de la fenêtre
    const targetWidth = Math.min(viewportWidth - 64, maxSvg);

    this.width = targetWidth > 320 ? targetWidth : 320;
    this.height = this.width; // carré

    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
  }

  // ---------------------------------------------------------------------------
  // Échelle & projection
  // ---------------------------------------------------------------------------

  /**
   * Conversion d’une distance en UA vers une distance en pixels,
   * en utilisant une compression radiale (sqrt) pour garder les planètes
   * externes visibles dans le même cadre.
   */
  private distanceToPixels(au: number): number {
    if (au <= 0) {
      return 0;
    }

    const maxRadiusPx = Math.min(this.width, this.height) / 2 - 40;
    const focus = this.focusPlanetName
      ? this.planets.find(p => p.name === this.focusPlanetName)?.semiMajorAxisAU
      : undefined;
    const effectiveMaxAu = focus ? Math.max(focus * 1.6, 0.5) : this.maxSemiMajorAxisAu;
    const maxAu = effectiveMaxAu || 30.1;

    // Compression radiale : sqrt(au / maxAu) * rayon_max
    const normalized = Math.sqrt(au / maxAu);
    return normalized * maxRadiusPx;
  }

  /**
   * Rayon visuel des planètes en pixels (tres compressé pour les géantes).
   * Ici, on reste arbitraire sur le "style", mais toujours déterministe.
   */
  planetRadiusToPixels(planet: Planet): number {
    const base = 4;
    const scale = 0.0005;
    return base + planet.radiusKm * scale;
  }

  /**
   * Rayon visuel des orbites, basé directement sur le demi-grand axe en UA.
   */
  getOrbitRadiusPx(planet: Planet): number {
    return this.distanceToPixels(planet.semiMajorAxisAU);
  }

  /**
   * Changement de mode de vue (2D vs 3D).
   * On ne change que la projection, pas les données physiques.
   */
  setViewMode(mode: ViewMode): void {
    if (this.viewMode === mode) {
      return;
    }
    this.viewMode = mode;

    // Si on dispose déjà d’un snapshot, on recalcule l’affichage
    if (this.lastSnapshot) {
      this.updateDisplayFromSnapshot(this.lastSnapshot);
    }
  }

  /**
   * Ajuste le pas du slider (1j / 7j / 30j).
   */
  setTimeStep(days: number): void {
    this.timeStepDays = days;
  }

  /**
   * Mise à jour du décalage temporel via le slider.
   */
  onTimeOffsetChange(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.timeOffsetDays = Number.isFinite(value) ? value : 0;

    this.refreshDisplay();
  }

  /**
   * Réinitialise le décalage temporel (retour à l’horodatage réel).
   */
  resetTimeOffset(): void {
    this.timeOffsetDays = 0;
    this.refreshDisplay();
  }

  // ---------------------------------------------------------------------------
  // Rendu à partir des éphémérides réelles
  // ---------------------------------------------------------------------------

  /**
   * Met à jour les positions affichées à partir d’un snapshot d’éphémérides.
   * Les coordonnées (x, y, z) sont interprétées comme héliocentriques en UA.
   */
  private updateDisplayFromSnapshot(snapshot: EphemerisSnapshot): void {
    if (!snapshot || !snapshot.bodies || snapshot.bodies.length === 0) {
      this.displayPlanets = [];
      return;
    }

    const positionsByName = new Map<string, PlanetPosition>();
    for (const body of snapshot.bodies) {
      positionsByName.set(body.name, body);
    }

    const display: DisplayPlanet[] = [];
    const deltaDays = this.timeOffsetDays + this.computeDriftDays(snapshot);

    for (const planet of this.planets) {
      const pos = positionsByName.get(planet.name);
      if (!pos) {
        continue;
      }

      const { x: xOrbit, y: yOrbit, z: zOrbitRaw } = this.computePositionWithOffset(
        pos,
        planet,
        deltaDays
      );
      let zOrbit = zOrbitRaw;
      const baseRadiusAu =
        Math.sqrt(
          xOrbit * xOrbit +
            yOrbit * yOrbit +
            zOrbit * zOrbit
        ) || planet.semiMajorAxisAU || 1e-6;

      if (!this.hasVelocity(pos)) {
        const incRad = (planet.inclinationDeg || 0) * Math.PI / 180;
        const angle = Math.atan2(yOrbit, xOrbit);
        const tiltRadius = Math.max(baseRadiusAu, planet.semiMajorAxisAU || baseRadiusAu);
        zOrbit += tiltRadius * Math.sin(incRad) * Math.sin(angle);
      }

      const rAu =
        Math.sqrt(
          xOrbit * xOrbit +
            yOrbit * yOrbit +
            zOrbit * zOrbit
        ) || planet.semiMajorAxisAU || 1e-6;
      const rPx = this.distanceToPixels(rAu);
      const scale = rPx / rAu || 1;
      const planetRadiusPx = this.planetRadiusToPixels(planet);

      let xScreen: number;
      let yScreen: number;

      if (this.viewMode === '2d') {
        // Vue du dessus : projection dans le plan (x, y)
        xScreen = this.centerX + xOrbit * scale;
        yScreen = this.centerY + yOrbit * scale;
      } else {
        // Vue pseudo-3D : même position physique (x, y, z),
        // projection oblique autour de l’axe X.
        const projected = this.project3dPoint(xOrbit, yOrbit, zOrbit, scale);
        xScreen = projected.x;
        yScreen = projected.y;
      }

      // Axe planétaire (vue 3D uniquement)
      let axis: DisplayPlanet['axis'];
      if (this.viewMode === '3d' && this.showPlanetAxes) {
        const tiltRad = (planet.axialTiltDeg || 0) * Math.PI / 180;
        const axisHalfPx = planetRadiusPx * 1.5;
        const axisHalfAu = axisHalfPx / (scale || 1);

        const axisY = Math.sin(tiltRad) * axisHalfAu;
        const axisZ = Math.cos(tiltRad) * axisHalfAu;

        const start = this.project3dPoint(xOrbit, yOrbit - axisY, zOrbit - axisZ, scale);
        const end = this.project3dPoint(xOrbit, yOrbit + axisY, zOrbit + axisZ, scale);

        axis = { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
      }

      // Ombre portée simple (ellipse aplatie sous la planète)
      let shadow: DisplayPlanet['shadow'];
      if (this.viewMode === '3d' && this.showShadows) {
        shadow = {
          cx: xScreen,
          cy: yScreen + planetRadiusPx * 0.6,
          rx: planetRadiusPx * 1.4,
          ry: planetRadiusPx * 0.65
        };
      }

      display.push({
        planet,
        x: xScreen,
        y: yScreen,
        rAu,
        isSelected: !!this.selectedPlanet && this.selectedPlanet.name === planet.name,
        isFocused: this.focusPlanetName === planet.name,
        axis,
        shadow
      });
    }

    // Optionnel : recalcule l'échelle 1 UA (utile après focus)
    this.oneAuPixels = this.distanceToPixels(1);

    // Si on doit centrer sur une planète, calcule un décalage global
    if (this.focusPlanetName) {
      const focused = display.find(dp => dp.planet.name === this.focusPlanetName);
      if (focused) {
        const panX = this.centerX - focused.x;
        const panY = this.centerY - focused.y;

        this.displayPlanets = display.map(dp => ({
          ...dp,
          x: dp.x + panX,
          y: dp.y + panY,
          axis: dp.axis
            ? {
                x1: dp.axis.x1 + panX,
                y1: dp.axis.y1 + panY,
                x2: dp.axis.x2 + panX,
                y2: dp.axis.y2 + panY
              }
            : undefined,
          shadow: dp.shadow
            ? {
                ...dp.shadow,
                cx: dp.shadow.cx + panX,
                cy: dp.shadow.cy + panY
              }
            : undefined
        }));
        return;
      }
    }

    this.displayPlanets = display;
  }

  /**
   * Bascule des options d’affichage en vue 3D.
   */
  onToggleOrbitPlanes(checked: boolean): void {
    this.showOrbitalPlanes = checked;
    this.refreshDisplay();
  }

  onTogglePlanetAxes(checked: boolean): void {
    this.showPlanetAxes = checked;
    this.refreshDisplay();
  }

  onToggleShadows(checked: boolean): void {
    this.showShadows = checked;
    this.refreshDisplay();
  }

  /**
   * Recalcule l’affichage depuis le dernier snapshot si disponible.
   */
  private refreshDisplay(): void {
    if (this.lastSnapshot) {
      this.updateDisplayFromSnapshot(this.lastSnapshot);
    }
  }

  /**
   * Compression visuelle des plans orbitaux en vue 3D.
   */
  orbitPlaneCompression(planet: Planet): number {
    const incRad = (planet.inclinationDeg || 0) * Math.PI / 180;
    const base = Math.cos(this.cameraAngleRad);
    const tilt = Math.cos(incRad);
    return Math.max(0.2, base * tilt);
  }

  /**
   * Projection oblique d’un point 3D (en UA) vers l’écran (px).
   */
  private project3dPoint(xAu: number, yAu: number, zAu: number, scale: number): { x: number; y: number } {
    const x = xAu * scale;
    const y = yAu * scale;
    const z = zAu * scale;
    const phi = this.cameraAngleRad;
    const yProj = y * Math.cos(phi) - z * Math.sin(phi);

    return {
      x: this.centerX + x,
      y: this.centerY + yProj
    };
  }

  // ---------------------------------------------------------------------------
  // Lecture inertielle & interpolation temporelle
  // ---------------------------------------------------------------------------

  onToggleInertialPlayback(checked: boolean): void {
    this.enableInertialPlayback = checked;
    if (checked) {
      this.startInertialAnimation();
      this.refreshDisplay();
    } else {
      this.stopInertialAnimation();
    }
  }

  private startInertialAnimation(): void {
    if (!this.enableInertialPlayback || this.animationFrameId !== null) {
      return;
    }

    const tick = () => {
      this.animationFrameId = null;
      if (this.enableInertialPlayback) {
        this.refreshDisplay();
        this.animationFrameId = requestAnimationFrame(tick);
      }
    };

    this.animationFrameId = requestAnimationFrame(tick);
  }

  private stopInertialAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private trackLatency(snapshot: EphemerisSnapshot): void {
    if (this.lastLatencyTimestamp === snapshot.timestamp) {
      return;
    }
    const latency = snapshot.metadata?.responseTimeMs;
    if (latency !== undefined && Number.isFinite(latency)) {
      this.latencySumMs += latency;
      this.latencyCount += 1;
      this.lastLatencyTimestamp = snapshot.timestamp;
      this.currentLatencyMs = latency;
    }
  }

  private trackCache(snapshot: EphemerisSnapshot): void {
    const meta = snapshot.metadata;
    if (!meta) {
      return;
    }

    this.lastCacheStatus =
      (meta.cacheStatus as typeof this.lastCacheStatus) ?? this.lastCacheStatus;
    this.lastCacheBackend =
      (meta.cacheBackend as typeof this.lastCacheBackend) ?? this.lastCacheBackend;

    this.cacheAgeMs =
      meta.cacheAgeMs !== undefined && Number.isFinite(meta.cacheAgeMs)
        ? meta.cacheAgeMs
        : this.cacheAgeMs;

    this.cacheTtlMs =
      meta.cacheExpiresInMs !== undefined && Number.isFinite(meta.cacheExpiresInMs)
        ? meta.cacheExpiresInMs
        : this.cacheTtlMs;

    if (meta.responseTimeMs !== undefined && Number.isFinite(meta.responseTimeMs)) {
      this.currentLatencyMs = meta.responseTimeMs;
    }
  }

  private computeDriftDays(snapshot: EphemerisSnapshot): number {
    if (!this.enableInertialPlayback) {
      return 0;
    }

    const refFromSnapshot = Date.parse(snapshot.timestamp);
    const referenceMs = Number.isFinite(refFromSnapshot)
      ? refFromSnapshot
      : this.snapshotReceivedAt ?? Date.now();
    const now = Date.now();

    const driftMs = now - referenceMs;
    return Math.max(0, driftMs) / this.msPerDay;
  }

  private hasVelocity(pos: PlanetPosition): pos is PlanetPosition & Required<Pick<PlanetPosition, 'vx' | 'vy' | 'vz'>> {
    return (
      pos.vx !== undefined &&
      pos.vy !== undefined &&
      pos.vz !== undefined &&
      Number.isFinite(pos.vx) &&
      Number.isFinite(pos.vy) &&
      Number.isFinite(pos.vz)
    );
  }

  /**
   * Calcule la position décalée temporellement d’une planète.
   * - Si des vitesses vx/vy/vz sont présentes, on interpole linéairement en UA.
   * - Sinon, on retombe sur l’approximation orbitale existante (période + inclinaison).
   */
  private computePositionWithOffset(
    pos: PlanetPosition,
    planet: Planet,
    deltaDays: number
  ): { x: number; y: number; z: number } {
    if (deltaDays !== 0 && this.hasVelocity(pos)) {
      return {
        x: pos.x_au + pos.vx * deltaDays,
        y: pos.y_au + pos.vy * deltaDays,
        z: pos.z_au + pos.vz * deltaDays
      };
    }

    if (deltaDays === 0) {
      return { x: pos.x_au, y: pos.y_au, z: pos.z_au };
    }

    // Fallback : approximation orbitale simple si pas de vx/vy/vz.
    const baseRAu =
      Math.sqrt(
        pos.x_au * pos.x_au +
          pos.y_au * pos.y_au +
          pos.z_au * pos.z_au
      ) || planet.semiMajorAxisAU || 1e-6;

    const orbitalPeriod = planet.orbitalPeriodDays || 365.25;
    const baseAngle = Math.atan2(pos.y_au, pos.x_au);
    const deltaAngle = (2 * Math.PI * deltaDays) / orbitalPeriod;
    const targetAngle = baseAngle + deltaAngle;
    const orbitalRadiusAu = Math.max(baseRAu, planet.semiMajorAxisAU || baseRAu);
    const incRad = (planet.inclinationDeg || 0) * Math.PI / 180;

    return {
      x: orbitalRadiusAu * Math.cos(targetAngle),
      y: orbitalRadiusAu * Math.sin(targetAngle),
      z: pos.z_au + orbitalRadiusAu * Math.sin(incRad) * Math.sin(targetAngle)
    };
  }

  // ---------------------------------------------------------------------------
  // Interaction utilisateur
  // ---------------------------------------------------------------------------

  /**
   * Gestion du clic sur une planète dans le SVG.
   */
  onPlanetClick(planet: Planet): void {
    this.selectedPlanet = planet;
    this.updateSelectionFlags(planet);
  }

  /**
   * Gestion de la fermeture du panneau d’info.
   */
  onCloseInfo(): void {
    this.selectedPlanet = null;

    // Nettoie le flag de sélection visuelle
    this.updateSelectionFlags(null);
  }

  /**
   * Centre et zoome sur la planète sélectionnée.
   */
  centerOnSelected(): void {
    if (!this.selectedPlanet) {
      return;
    }
    this.focusPlanetName = this.selectedPlanet.name;
    this.refreshDisplay();
  }

  clearFocus(): void {
    this.focusPlanetName = null;
    this.refreshDisplay();
  }

  onLegendSelect(planet: Planet): void {
    this.selectedPlanet = planet;
    this.focusPlanetName = planet.name;
    this.updateSelectionFlags(planet);
    this.refreshDisplay();
  }

  get focusedPlanet(): Planet | null {
    if (!this.focusPlanetName) {
      return null;
    }
    return this.planets.find((p) => p.name === this.focusPlanetName) ?? null;
  }

  get averageLatencyMs(): number | null {
    if (this.latencyCount === 0) {
      return null;
    }
    return this.latencySumMs / this.latencyCount;
  }

  private updateSelectionFlags(planet: Planet | null): void {
    this.displayPlanets = this.displayPlanets.map((dp) => ({
      ...dp,
      isSelected: !!planet && dp.planet.name === planet.name
    }));
  }

  /**
   * Libellé de fraîcheur des données (ex: "< 5 min").
   */
  get freshnessLabel(): string | null {
    if (!this.lastUpdateTimestamp) {
      return null;
    }
    const ts = Date.parse(this.lastUpdateTimestamp);
    if (Number.isNaN(ts)) {
      return null;
    }
    const diffMs = Date.now() - ts;
    if (diffMs < 0) {
      return 'à l’instant';
    }
    const diffMin = diffMs / 60000;
    if (diffMin < 1) return '< 1 min';
    if (diffMin < 5) return '< 5 min';
    if (diffMin < 15) return '< 15 min';
    if (diffMin < 60) return `${Math.round(diffMin)} min`;
    const diffH = diffMin / 60;
    if (diffH < 24) return `${diffH.toFixed(1)} h`;
    return `${(diffH / 24).toFixed(1)} j`;
  }
}
