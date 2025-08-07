## Spécification fonctionnelle et technique — Arbre généalogique (UI/CRUD)

### Vision
Proposer une application web simple et claire pour visualiser un arbre généalogique sur jusqu’à 3 niveaux autour d’une personne racine, avec édition directe des personnes (nom, prénom, photo) et gestion CRUD basique des liens familiaux.

### Objectifs
- **Clarté visuelle**: navigation fluide, lisible sur desktop, disposition en niveaux (générations) avec traits de liaison.
- **Édition rapide**: édition inline via modal sur chaque fiche personne; ajout/suppression de liens courants (parent, enfant, fratrie, partenaire).
- **Données simples**: modèle JSON lisible et exportable/importable.
- **Déploiement statique**: fonctionne en site statique; persistance locale par `localStorage` + import/export JSON.

### Portée (scope)
- **MVP inclus**:
  - Vue arbre jusqu’à 3 niveaux autour d’une personne racine sélectionnée.
  - Modes: « Ascendants » ou « Descendants » (profondeur paramétrable 1–3, défaut 3).
  - Cartes personne: photo (URL), prénom, nom, bouton « Éditer » en haut à droite.
  - CRUD personnes: créer/éditer/supprimer; opérations de liens: ajouter parent, enfant, frère/sœur, partenaire.
  - Importer un fichier JSON et Exporter l’état courant en JSON; bouton « Réinitialiser » vers les données seed.
  - Mise en page responsive (≥1024px optimisé; ≥768px acceptable, mobile best-effort).
- **Hors périmètre initial** (potentiellement plus tard):
  - Dates/lieux, sources, métiers, notes étendues.
  - Détection avancée d’incohérences généalogiques (âges impossibles, cycles complexes).
  - Multi-utilisateur / backend persistant / synchronisation cloud.

### Plateformes cibles
- Navigateurs desktop modernes (Chrome, Firefox, Edge, Safari), dernière et avant-dernière versions.
- Mobile/tablette non prioritaire (lecture OK, édition best-effort).

### Pile technique
- **Langage**: TypeScript strict.
- **Framework**: React (Vite).
- **Tests**: Vitest + React Testing Library.
- **Style**: CSS modules ou Tailwind (au choix), focus visible, contrastes suffisants.

### Données et schéma JSON
- Fichier seed: `genealogical-tree/data/people.json`.
- Structure normalisée (liste de personnes + métadonnées):

```json
{
  "version": 1,
  "rootPersonId": "p1",
  "people": [
    {
      "id": "p1",
      "firstName": "Alice",
      "lastName": "Durand",
      "photoUrl": "https://…/alice.jpg",
      "gender": "female",
      "parentIds": ["p2", "p3"],
      "partnerIds": ["p4"],
      "childIds": ["p5"]
    }
    // ... autres personnes
  ]
}
```

Contraintes et conventions:
- `id`: unique (string courte). Les relations utilisent des IDs.
- Les fratries sont dérivées: deux personnes sont frères/sœurs si elles partagent ≥1 parent commun.
- La suppression d’une personne enlève proprement ses références dans les listes des autres (`parentIds`, `childIds`, `partnerIds`).
- Aucune création de cycle interdit majeur (un enfant ne peut pas devenir parent d’un de ses ancêtres). Si une opération le provoquerait, elle est refusée avec message.

### Persistance
- Lecture du seed JSON au chargement.
- État modifiable en mémoire avec persistance automatique dans `localStorage` (clé `genealogical-tree/state/v1`).
- Boutons: **Exporter JSON** (téléchargement du JSON complet), **Importer JSON** (remplace l’état après validation), **Réinitialiser** (revient au seed).
- Option « Mode lecture seule » si `localStorage` indisponible.

### Architecture (modules)
- `src/data/` — chargement seed, sérialisation, validation schéma (Zod recommandé).
- `src/model/` — opérations métier immuables: ajouter/supprimer personne, lier/délier parent/enfant/partenaire, vérifs d’intégrité.
- `src/state/` — store (Zustand ou Context + Reducer) + persistance localStorage.
- `src/components/` — UI React: `TreeView`, `PersonCard`, `EditPersonModal`, `Toolbar`, `ImportExport`.
- `src/layout/` — algorithme d’agencement en couches (générations), calcul des positions et des liens.
- `src/pages/` — page principale.
- `src/styles/` — tokens, thèmes légers.

