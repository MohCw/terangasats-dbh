# Choix de l'IA du vérificateur

## Test de Laya (tâche B0b), 11 novembre 2026

Laya 0.4.30, modèle `multilingual` (révision 85cc74d), CPU, 2 threads. Lancé avec `laya-serve` dans un venv : Docker Desktop n'était pas démarré sur la machine de test.

### Forme de la réponse

`POST /v1/systemone` avec `{ model: "multilingual", state: { sms }, questions }` renvoie :

```json
{ "model": "laya-rl-agent",
  "answers": {
    "verdict": { "type": "choice", "choice": "arnaque",
                 "probabilities": { "arnaque": 1.0, "a_verifier": 0.0, "aucun_signe": 0.0 },
                 "confidence": 1.0 } } }
```

Une question `noul` renvoie `{ "type": "noul", "noul": <probabilité du oui> }`.

### Mesures

- Temps de réponse : environ 2,4 s pour une question, environ 3,7 s pour quatre (CPU portable).
- Mémoire du serveur : environ 1,4 Go une fois le modèle chargé.
- Premier démarrage : téléchargement du modèle en environ 1 min 40.

### Résultats sur 10 SMS masqués (5 légitimes, 5 arnaques)

| Formulation | Arnaques détectées | Légitimes classés « arnaque » | Sensés |
|---|---|---|---|
| Consignes du plan (français, 3 questions oui/non) | 5/5 | 4/5 | 6/10 |
| Français court | 3/5 | 1/5 | 7/10 |
| **Anglais, critères concrets (retenu)** | 4/5 (et 1 en « à vérifier ») | 0/5 | **8/10** |

Le seul raté de la formulation retenue est « Vous avez reçu 250000F... Livrez la marchandise », classé `aucun_signe` à 0,86.

Les questions oui/non (`code_requested`, `amount_inconsistent`, `reference_suspicious`) ne sont pas fiables : elles valent 1,0 sur des reçus légitimes, en français comme en anglais.

### Décision

- **On garde Laya** (8/10, au-dessus du seuil de 7), **pour le verdict seulement**, avec la formulation anglaise.
- **Questions oui/non abandonnées.** Les raisons affichées viennent des règles locales. Quand Laya décide, une phrase fixe est affichée selon le verdict.
- **Seuils :** `arnaque` ≥ 0,6 ; `aucun_signe` ≥ 0,9 (le raté ci-dessus, à 0,86, devient « À vérifier ») ; sinon `a_verifier`.
- **Délai d'appel : 8 s** au lieu de 5 s, vu les 2,4 s mesurées sur CPU.
- Le modèle est mal calibré (probabilités 0 ou 1 qui changent avec la formulation) : le jeu de 60 messages (B6) dira si ça tient.

## Remplacement par Cloudflare Workers AI (14 novembre 2026)

Laya demandait un conteneur de 1,4 Go allumé en permanence (environ 15 à 20 $ par mois sur Railway, impossible sur Netlify). Comparaison sur le jeu de test (`npm run eval`), même prompt pour les modèles Workers AI :

| IA | Arnaques classées « arnaque » | Arnaques classées « aucun signe » | Fausses alertes |
|---|---|---|---|
| Laya multilingual | 17/30 | 2 | 3 % |
| Llama 3.1 8B | 17/30 | 8 | 0 % |
| Llama 3.3 70B | 22/30 | 8 | 0 % |
| **Llama 3.3 70B, jamais « aucun signe »** | **22/30** | **0** | **0 %** |

Gemma 3 12B : non disponible sur un compte gratuit. Qwen3 30B : réponse vide (raisonnement plus long que la limite de jetons).

Les 8 arnaques classées « aucun signe » sont des faux transferts recopiés sur de vrais reçus : aucun modèle ne peut les distinguer par le texte. Décision : l'IA peut signaler une arnaque, jamais rassurer (`core/decide.ts`). Laya est retiré du projet.
