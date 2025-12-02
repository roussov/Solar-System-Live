import { __decorate } from "tslib";
import { Component, HostListener } from '@angular/core';
import { interval, startWith, switchMap } from 'rxjs';
let SolarSystemComponent = class SolarSystemComponent {
    constructor(planetService, ephemerisService) {
        this.planetService = planetService;
        this.ephemerisService = ephemerisService;
        /**
         * Métadonnées des 8 planètes (rayon, masse, demi-grand axe…).
         * Fournies par PlanetService (valeurs physiques “moyennes”).
         */
        this.planets = [];
        /**
         * Planète actuellement sélectionnée (pour affichage dans PlanetInfoPanel).
         */
        this.selectedPlanet = null;
        /**
         * Données projetées sur l’écran (positions en pixels) dérivées
         * des éphémérides réelles fournies par le backend.
         */
        this.displayPlanets = [];
        /**
         * Dimensions logiques du SVG (viewBox).
         * Elles peuvent être ajustées sur resize pour rester responsives.
         */
        this.width = 800;
        this.height = 800;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        /**
         * Mode de vue : 2D (vue du dessus) ou 3D (projection oblique).
         * Ne modifie que la projection, pas les coordonnées physiques (X,Y,Z).
         */
        this.viewMode = '2d';
        /**
         * Angle de caméra utilisé en projection 3D (rotation dans le plan Y–Z).
         */
        this.cameraAngleRad = Math.PI / 6; // ≈ 30°
        /**
         * Longueur (en pixels) correspondant à 1 UA dans l’échelle radiale compressée.
         * Affichée dans la barre d’échelle.
         */
        this.oneAuPixels = 0;
        /**
         * Valeur max du demi-grand axe (en UA) parmi les planètes.
         * Sert de référence pour compresser l’échelle radiale (Neptune ~ max).
         */
        this.maxSemiMajorAxisAu = 30.1; // valeur par défaut, réajustée en ngOnInit
        /**
         * Dernier snapshot d’éphémérides reçu (positions réelles).
         * Permet de recalculer l’affichage sur changement de mode ou resize
         * sans réinterroger le backend.
         */
        this.lastSnapshot = null;
        /**
         * Indicateur de chargement (optionnel, au cas où tu veux l’exploiter dans le template).
         */
        this.isLoading = false;
        /**
         * Message d’erreur éventuel lors de l’appel au backend.
         */
        this.errorMessage = null;
        /**
         * Timestamp de la dernière mise à jour (vient du backend).
         */
        this.lastUpdateTimestamp = null;
    }
    // ---------------------------------------------------------------------------
    // Cycle de vie
    // ---------------------------------------------------------------------------
    ngOnInit() {
        this.planets = this.planetService.getPlanets();
        // Détermine le plus grand demi-grand axe pour l’échelle
        this.maxSemiMajorAxisAu =
            this.planets.reduce((max, p) => (p.semiMajorAxisAU > max ? p.semiMajorAxisAU : max), 0) || 30.1;
        // Initialisation des dimensions (responsive basique)
        this.updateDimensionsFromWindow();
        this.oneAuPixels = this.distanceToPixels(1);
        // Mise à jour périodique des éphémérides (toutes les 60 s, avec un tir initial)
        this.ephemerisSub = interval(60_000)
            .pipe(startWith(0), switchMap(() => {
            this.isLoading = true;
            this.errorMessage = null;
            return this.ephemerisService.getCurrentPlanetPositions();
        }))
            .subscribe({
            next: (snapshot) => {
                this.isLoading = false;
                this.lastSnapshot = snapshot;
                this.lastUpdateTimestamp = snapshot.timestamp || new Date().toISOString();
                this.updateDisplayFromSnapshot(snapshot);
            },
            error: (err) => {
                this.isLoading = false;
                console.error('Erreur éphémérides:', err);
                this.errorMessage =
                    'Erreur lors de la récupération des positions réelles des planètes.';
            }
        });
    }
    ngOnDestroy() {
        this.ephemerisSub?.unsubscribe();
    }
    // ---------------------------------------------------------------------------
    // Gestion de la fenêtre (responsivité)
    // ---------------------------------------------------------------------------
    onWindowResize() {
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
    updateDimensionsFromWindow() {
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
    distanceToPixels(au) {
        if (au <= 0) {
            return 0;
        }
        const maxRadiusPx = Math.min(this.width, this.height) / 2 - 40;
        const maxAu = this.maxSemiMajorAxisAu || 30.1;
        // Compression radiale : sqrt(au / maxAu) * rayon_max
        const normalized = Math.sqrt(au / maxAu);
        return normalized * maxRadiusPx;
    }
    /**
     * Rayon visuel des planètes en pixels (tres compressé pour les géantes).
     * Ici, on reste arbitraire sur le "style", mais toujours déterministe.
     */
    planetRadiusToPixels(planet) {
        const base = 4;
        const scale = 0.0005;
        return base + planet.radiusKm * scale;
    }
    /**
     * Rayon visuel des orbites, basé directement sur le demi-grand axe en UA.
     */
    getOrbitRadiusPx(planet) {
        return this.distanceToPixels(planet.semiMajorAxisAU);
    }
    /**
     * Changement de mode de vue (2D vs 3D).
     * On ne change que la projection, pas les données physiques.
     */
    setViewMode(mode) {
        if (this.viewMode === mode) {
            return;
        }
        this.viewMode = mode;
        // Si on dispose déjà d’un snapshot, on recalcule l’affichage
        if (this.lastSnapshot) {
            this.updateDisplayFromSnapshot(this.lastSnapshot);
        }
    }
    // ---------------------------------------------------------------------------
    // Rendu à partir des éphémérides réelles
    // ---------------------------------------------------------------------------
    /**
     * Met à jour les positions affichées à partir d’un snapshot d’éphémérides.
     * Les coordonnées (x, y, z) sont interprétées comme héliocentriques en UA.
     */
    updateDisplayFromSnapshot(snapshot) {
        if (!snapshot || !snapshot.bodies || snapshot.bodies.length === 0) {
            this.displayPlanets = [];
            return;
        }
        const positionsByName = new Map();
        for (const body of snapshot.bodies) {
            positionsByName.set(body.name, body);
        }
        const display = [];
        for (const planet of this.planets) {
            const pos = positionsByName.get(planet.name);
            if (!pos) {
                continue;
            }
            const rAu = Math.sqrt(pos.x_au * pos.x_au +
                pos.y_au * pos.y_au +
                pos.z_au * pos.z_au) || 1e-6;
            const rPx = this.distanceToPixels(rAu);
            let xScreen;
            let yScreen;
            if (this.viewMode === '2d') {
                // Vue du dessus : projection dans le plan (x, y)
                const angle = Math.atan2(pos.y_au, pos.x_au);
                xScreen = this.centerX + rPx * Math.cos(angle);
                yScreen = this.centerY + rPx * Math.sin(angle);
            }
            else {
                // Vue pseudo-3D : même position physique (x, y, z),
                // projection oblique autour de l’axe X.
                const factor = rPx / rAu;
                const x = pos.x_au * factor;
                const y = pos.y_au * factor;
                const z = pos.z_au * factor;
                const phi = this.cameraAngleRad;
                const yProj = y * Math.cos(phi) - z * Math.sin(phi);
                // zProj = y * Math.sin(phi) + z * Math.cos(phi); // utilisable pour un z-index
                xScreen = this.centerX + x;
                yScreen = this.centerY + yProj;
            }
            display.push({
                planet,
                x: xScreen,
                y: yScreen,
                rAu,
                isSelected: !!this.selectedPlanet && this.selectedPlanet.name === planet.name
            });
        }
        this.displayPlanets = display;
    }
    // ---------------------------------------------------------------------------
    // Interaction utilisateur
    // ---------------------------------------------------------------------------
    /**
     * Gestion du clic sur une planète dans le SVG.
     */
    onPlanetClick(planet) {
        this.selectedPlanet = planet;
        // Marque visuellement la planète sélectionnée (si tu veux exploiter .selected en CSS)
        this.displayPlanets = this.displayPlanets.map((dp) => ({
            ...dp,
            isSelected: dp.planet.name === planet.name
        }));
    }
    /**
     * Gestion de la fermeture du panneau d’info.
     */
    onCloseInfo() {
        this.selectedPlanet = null;
        // Nettoie le flag de sélection visuelle
        this.displayPlanets = this.displayPlanets.map((dp) => ({
            ...dp,
            isSelected: false
        }));
    }
};
__decorate([
    HostListener('window:resize')
], SolarSystemComponent.prototype, "onWindowResize", null);
SolarSystemComponent = __decorate([
    Component({
        selector: 'app-solar-system',
        templateUrl: './solar-system.component.html',
        styleUrls: ['./solar-system.component.css']
    })
], SolarSystemComponent);
export { SolarSystemComponent };
//# sourceMappingURL=solar-system.component.js.map