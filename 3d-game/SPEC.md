## Spécification fonctionnelle et technique — Jeu d’échecs 3D (Three.js)

### Vision
Proposer un jeu d’échecs en 3D, jouable dans le navigateur, fluide et lisible, mettant l’accent sur une expérience simple (humain vs humain en local) et une réalisation technique propre avec Three.js.

### Objectifs
- **Jouabilité**: parties d’échecs complètes conformes aux règles FIDE courantes (roque, promotion, prise en passant, échec/échec et mat, pat).
- **Lisibilité 3D**: caméra orbitale, bonnes proportions, matériaux contrastés, indication claire des coups légaux et de l’état d’échec.
- **Fluidité**: 60 FPS sur desktop récents; dégradations visuelles acceptables pour garder >30 FPS sur laptops modestes.
- **Simplicité de déploiement**: application statique client-side.

### Portée (scope)
- **MVP inclus**:
  - Jeu local 1v1 au même appareil (alternance des tours).
  - Plateau 8x8, pièces en 3D, contrôles souris (sélection/déplacement), caméra orbitale.
  - Validation des coups et règles spéciales (roque, promotion, prise en passant), détection échec/échec et mat/pat.
  - Annulation d’un coup (undo) simple et historique des coups en notation algébrique.
  - Indicateurs visuels: cases jouables, dernier coup, roi en échec.
- **Hors périmètre initial** (peut venir plus tard):
  - IA/ordinateur adversaire.
  - Multijoueur réseau.
  - Sauvegarde/chargement persistants.
  - Skins/Thèmes avancés, sons, effets post-processing lourds.

### Plateformes cibles
- Navigateurs desktop modernes (Chrome, Firefox, Edge, Safari) dernière et avant-dernière versions.
- Support trackpad/souris; mobile non prioritaire (caméra tactile en option « best-effort » si rapide).

### Pile technique
- **Langage**: JavaScript (option TypeScript si souhaité).
- **Moteur 3D**: Three.js.
- **Bundler/dev server**: Vite (ou équivalent léger).
- **UI**: HTML/CSS minimal + overlays (HUD) pour informations de partie.

### Architecture (modules)
- **Core règles** (`rules/`): représentation du plateau, génération des coups, validation, détection d’échec/échec et mat, roque, promotion, prise en passant, pat. Indépendant du rendu.
- **Modèle de partie** (`game/`): état courant, tour actif, historique, undo/redo, notation algébrique.
- **Rendu 3D** (`render/`): scène Three.js, caméra, lumières, plateau, pièces, surbrillance des cases, animations de déplacement.
- **Entrées/Contrôles** (`input/`): sélection de pièce au clic, survol, déplacement par clic sur case cible; OrbitControls pour la caméra.
- **UI** (`ui/`): panneau latéral/hud (joueur actif, horloge optionnelle, historique, bouton annuler, promotion).
- **Utilitaires** (`utils/`): conversion coordonnées plateau ↔ monde, couleurs, easing animations légères.

### Gameplay et règles (détails)
- Coups légaux calculés côté logique puis reflétés en 3D.
- Règles: mouvements standards, roque (conditions complètes), prise en passant, promotion (choix par UI: dame, tour, fou, cavalier), échec/échec et mat, pat, répétition triple (optionnel MVP).
- Détections de fin: mat, pat, abandon (bouton), nulle par matériel insuffisant (optionnel MVP).

### Contrôles et caméra
- **Sélection**: clic sur une pièce du joueur actif → affichage des cases jouables.
- **Déplacement**: clic sur une case valide → animation de translation de la pièce; capture gérée.
- **Caméra**: OrbitControls (rotation, zoom, pan limité). Présets angle isométrique et vue de chaque camp.

### Interface utilisateur
- Indicateurs: surbrillance des cases légales, dernier coup, roi en échec.
- Historique des coups en notation algébrique (e.g., e4, Nf3, O-O, exd6 e.p., e8=Q).
- Dialogue de promotion non bloquant avec choix rapide.
- Boutons: nouvelle partie, annuler coup, vue caméra (Blanc/Noir/Isométrique).

### Modélisation 3D et rendu
- Plateau: grille 8x8 avec matériaux contrastés (bois/graphite); coordonnées optionnelles sur bords (A–H, 1–8) via overlay 2D.
- Pièces: géométries low-poly ou primitives combinées; 2 matériaux (clairs/sombres) + légère AO/fresnel si budget.
- Éclairage: key light + fill + ambient léger; ombres douces optionnelles si performance ok.
- Animations: déplacements linéaires ou ease-in-out courts (200–300 ms).

### Performance et qualité
- Cible 60 FPS desktop; chutes acceptées >30 FPS sur machines modestes.
- Budget draw calls: < 200; textures ≤ 1K; pas de post-processing coûteux par défaut.
- Mesure via stats optionnel; throttle des survols/sélections.

### Accessibilité et i18n
- Contraste suffisant cases/indicateurs.
- Couleurs daltonisme-friendly; symboles/contours en plus de la couleur.
- Texte en FR par défaut; structure prête pour i18n (clé/valeur) si nécessaire.

### Tests
- Tests unitaires pour moteur de règles (cas roque, échec, promotion, prise en passant, pat, mat simples).
- Tests d’intégration légers: sélection → coups légaux → exécution → mise à jour état.

### Sécurité
- Aucune entrée utilisateur libre autre que clics; pas de réseau en MVP; dépendances épinglées.

### Livrables
- Application web statique buildée (dossier `dist/`).
- Code source documenté et découpé par modules.
- Jeu de tests unitaires pour les règles.

### Roadmap (estimative)
1. Setup projet (Vite, Three.js, structure modules) — 0.5 j
2. Plateau + pièces (modèles simples), caméra, lumières — 1 j
3. Moteur de règles de base + coups légaux — 1.5 j
4. Règles avancées (roque, promotion, e.p.) + détections fin — 1.5 j
5. UI (historique, promotion, boutons) + animations — 1 j
6. Polishing perf/QA + tests — 0.5 j

### Critères d’acceptation (MVP)
- Une partie standard peut être jouée jusqu’au mat/pat, avec toutes les règles appliquées.
- Les coups illégaux sont impossibles à exécuter via l’UI.
- Les promotions offrent au moins 4 choix, avec résultat cohérent dans l’état et le rendu.
- Le roque et la prise en passant fonctionnent avec leurs conditions exactes.
- L’historique affiche la notation algébrique des coups joués.
- Le rendu reste fluide et lisible; la caméra orbitale est contrôlable et limitée intelligemment.