import { __decorate } from "tslib";
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
let PlanetInfoPanelComponent = class PlanetInfoPanelComponent {
    constructor() {
        /**
         * Événement émis lorsque l’utilisateur ferme le panneau.
         */
        this.close = new EventEmitter();
        /**
         * Constances physiques de référence (ordre de grandeur).
         * Utilisées pour les valeurs relatives.
         */
        this.earthRadiusKm = 6371; // rayon moyen Terre
        this.earthMassKg = 5.97237e24; // masse Terre
        this.auInKm = 149_597_870.7; // 1 UA ≈ 149 597 870.7 km
        /**
         * Valeurs dérivées pour l’affichage.
         */
        this.relativeRadiusEarth = null;
        this.relativeMassEarth = null;
        this.averageDistanceKm = null;
    }
    /**
     * Déclenché à chaque changement d’@Input (notamment la planète sélectionnée).
     */
    ngOnChanges(changes) {
        if (changes['planet'] && this.planet) {
            this.recalculateDerived();
        }
    }
    /**
     * Recalcule les valeurs dérivées en fonction de la planète courante.
     */
    recalculateDerived() {
        if (!this.planet) {
            this.relativeRadiusEarth = null;
            this.relativeMassEarth = null;
            this.averageDistanceKm = null;
            return;
        }
        this.relativeRadiusEarth = this.planet.radiusKm / this.earthRadiusKm;
        this.relativeMassEarth = this.planet.massKg / this.earthMassKg;
        this.averageDistanceKm = this.planet.semiMajorAxisAU * this.auInKm;
    }
    /**
     * Type de planète (description textuelle simple).
     * Utile si tu veux l’exploiter dans le template (chip, tooltip, etc.).
     */
    get planetTypeLabel() {
        const name = this.planet?.name;
        switch (name) {
            case 'mercury':
            case 'venus':
            case 'earth':
            case 'mars':
                return 'Planète tellurique';
            case 'jupiter':
            case 'saturn':
                return 'Géante gazeuse';
            case 'uranus':
            case 'neptune':
                return 'Géante de glace';
            default:
                return 'Planète';
        }
    }
    /**
     * Gestion du clic sur le bouton de fermeture.
     */
    onClose() {
        this.close.emit();
    }
};
__decorate([
    Input()
], PlanetInfoPanelComponent.prototype, "planet", void 0);
__decorate([
    Output()
], PlanetInfoPanelComponent.prototype, "close", void 0);
PlanetInfoPanelComponent = __decorate([
    Component({
        selector: 'app-planet-info-panel',
        templateUrl: './planet-info-panel.component.html',
        styleUrls: ['./planet-info-panel.component.css'],
        changeDetection: ChangeDetectionStrategy.OnPush
    })
], PlanetInfoPanelComponent);
export { PlanetInfoPanelComponent };
//# sourceMappingURL=planet-info-panel.component.js.map