# Solar System Real – Angular + Node + NASA JPL Horizons

Projet de démonstration pour visualiser en temps réel la position des 8 planètes
du système solaire autour du Soleil, en se basant sur des éphémérides réelles
(NASA JPL Horizons, via une API Node/Express), et non sur une simulation locale.

## Structure

- `client/` : Application Angular (affichage 2D/3D, clic sur les planètes, panneau d’infos).
- `server/` : API Node/Express qui interroge l’API REST JPL Horizons et renvoie
  les vecteurs de position héliocentriques (X, Y, Z) en unités astronomiques.

## Pré-requis

- Node.js LTS
- npm ou pnpm
- Accès Internet pour interroger `https://ssd-api.jpl.nasa.gov/horizons.api`

## Installation

```bash
# Backend
cd server
npm install
npm run dev     # démarre l’API sur http://localhost:3000

# Frontend
cd ../client
npm install
npm start       # démarre l’app Angular sur http://localhost:4200
```

Le frontend est configuré pour appeler l’API backend à l’URL
`http://localhost:3000/api/ephemeris/planets`. Ajustez si besoin.

## Avertissement

Le code d’exemple du client Horizons (`horizonsClient.ts`) suit la structure
actuelle de l’API JPL Horizons, mais certains paramètres ou formats de date
peuvent évoluer. Vérifiez toujours la documentation officielle de
`https://ssd-api.jpl.nasa.gov/doc/horizons.html` si vous rencontrez une erreur.
