import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
let RealEphemerisService = class RealEphemerisService {
    constructor(http) {
        this.http = http;
        // URL de base de l’API backend Node/Express
        this.baseUrl = 'http://localhost:3000/api/ephemeris';
    }
    getCurrentPlanetPositions() {
        return this.http.get(`${this.baseUrl}/planets`);
    }
};
RealEphemerisService = __decorate([
    Injectable({ providedIn: 'root' })
], RealEphemerisService);
export { RealEphemerisService };
//# sourceMappingURL=real-ephemeris.service.js.map