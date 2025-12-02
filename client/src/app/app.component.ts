import { Component, ChangeDetectionStrategy } from '@angular/core';

/**
 * Composant racine de l’application Angular.
 *
 * Il encapsule :
 *  - le shell visuel global (header + contenu principal),
 *  - les styles de haut niveau (dans app.component.css),
 *  - et le composant de visualisation du système solaire (<app-solar-system>).
 *
 * Toute la logique métier temps réel (positions planétaires, appels API NASA JPL,
 * etc.) est déléguée aux composants enfants et services spécialisés.
 */
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  // Pas de mutation intensive côté composant racine → OnPush est sûr et efficace.
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  /**
   * Titre logique de l’application (peut être réutilisé pour <title>, meta, etc.).
   * Le template actuel affiche un texte statique, mais cette propriété
   * est prête pour être interpolée si besoin.
   */
  readonly appTitle = 'Système solaire – données réelles (NASA JPL Horizons)';

  /**
   * Tagline / sous-titre global, utilisé pour décrire la philosophie du projet.
   * (optionnel, mais pratique si tu veux l’afficher ou le logguer quelque part).
   */
  readonly appTagline =
    'Visualisation temps réel du système solaire basée sur des éphémérides externes, ' +
    'sans simulation locale arbitraire.';

  /**
   * Version applicative (libre à toi de la synchroniser avec package.json).
   * Utile si tu veux afficher un badge de version dans le header ou le footer.
   */
  readonly appVersion = '0.1.0';
  readonly referenceFrameTooltip =
    'J2000 : repère inertiel centré sur le Soleil à l’époque 2000.0 · ECLIPTIC : plan moyen de l’écliptique.';

  /**
   * Date/heure de chargement du shell Angular.
   * Permet de calculer un uptime approximatif côté client si nécessaire.
   */
  readonly appLoadedAt = new Date();

  /**
   * Année courante (pratique si tu ajoutes un footer type “© YEAR …”).
   */
  get currentYear(): number {
    return new Date().getFullYear();
  }

  /**
   * Uptime approximatif de la session (en secondes).
   * Non utilisé dans le template par défaut, mais prêt si tu veux afficher
   * ou logguer “session active depuis X s”.
   */
  get uptimeSeconds(): number {
    const now = Date.now();
    const start = this.appLoadedAt.getTime();
    return Math.max(0, Math.floor((now - start) / 1000));
  }
}
