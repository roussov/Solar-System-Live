import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
let PlanetService = class PlanetService {
    constructor() {
        this.planets = [
            {
                name: 'mercury',
                displayName: 'Mercure',
                color: '#b0b0b0',
                radiusKm: 2440,
                massKg: 3.3011e23,
                semiMajorAxisAU: 0.387,
                info: 'Première planète du système solaire, très proche du Soleil.'
            },
            {
                name: 'venus',
                displayName: 'Vénus',
                color: '#e3c16f',
                radiusKm: 6052,
                massKg: 4.8675e24,
                semiMajorAxisAU: 0.723,
                info: 'Planète tellurique à atmosphère dense, effet de serre extrême.'
            },
            {
                name: 'earth',
                displayName: 'Terre',
                color: '#4a90e2',
                radiusKm: 6371,
                massKg: 5.97237e24,
                semiMajorAxisAU: 1.0,
                info: 'Planète tellurique avec eau liquide en surface, seule connue abritant la vie.'
            },
            {
                name: 'mars',
                displayName: 'Mars',
                color: '#c1440e',
                radiusKm: 3389,
                massKg: 6.4171e23,
                semiMajorAxisAU: 1.524,
                info: 'Planète rouge, cible majeure de l’exploration robotique.'
            },
            {
                name: 'jupiter',
                displayName: 'Jupiter',
                color: '#d9b58b',
                radiusKm: 69911,
                massKg: 1.8982e27,
                semiMajorAxisAU: 5.203,
                info: 'Géante gazeuse, planète la plus massive du système solaire.'
            },
            {
                name: 'saturn',
                displayName: 'Saturne',
                color: '#f5deb3',
                radiusKm: 58232,
                massKg: 5.6834e26,
                semiMajorAxisAU: 9.537,
                info: 'Géante gazeuse célèbre pour ses anneaux spectaculaires.'
            },
            {
                name: 'uranus',
                displayName: 'Uranus',
                color: '#9cd6d6',
                radiusKm: 25362,
                massKg: 8.6810e25,
                semiMajorAxisAU: 19.191,
                info: 'Géante de glace, axe de rotation fortement incliné.'
            },
            {
                name: 'neptune',
                displayName: 'Neptune',
                color: '#4f6fff',
                radiusKm: 24622,
                massKg: 1.02413e26,
                semiMajorAxisAU: 30.07,
                info: 'Géante de glace la plus éloignée, vents supersoniques.'
            }
        ];
    }
    getPlanets() {
        return this.planets;
    }
};
PlanetService = __decorate([
    Injectable({ providedIn: 'root' })
], PlanetService);
export { PlanetService };
//# sourceMappingURL=planet.service.js.map