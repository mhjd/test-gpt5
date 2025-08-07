# Benchmark multi‑projets de GPT‑5 avec Cursor

Ce dépôt sert à réaliser plusieurs projets pour évaluer GPT‑5 (dans Cursor) sur des cas variés. L’objectif est d’observer la qualité, l’autonomie, le coût, la vitesse et la robustesse de l’assistant, puis de produire un rapport final consolidé à partir de ce README.

## Principe

- Plusieurs projets aux domaines et complexités différentes (ex. UI/CRUD, 3D, règles métier, perf, accessibilité).
- Même environnement de travail autant que possible pour rendre les résultats comparables.
- Pour chaque projet: un protocole, des critères d’acceptation, un suivi des prompts/erreurs, des métriques chiffrées et une synthèse.

## Constance expérimentale (à garder identique autant que possible)

- **OS**: macOS `darwin 24.5.0`
- **IDE**: Cursor
- **Modèle**: GPT‑5 (même version), paramètres par défaut sauf mention
- **Température/Top‑p**: par défaut (noter tout changement)
- **Extensions/outillage**: même set d’extensions Cursor; même outils de build
- **Réseau**: connexion stable, éviter VPN non déterministe
- **Node/paquets**: même version de Node; lockfiles commités

## Tableau de bord des projets

Ce tableau liste tous les projets et leur état. Ajouter une ligne par projet.

| ID | Nom | Domaine | Taille (T‑shirt) | Tech | Dossier | Statut |
|---:|-----|---------|------------------|------|---------|--------|
| 1 | 3d‑game (échecs) | 3D, règles | L | Vite, Three.js, JS | `3d-game/` | En cours |
| 2 | genealogical‑tree | UI/CRUD | M | Vite/React (prévu), JSON | `genealogical-tree/` | À faire |

Astuce: dupliquer ce README pour d’autres dépôts si besoin. Ici, on consolide tous les projets.

## Méthodologie commune

1. Lire la spécification du projet.
2. Établir ou reprendre des critères d’acceptation clairs.
3. Lancer le développement avec GPT‑5 dans Cursor, en limitant les interventions humaines aux corrections nécessaires.
4. Répertorier les prompts clés et les corrections (tableaux ci‑dessous).
5. Mesurer et noter les métriques (qualité, autonomie, coût, temps, perf, accessibilité, sécurité).
6. Produire une synthèse par projet (forces/faiblesses, échec/réussite des critères) et une note composite.

### Variables contrôlées vs libres

- **Contrôlées**: modèle, IDE, versions, outillage, protocole, critères minimaux.
- **Libres**: style de prompting, découpage des tâches, architecture (sauf contrainte du SPEC).

### Critères d’acceptation génériques

- Build et démarrage sans erreur.
- Fonctionnalités du SPEC atteintes (MVP) et testables par un humain.
- Pas de régression bloquante sur le chemin critique utilisateur.
- Pour UI/web: score Lighthouse Performance > 70 (à ajuster par projet), aucun blocant d’accessibilité.

## Métriques par projet (à remplir)

Utiliser le tableau suivant pour chaque projet. Un onglet/section par projet est recommandé.

| Projet | Prompts totaux | Interventions humaines | Itérations pour corriger erreurs | Temps total (h) | Temps IA (h) | Temps humain (h) | Coût tokens (in/out) | Erreurs build/test (nb) | Bugfix post‑livraison (nb) | Lint errors (nb) | Coverage (%) | Perf (FPS/LH) | Bundle size | Vuln. deps (crit.) | Hallucinations (nb) | Fidélité au SPEC (%) | Satisfaction (1‑5) |
|--------|-----------------|------------------------|----------------------------------|-----------------|--------------|------------------|-----------------------|-------------------------|----------------------------|------------------|-------------|---------------|-------------|--------------------|---------------------|----------------------|-------------------|
| 3d‑game | | | | | | | | | | | | | | | | | |
| genealogical‑tree | | | | | | | | | | | | | | | | | |

Notes: « Interventions humaines » = nombre d’actions non triviales pour débloquer l’IA (ex: préciser un chemin, corriger une API, redresser une mauvaise compréhension). « Hallucinations » = affirmations/outils/fichiers inexistants.

## Journal d’erreurs et corrections (par projet)

