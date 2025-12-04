import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges
} from '@angular/core';

import { Planet } from '../../models/planet';

@Component({
  selector: 'app-planet-info-panel',
  templateUrl: './planet-info-panel.component.html',
  styleUrls: ['./planet-info-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanetInfoPanelComponent implements OnChanges {
  /**
   * Planète sélectionnée pour l’affichage.
   * Doit être fournie par le parent (SolarSystemComponent).
   */
  @Input() planet!: Planet;

  /**
   * Événement émis lorsque l’utilisateur ferme le panneau.
   */
  @Output() close = new EventEmitter<void>();

  /**
   * Constances physiques de référence (ordre de grandeur).
   * Utilisées pour les valeurs relatives.
   */
  readonly earthRadiusKm = 6371;          // rayon moyen Terre
  readonly earthMassKg = 5.97237e24;      // masse Terre
  readonly auInKm = 149_597_870.7;        // 1 UA ≈ 149 597 870.7 km

  /**
   * Valeurs dérivées pour l’affichage.
   */
  relativeRadiusEarth: number | null = null;
  relativeMassEarth: number | null = null;
  averageDistanceKm: number | null = null;

  /**
   * Déclenché à chaque changement d’@Input (notamment la planète sélectionnée).
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['planet'] && this.planet) {
      this.recalculateDerived();
    }
  }

  /**
   * Recalcule les valeurs dérivées en fonction de la planète courante.
   */
  private recalculateDerived(): void {
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
  get planetTypeLabel(): string {
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
      case 'pluto':
        return 'Planète naine';
      default:
        return 'Planète';
    }
  }

  /**
   * Gestion du clic sur le bouton de fermeture.
   */
  onClose(): void {
    this.close.emit();
  }
}