### UI et interactions
- **Toolbar**: sélection de la personne racine (recherche par nom + liste), mode (Ascendants/Descendants), profondeur (1–3), Importer, Exporter, Réinitialiser.
- **PersonCard**: photo (ratio 4:3, `object-fit: cover`, placeholder si manquante), prénom nom, bouton « Éditer » en haut à droite (icône crayon), menu contextuel « Ajouter parent / enfant / frère/sœur / partenaire » et « Supprimer ».
- **Modal d’édition**: champs `firstName`, `lastName`, `photoUrl` (URL), prévisualisation. Boutons Enregistrer/Annuler. Validation légère: non vide pour prénom/nom, URL valide si fournie.
- **Suppression**: confirmation affichant l’impact (combien de liens seront retirés). Toujours maintenir l’intégrité relationnelle.

### Rendu et agencement de l’arbre
- Agencement en niveaux par génération à partir de la racine, 3 profondeurs max.
- Mode « Ascendants »: la racine au centre/bas, parents au-dessus, etc. Mode « Descendants »: inverse.
- Placement horizontal par rang, espacements constants; raccordement via lignes SVG.
- Gestion des partenaires: partenaires affichés côte à côte avec une liaison courte; enfants rattachés sous le couple si présent.
- Performance cible: 150 nœuds sans saccades sur desktop.

### Accessibilité
- Focus visible sur tous les éléments interactifs; navigation clavier (Tab) pour atteindre `PersonCard` et actions principales.
- Couleurs avec ratio de contraste ≥ 4.5:1 pour texte normal.
- Texte alternatif pour photos (nom complet).
- Modal avec focus trap et fermeture Esc.

### Tests
- Unitaires (Vitest):
  - Ajout/suppression personne; liens parent/enfant/partenaire; fratrie dérivée.
  - Prévention cycles; nettoyage des références à la suppression.
  - Import/export: validation de schéma, migration simple de version (si `version` diffère).
- Intégration légère (RTL):
  - Édition d’une personne via modal met à jour la carte.
  - Ajout d’un enfant crée les liens réciproques.
  - Suppression retire la personne et les liens.

### Qualité, perf et accessibilité (aligné README)
- Lint zéro avertissement (ESLint + Prettier). TypeScript strict sans `any` non justifié.
- Lighthouse: Performance ≥ 70, Accessibilité ≥ 90 sur page principale.
- Bundle raisonnable: éviter grosses libs de graphes; privilégier layout simple + SVG.

### Sécurité et conformité
- Aucune collecte réseau en MVP; pas de données sensibles.
- Dépendances sans vulnérabilité critique.
- Validation basique des entrées; URLs d’images non exécutées (no `javascript:`).

### Livrables
- Application web statique buildée (`dist/`).
- Code source découpé par modules, lisible, typé, documenté minimalement.
- Jeu de tests unitaires couvrant les opérations du modèle.

### Roadmap (estimative)
1) Setup Vite + React + TS, structure dossiers, ESLint/Prettier/Vitest — 0.5 j
2) Modèle & store (opérations + persistance) — 0.5 j
3) Layout & rendu de l’arbre (SVG + cartes) — 0.75 j
4) UI d’édition (modal) + opérations de liens — 0.75 j
5) Import/Export/Reset + polishing accessibilité/perf — 0.5 j
6) Tests unitaires/intégration et QA — 0.5 j

### Critères d’acceptation (MVP)
- L’arbre affiche correctement jusqu’à 3 niveaux en modes Ascendants et Descendants.
- Chaque `PersonCard` comporte un bouton « Éditer » en haut à droite ouvrant une modal fonctionnelle.
- Ajout d’un parent, enfant, frère/sœur, partenaire met à jour l’état et l’affichage; suppression nettoie les liens.
- Import/Export JSON opérationnels; Reset recharge le seed.
- Navigation clavier possible et focus visible; modal accessible.
- Build sans erreur; lint zéro avertissement; tests principaux en vert.

### Commandes standard
- `npm i`
- `npm run dev`
- `npm run build`
- `npm run test`

### Annexes
- Fichiers prévus:
  - `genealogical-tree/data/people.json` (seed minimal, 6–12 personnes)
  - `genealogical-tree/src/` (sous-dossiers ci-dessus)
  - `genealogical-tree/README.md` (instructions courtes)