Tenir un tableau par projet pour tracer les problèmes significatifs et l’effort de correction.

| Date | Type (build/runtime/logique/UI/perf/sécu) | Symptôme | Cause racine | Prompt correctif (résumé) | Itérations | Durée | Impact |
|------|-------------------------------------------|---------|--------------|---------------------------|-----------:|-------|--------|
| | | | | | | | |

## Log de prompts (optionnel, anonymisé)

Si utile, consigner les prompts/réponses clés (IDs, résumé, résultat), sans données sensibles.

| Étape | Prompt (résumé) | Réponse (résumé) | Résultat | Liens/commits |
|------:|------------------|------------------|----------|---------------|
| 1 | | | | |

## Stratégies de prompting utilisées et efficacité

- Plan puis exécution incrémentale
- Contraintes explicites (dossiers/fichiers, API, limites)
- Tests d’abord (red/green)
- Edits ciblés avec diffs
- Décomposition en sous‑tâches parallélisables
- Réutilisation de gabarits/codes existants
- Validation automatique (lint/tests/build) après chaque étape

Pour chaque stratégie: noter l’impact perçu sur la qualité, le temps, et l’autonomie.

## Qualité de code et vérifications

- Lint/format: ESLint/Prettier (zero‑warning visé)
- Typage: TypeScript strict si applicable
- Complexité: fonctions courtes, noms explicites, séparation des responsabilités
- Tests: couverture minimale convenue, tests unitaires sur logique métier/règles
- Architecture: modules clairs (`rules/`, `render/`, `ui/`, etc. pour 3d‑game)

## Performance et accessibilité (selon projet)

- 3D (3d‑game): 60 FPS visé desktop, draw calls < 200, textures ≤ 1K, pas de post‑processing coûteux par défaut
- Web UI (genealogical‑tree): Lighthouse Performance/Accessibility ≥ objectifs, interactions fluides, focus visible, contrastes suffisants

## Sécurité et conformité

- Dépendances sans vulnérabilité critique
- Pas d’exfiltration de données sensibles
- Entrées utilisateur contrôlées/sanitized

## Reproductibilité

- Versions (Node, package manager), lockfiles commités
- Commandes standardisées: install, dev, build, test
- SHA de commit et tag de release

## Synthèse et scoring comparatif

Attribuer un score composite par projet (0–100) selon des pondérations.

| Axe | Poids | Score (0–100) | Pondéré |
|-----|------:|--------------:|--------:|
| Livraison (critères, stabilité) | 30% | | |
| Qualité (tests, lint, bugs) | 25% | | |
| Autonomie (interventions/prompt efficiency) | 20% | | |
| Coût (tokens + temps) | 15% | | |
| UX/Perf/Accessibilité | 10% | | |
| Total | 100% | | |

Commentaire libre: points forts, points faibles, risques, axes d’amélioration.

## Procédure rapide pour un nouveau projet

1) Créer un dossier `nouveau-projet/` avec un `SPEC.md` clair
2) Ajouter une ligne dans « Tableau de bord des projets »
3) Démarrer l’implémentation avec GPT‑5 et tracer prompts/erreurs
4) Renseigner les métriques et le journal
5) Évaluer avec le scoring

## Fiches projet (exemples)

### 3d‑game (échecs)

- SPEC: `3d-game/SPEC.md`
- Critères spécifiques: règles FIDE, roque/promo/e.p., notation algébrique, 60 FPS desktop
- Mesures clés: FPS moyen, draw calls, erreurs de règles détectées par tests
- Commandes: `npm i`, `npm run dev`, `npm run build`

### genealogical‑tree

- SPEC: `genealogical-tree/SPEC.md`
- Critères spécifiques: CRUD JSON, édition inline/modale, 3 niveaux, clarté visuelle
- Mesures clés: score Lighthouse, fluidité interactions, erreurs d’édition
- Commandes: à définir selon stack (ex. Vite/React)

## Annexes

- Liens vers SPEC des projets
- Logs anonymisés (si conservés)
- Captures d’écran/vidéos de démonstration

---

Historique initial: intention de lister, en fin d’implémentation de chaque démo, toutes les erreurs signalées par l’utilisateur et le nombre de prompts nécessaires pour les corriger (voir « Journal d’erreurs et corrections » ci‑dessus).
