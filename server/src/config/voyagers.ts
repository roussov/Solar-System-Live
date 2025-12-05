export interface VoyagerConfig {
  id: 'voyager1' | 'voyager2';
  displayName: string;
  horizonsId: string;
}

// Identifiants NAIF/Horizons des sondes Voyager
export const VOYAGERS: VoyagerConfig[] = [
  { id: 'voyager1', displayName: 'Voyager 1', horizonsId: '-31' },
  { id: 'voyager2', displayName: 'Voyager 2', horizonsId: '-32' }
];
