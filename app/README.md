# TerangaSats — application (Plan A)

## Variables d'environnement
| Variable | Rôle |
|---|---|
| `VITE_BREEZ_API_KEY` | clé d'API Breez (dans `.env.local`) |
| `VITE_VERIFIER_URL` | adresse HTTPS du vérificateur (Plan B), défaut `http://localhost:8787` |

## Lancer
```bash
cd app && npm ci && npm run dev      # développement
npx vitest run                       # tests
npm run size                         # build + budget de poids (< 300 Ko gzip hors wallet)
```

## Démonstration à deux onglets
1. Onglet 1 : `http://localhost:5173/?demo=1#/vendeur` → saisir « Mocassins, 42 » et « 16 500 », « Créer le lien ».
2. Onglet 2 : coller le lien, ou cliquer « Encaisser ici ».
3. Scène 1 : « Simuler le paiement du client » → « Payé » et délai en ms.
4. Scène 2 : « Tester un faux écran » → « Confirmation refusée ».
5. Scène 3 : accueil → « J'ai reçu un SMS » (vérificateur du Plan B).

## Mesures (à remplir)
- Poids premier chargement : ____ Ko gzip (`npm run size`)
- Délai paiement réel → « Payé » : ____ s
- Adresse publique : ____
