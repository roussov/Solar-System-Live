import 'zone.js'; // Required for Angular change detection / NgZone
import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

/**
 * Active le mode production si l’application est buildée
 * avec la configuration `production` d’Angular.
 *
 * Cela désactive certaines vérifications de debug et
 * améliore les performances en runtime.
 */
if (environment.production) {
  enableProdMode();
}

/**
 * Fonction de bootstrap encapsulée pour faciliter :
 *  - l’ajout de logs,
 *  - un éventuel Hot Module Replacement,
 *  - une meilleure gestion des erreurs.
 */
function bootstrap(): Promise<void> {
  return platformBrowserDynamic()
    .bootstrapModule(AppModule)
    .then(() => {
      if (!environment.production) {
        // Log informatif uniquement en dev
        console.log(
          '[SolarSystemLive] Angular bootstrap terminé – environnement de développement.'
        );
      }
    });
}

// Bootstrap standard avec gestion d’erreur centralisée
bootstrap().catch((err) => {
  // Log minimal côté console (tu peux router ça vers un service de log si besoin)
  // eslint-disable-next-line no-console
  console.error('[SolarSystemLive] Erreur pendant le bootstrap Angular :', err);
});

/**
 * (Optionnel) Support basique du Hot Module Replacement (HMR)
 * si tu l’actives dans ta config de build / dev-server.
 *
 * À activer uniquement si tu as configuré HMR côté Angular/CLI.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if ((module as any).hot) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  (module as any).hot.accept();
}
