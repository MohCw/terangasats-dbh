# Mesure du vérificateur

Jeu : 63 messages (30 arnaques, 33 légitimes), dont 3 SMS réels masqués, les autres **reconstitués** (voir `dataset/build.py`). IA : Workers AI @cf/meta/llama-3.3-70b-instruct-fp8-fast. Erreurs d'appel : 0.

| | Arnaques détectées (≠ aucun signe) | Arnaques classées « arnaque » | Fausses alertes (légitime → arnaque) | Légitimes « aucun signe » |
|---|---|---|---|---|
| Règles seules | 100 % | 12/30 | 0 % | 0/33 |
| Règles + IA | 100 % | 22/30 | 0 % | 0/33 |

Avec les règles seules, tout message non tranché vaut « à vérifier » : la détection est donc à 100 % par construction, et la colonne utile est « Arnaques classées arnaque ». L'IA ne peut que lever l'alerte (jamais « aucun signe », voir `core/decide.ts`) : la détection reste donc à 100 %, et l'apport de l'IA se lit dans « Arnaques classées arnaque ».

| id | type | expéditeur | règles seules | règles + IA | source |
|---|---|---|---|---|---|
| R01 | legitime | OrangeMoney | a_verifier | a_verifier | ia |
| R02 | legitime | OrangeMoney | a_verifier | a_verifier | ia |
| R03 | legitime | Wave | a_verifier | a_verifier | ia |
| L01 | legitime | OrangeMoney | a_verifier | a_verifier | ia |
| L02 | legitime | OrangeMoney | a_verifier | a_verifier | ia |
| L03 | legitime | OrangeMoney | a_verifier | a_verifier | ia |
| L04 | legitime | OrangeMoney | a_verifier | a_verifier | ia |
| L05 | legitime | OrangeMoney | a_verifier | a_verifier | ia |
| L06 | legitime | OrangeMoney | a_verifier | a_verifier | ia |
| L07 | legitime | OrangeMoney | a_verifier | a_verifier | ia |
| L08 | legitime | OrangeMoney | a_verifier | a_verifier | ia |
| L09 | legitime | OrangeMoney | a_verifier | a_verifier | ia |
| L10 | legitime | OrangeMoney | a_verifier | a_verifier | ia |
| L11 | legitime | Wave | a_verifier | a_verifier | ia |
| L12 | legitime | Wave | a_verifier | a_verifier | ia |
| L13 | legitime | Wave | a_verifier | a_verifier | ia |
| L14 | legitime | Wave | a_verifier | a_verifier | ia |
| L15 | legitime | Wave | a_verifier | a_verifier | ia |
| L16 | legitime | Wave | a_verifier | a_verifier | ia |
| L17 | legitime | Wave | a_verifier | a_verifier | ia |
| L18 | legitime | Wave | a_verifier | a_verifier | ia |
| L19 | legitime | Wave | a_verifier | a_verifier | ia |
| L20 | legitime | Wave | a_verifier | a_verifier | ia |
| L21 | legitime | FreeMoney | a_verifier | a_verifier | ia |
| L22 | legitime | FreeMoney | a_verifier | a_verifier | ia |
| L23 | legitime | FreeMoney | a_verifier | a_verifier | ia |
| L24 | legitime | — | a_verifier | a_verifier | ia |
| L25 | legitime | — | a_verifier | a_verifier | ia |
| L26 | legitime | — | a_verifier | a_verifier | ia |
| L27 | legitime | — | a_verifier | a_verifier | ia |
| L28 | legitime | — | a_verifier | a_verifier | ia |
| L29 | legitime | — | a_verifier | a_verifier | ia |
| L30 | legitime | — | a_verifier | a_verifier | ia |
| F01 | faux_transfert | [NUMERO] | arnaque | arnaque | regles |
| F02 | faux_transfert | [NUMERO] | arnaque | arnaque | regles |
| F03 | faux_transfert | [NUMERO] | arnaque | arnaque | regles |
| F04 | faux_transfert | OrangeMoney | a_verifier | a_verifier | ia |
| F05 | faux_transfert | OrangeMoney | a_verifier | a_verifier | ia |
| F06 | faux_transfert | Wave | a_verifier | arnaque | ia |
| F07 | faux_transfert | — | a_verifier | arnaque | ia |
| F08 | faux_transfert | — | a_verifier | a_verifier | ia |
| F09 | faux_transfert | — | a_verifier | arnaque | ia |
| F10 | faux_transfert | — | a_verifier | a_verifier | ia |
| F11 | faux_transfert | — | a_verifier | a_verifier | ia |
| F12 | faux_transfert | — | a_verifier | a_verifier | ia |
| F13 | faux_transfert | — | a_verifier | a_verifier | ia |
| F14 | faux_transfert | — | a_verifier | arnaque | ia |
| F15 | faux_transfert | — | a_verifier | a_verifier | ia |
| D01 | depot_erreur | [NUMERO] | arnaque | arnaque | regles |
| D02 | depot_erreur | [NUMERO] | arnaque | arnaque | regles |
| D03 | depot_erreur | [NUMERO] | arnaque | arnaque | regles |
| D04 | depot_erreur | — | a_verifier | arnaque | ia |
| D05 | depot_erreur | — | arnaque | arnaque | regles |
| D06 | depot_erreur | — | arnaque | arnaque | regles |
| D07 | depot_erreur | — | a_verifier | arnaque | ia |
| D08 | depot_erreur | — | arnaque | arnaque | regles |
| D09 | depot_erreur | — | a_verifier | arnaque | ia |
| D10 | depot_erreur | — | a_verifier | arnaque | ia |
| D11 | depot_erreur | — | arnaque | arnaque | regles |
| D12 | depot_erreur | OrangeMoney | a_verifier | arnaque | ia |
| D13 | depot_erreur | Wave | arnaque | arnaque | regles |
| D14 | depot_erreur | — | a_verifier | arnaque | ia |
| D15 | depot_erreur | — | arnaque | arnaque | regles |
