import { __decorate } from "tslib";
import { NgModule, LOCALE_ID } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { AppComponent } from './app.component';
import { SolarSystemComponent } from './components/solar-system/solar-system.component';
import { PlanetInfoPanelComponent } from './components/planet-info-panel/planet-info-panel.component';
/**
 * Enregistrement de la locale française pour le formatting
 * des nombres, dates, etc. (pipes Angular : number, date…).
 */
registerLocaleData(localeFr);
/**
 * Module racine de l’application.
 *
 * Rôle :
 *  - déclarer les composants principaux (shell + visualisation + panneau d’info),
 *  - importer les modules Angular de base (BrowserModule, HttpClientModule),
 *  - configurer la locale globale (fr-FR),
 *  - définir le composant bootstrappé (AppComponent).
 */
let AppModule = class AppModule {
};
AppModule = __decorate([
    NgModule({
        /**
         * Composants, directives et pipes appartenant à ce module.
         */
        declarations: [
            AppComponent, // Composant racine (shell global + header)
            SolarSystemComponent, // Vue du système solaire (SVG, 2D/3D, éphémérides)
            PlanetInfoPanelComponent // Panneau d’informations pour la planète sélectionnée
        ],
        /**
         * Modules importés – ils fournissent des fonctionnalités supplémentaires
         * (rendu dans le navigateur, HTTP, formulaires, routing, etc.).
         */
        imports: [
            BrowserModule, // Nécessaire pour toutes les applications web Angular
            HttpClientModule // Nécessaire pour les appels API au backend JPL Horizons
        ],
        /**
         * Services et valeurs injectables disponibles à l’échelle du module.
         * Ici, on force la locale à 'fr-FR' pour toute l’application.
         */
        providers: [
            {
                provide: LOCALE_ID,
                useValue: 'fr-FR'
            }
        ],
        /**
         * Composant racine à démarrer au lancement de l’application.
         */
        bootstrap: [AppComponent]
    })
], AppModule);
export { AppModule };
//# sourceMappingURL=app.module.js.map