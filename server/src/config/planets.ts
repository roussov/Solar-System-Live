export type PlanetName =
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto';

export interface PlanetConfig {
  name: PlanetName;
  displayName: string;
  horizonsId: string;
}

export const PLANETS: PlanetConfig[] = [
  { name: 'mercury', displayName: 'Mercure',  horizonsId: '199' },
  { name: 'venus',   displayName: 'Vénus',    horizonsId: '299' },
  { name: 'earth',   displayName: 'Terre',    horizonsId: '399' },
  { name: 'mars',    displayName: 'Mars',     horizonsId: '499' },
  { name: 'jupiter', displayName: 'Jupiter',  horizonsId: '599' },
  { name: 'saturn',  displayName: 'Saturne',  horizonsId: '699' },
  { name: 'uranus',  displayName: 'Uranus',   horizonsId: '799' },
  { name: 'neptune', displayName: 'Neptune',  horizonsId: '899' },
  { name: 'pluto',   displayName: 'Pluton',   horizonsId: '999' }
];
