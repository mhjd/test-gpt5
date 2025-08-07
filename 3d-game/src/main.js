import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createInitialState, generateLegalMoves, makeMove, indexOf, fileOf, rankOf, Piece, Color, gameStatus, moveToSAN, historyToPGN } from './rules/chess.js';

const appElement = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.physicallyCorrectLights = true;
renderer.setClearColor(0x000000, 0);
// Place canvas behind HUD panels
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.inset = '0';
renderer.domElement.style.zIndex = '1';
appElement.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = null; // let CSS gradient show through

// Environment reflections
const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
scene.environment = envTex;

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(6.5, 8.5, 9.5);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 6;
controls.maxDistance = 24;
controls.maxPolarAngle = Math.PI * 0.495;

// Lights
const hemi = new THREE.HemisphereLight(0xffffff, 0x303040, 0.5);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 1.15);
dir.position.set(10, 16, 10);
dir.castShadow = true;
dir.shadow.mapSize.set(2048, 2048);
dir.shadow.normalBias = 0.02;
scene.add(dir);

// Chessboard
const BOARD_SIZE = 8;
const SQUARE_SIZE = 1;
const boardGroup = new THREE.Group();
scene.add(boardGroup);

const lightMat = new THREE.MeshPhysicalMaterial({ color: 0xd7cfbe, roughness: 0.45, metalness: 0.1, clearcoat: 0.4, clearcoatRoughness: 0.6, sheen: 0.2 });
const darkMat = new THREE.MeshPhysicalMaterial({ color: 0x5c5444, roughness: 0.5, metalness: 0.15, clearcoat: 0.5, clearcoatRoughness: 0.6, sheen: 0.25 });
const geom = new THREE.BoxGeometry(SQUARE_SIZE, 0.1, SQUARE_SIZE);

for (let z = 0; z < BOARD_SIZE; z += 1) {
  for (let x = 0; x < BOARD_SIZE; x += 1) {
    const isLight = (x + z) % 2 === 0;
    const mesh = new THREE.Mesh(geom, isLight ? lightMat : darkMat);
    mesh.receiveShadow = true;
    mesh.position.set(
      (x - (BOARD_SIZE - 1) / 2) * SQUARE_SIZE,
      0,
      (z - (BOARD_SIZE - 1) / 2) * SQUARE_SIZE,
    );
    boardGroup.add(mesh);
  }
}

// Clickable square references
const squareMeshes = [...boardGroup.children];

// Base for board
const base = new THREE.Mesh(
  new THREE.BoxGeometry(BOARD_SIZE + 1.2, 0.35, BOARD_SIZE + 1.2),
  new THREE.MeshPhysicalMaterial({ color: 0x2a2c31, metalness: 0.2, roughness: 0.4, clearcoat: 0.7 })
);
base.position.y = -0.15;
base.receiveShadow = true;
scene.add(base);

function updateBoardStyle(style) {
  if (style === 'bois') {
    lightMat.setValues({ color: 0xe8d7bd, roughness: 0.55, metalness: 0.05 });
    darkMat.setValues({ color: 0x6e5840, roughness: 0.6, metalness: 0.08 });
    base.material.color.set(0x3b2f25);
  } else if (style === 'ebene') {
    lightMat.setValues({ color: 0xcfc8bb, roughness: 0.4, metalness: 0.12 });
    darkMat.setValues({ color: 0x1c1b1a, roughness: 0.5, metalness: 0.15 });
    base.material.color.set(0x121212);
  } else if (style === 'neon') {
    lightMat.setValues({ color: 0x1b2a41, roughness: 0.3, metalness: 0.5 });
    darkMat.setValues({ color: 0x0b132b, roughness: 0.35, metalness: 0.55 });
    base.material.color.set(0x0c1020);
  } else {
    lightMat.setValues({ color: 0xd7cfbe, roughness: 0.45, metalness: 0.1 });
    darkMat.setValues({ color: 0x5c5444, roughness: 0.5, metalness: 0.15 });
    base.material.color.set(0x2a2c31);
  }
}

// Raycaster for interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredSquare = null;

// Game state and 3D pieces
let state = createInitialState();
const pieceMeshes = new Map(); // index -> mesh

function squareCenterPosition(index) {
  const f = fileOf(index);
  const r = rankOf(index);
  return new THREE.Vector3(
    (f - (BOARD_SIZE - 1) / 2) * SQUARE_SIZE,
    0.1,
    (r - (BOARD_SIZE - 1) / 2) * SQUARE_SIZE,
  );
}

// Materials
const whiteMat = new THREE.MeshPhysicalMaterial({ color: 0xf3f3f3, metalness: 0.05, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.25 });
const blackMat = new THREE.MeshPhysicalMaterial({ color: 0x17181b, metalness: 0.1, roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.3 });
const highlightMat = new THREE.MeshBasicMaterial({ color: 0x3ae68a, transparent: true, opacity: 0.6 });
const lastMoveMat = new THREE.MeshBasicMaterial({ color: 0xc8d26b, transparent: true, opacity: 0.35 });
const checkMat = new THREE.MeshBasicMaterial({ color: 0xff5a5a, transparent: true, opacity: 0.4 });
const hoverMat = new THREE.MeshBasicMaterial({ color: 0x44c1ff, transparent: true, opacity: 0.35 });

// Highlights overlay
const highlightsGroup = new THREE.Group();
scene.add(highlightsGroup);
let lastMoveFrom = null;
let lastMoveTo = null;
let checkSquare = null;
let gameOver = false;

function clearHighlights() { highlightsGroup.clear(); }

function addSquareHighlight(index, material) {
  const g = new THREE.CircleGeometry(0.4, 32);
  const m = material.clone();
  const mesh = new THREE.Mesh(g, m);
  mesh.rotation.x = -Math.PI / 2;
  const pos = squareCenterPosition(index);
  mesh.position.set(pos.x, 0.055, pos.z);
  highlightsGroup.add(mesh);
}

function refreshLastMoveHighlight() {
  if (lastMoveFrom != null && lastMoveTo != null) {
    addSquareHighlight(lastMoveFrom, lastMoveMat);
    addSquareHighlight(lastMoveTo, lastMoveMat);
  }
  if (checkSquare != null) addSquareHighlight(checkSquare, checkMat);
}

function createPieceMesh(type, color) {
  const mat = color === Color.White ? whiteMat : blackMat;
  let mesh;
  switch (type) {
    case Piece.Pawn: mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.5, 24), mat); break;
    case Piece.Knight: mesh = new THREE.Mesh(new THREE.TetrahedronGeometry(0.42, 0), mat); break;
    case Piece.Bishop: mesh = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 24), mat); break;
    case Piece.Rook: mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.6, 16), mat); break;
    case Piece.Queen: mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.55, 8, 16), mat); break;
    case Piece.King: mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.65, 8, 16), mat); break;
    default: mesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), mat);
  }
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

function syncPiecesFromState() {
  for (const [, m] of pieceMeshes) scene.remove(m);
  pieceMeshes.clear();
  for (let i = 0; i < 64; i += 1) {
    const p = state.board[i];
    if (!p) continue;
    const mesh = createPieceMesh(p.type, p.color);
    const pos = squareCenterPosition(i);
    mesh.position.copy(pos).add(new THREE.Vector3(0, 0.35, 0));
    scene.add(mesh);
    pieceMeshes.set(i, mesh);
  }
}

syncPiecesFromState();

// Helpers for status & UI
const statusEl = document.getElementById('status');
const moveListEl = document.getElementById('move-list');
const promoModal = document.getElementById('promotion-modal');
const promoButtons = {
  Q: document.getElementById('promo-queen'),
  R: document.getElementById('promo-rook'),
  B: document.getElementById('promo-bishop'),
  N: document.getElementById('promo-knight'),
};
const lastMoveTextEl = document.getElementById('last-move-text');
const copyPgnBtn = document.getElementById('btn-copy-pgn');
const themeSelect = document.getElementById('theme-select');
const bloomToggle = document.getElementById('bloom-toggle');
const bloomStrength = document.getElementById('bloom-strength');
const boardStyle = document.getElementById('board-style');

function setView(view) {
  if (view === 'white') {
    camera.position.set(0, 8.5, 10.5);
    controls.target.set(0, 0, 0);
  } else if (view === 'black') {
    camera.position.set(0, 8.5, -10.5);
    controls.target.set(0, 0, 0);
  } else {
    camera.position.set(6.5, 8.5, 9.5);
    controls.target.set(0, 0, 0);
  }
  controls.update();
}

document.getElementById('camera-view').addEventListener('change', (e) => {
  setView(e.target.value);
  persistPrefs();
});

// Postprocessing composer
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.8, 0.85);
composer.addPass(renderPass);
composer.addPass(bloomPass);
bloomPass.enabled = false;

if (bloomToggle) bloomToggle.addEventListener('change', (e) => {
  bloomPass.enabled = e.target.checked;
  persistPrefs();
});
if (bloomStrength) bloomStrength.addEventListener('input', (e) => {
  const v = parseFloat(e.target.value);
  bloomPass.strength = v;
  persistPrefs();
});

// Theme switcher
if (themeSelect) {
  themeSelect.addEventListener('change', (e) => {
    document.body.classList.remove('theme-light', 'theme-neon');
    if (e.target.value === 'light') document.body.classList.add('theme-light');
    else if (e.target.value === 'neon') document.body.classList.add('theme-neon');
    persistPrefs();
  });
}

if (boardStyle) {
  boardStyle.addEventListener('change', (e) => { updateBoardStyle(e.target.value); persistPrefs(); });
}

updateBoardStyle('classique');

// Preferences persistence
function persistPrefs() {
  try {
    const prefs = {
      theme: themeSelect ? themeSelect.value : 'dark',
      board: boardStyle ? boardStyle.value : 'classique',
      bloom: bloomToggle ? !!bloomToggle.checked : false,
      bloomStrength: bloomStrength ? parseFloat(bloomStrength.value) : 0.6,
      camera: document.getElementById('camera-view') ? document.getElementById('camera-view').value : 'iso',
    };
    localStorage.setItem('chess3d_prefs', JSON.stringify(prefs));
  } catch {}
}

function restorePrefs() {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = {
      theme: params.get('theme'),
      board: params.get('board'),
      bloom: params.get('bloom'),
      bloomStrength: params.get('bloomStrength'),
      camera: params.get('camera'),
    };
    const raw = localStorage.getItem('chess3d_prefs');
    const stored = raw ? JSON.parse(raw) : {};
    const prefs = {
      theme: fromUrl.theme || stored.theme || 'dark',
      board: fromUrl.board || stored.board || 'classique',
      bloom: fromUrl.bloom != null ? (fromUrl.bloom === '1' || fromUrl.bloom === 'true') : (stored.bloom || false),
      bloomStrength: fromUrl.bloomStrength != null ? parseFloat(fromUrl.bloomStrength) : (stored.bloomStrength || 0.6),
      camera: fromUrl.camera || stored.camera || 'iso',
    };
    // Apply Theme
    if (themeSelect) {
      themeSelect.value = prefs.theme;
      document.body.classList.remove('theme-light', 'theme-neon');
      if (prefs.theme === 'light') document.body.classList.add('theme-light');
      else if (prefs.theme === 'neon') document.body.classList.add('theme-neon');
    }
    // Apply Board style
    if (boardStyle) { boardStyle.value = prefs.board; updateBoardStyle(prefs.board); }
    // Apply Bloom
    if (bloomToggle) bloomToggle.checked = !!prefs.bloom;
    bloomPass.enabled = !!prefs.bloom;
    if (bloomStrength) bloomStrength.value = String(prefs.bloomStrength);
    bloomPass.strength = prefs.bloomStrength;
    // Apply Camera
    const camSel = document.getElementById('camera-view');
    if (camSel) { camSel.value = prefs.camera; setView(prefs.camera); }
  } catch {}
}

restorePrefs();

document.getElementById('btn-new').addEventListener('click', () => {
  state = createInitialState();
  selectedIndex = null; legalTargets = [];
  lastMoveFrom = null; lastMoveTo = null;
  syncPiecesFromState();
  clearHighlights();
  statusEl.textContent = 'Tour: Blanc';
  if (moveListEl) moveListEl.innerHTML = '';
  if (lastMoveTextEl) lastMoveTextEl.textContent = '—';
  gameOver = false;
  persistState();
});

document.getElementById('btn-undo').addEventListener('click', () => {
  if (state.history.length === 0) return;
  const moves = state.history.slice(0, -1);
  let s = createInitialState();
  for (const m of moves) s = makeMove(s, m);
  state = s;
  lastMoveFrom = moves.length ? moves[moves.length - 1].from : null;
  lastMoveTo = moves.length ? moves[moves.length - 1].to : null;
  selectedIndex = null; legalTargets = [];
  syncPiecesFromState();
  updateHighlightsForSelection();
  const status = gameStatus(state);
  const turn = state.sideToMove === Color.White ? 'Blanc' : 'Noir';
  statusEl.textContent = `Tour: ${turn}${status.check ? ' (Échec)' : ''}`;
  // Rebuild move list UI
  if (moveListEl) {
    moveListEl.innerHTML = '';
    let replay = createInitialState();
    for (const mv of moves) {
      const before = replay;
      replay = makeMove(replay, mv);
      const san = moveToSAN(before, mv);
      const ply = before.history.length + 1;
      const num = Math.ceil(ply / 2);
      if (ply % 2 === 1) {
        const line = document.createElement('div');
        line.innerHTML = `<span style="opacity:.75">${num}.</span> ${san}`;
        moveListEl.appendChild(line);
      } else {
        const last = moveListEl.lastElementChild;
        if (last) last.innerHTML = `${last.innerHTML}  ${san}`;
      }
    }
    if (lastMoveTextEl) {
      if (moves.length) {
        let lastBefore = createInitialState();
        for (let i = 0; i < moves.length - 1; i += 1) lastBefore = makeMove(lastBefore, moves[i]);
        const sanLast = moveToSAN(lastBefore, moves[moves.length - 1]);
        lastMoveTextEl.textContent = sanLast;
      } else lastMoveTextEl.textContent = '—';
    }
  }
  gameOver = false;
  persistState();
});

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

function onPointerMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  // Update hovered square
  raycaster.setFromCamera({ x: mouse.x, y: mouse.y }, camera);
  const intersects = raycaster.intersectObjects(squareMeshes, false);
  if (intersects.length > 0) {
    const p = intersects[0].object.position;
    const f = Math.round(p.x / SQUARE_SIZE + (BOARD_SIZE - 1) / 2);
    const r = Math.round(p.z / SQUARE_SIZE + (BOARD_SIZE - 1) / 2);
    const idx = (f >= 0 && f < 8 && r >= 0 && r < 8) ? indexOf(f, r) : null;
    if (idx !== hoveredSquare) { hoveredSquare = idx; updateHighlightsForSelection(); }
  } else if (hoveredSquare != null) {
    hoveredSquare = null; updateHighlightsForSelection();
  }
}
window.addEventListener('pointermove', onPointerMove);

let selectedIndex = null;
let legalTargets = [];

function pickSquare(clientX, clientY) {
  const x = (clientX / window.innerWidth) * 2 - 1;
  const y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera({ x, y }, camera);
  const intersects = raycaster.intersectObjects(squareMeshes, false);
  if (intersects.length > 0) {
    const p = intersects[0].object.position;
    const f = Math.round(p.x / SQUARE_SIZE + (BOARD_SIZE - 1) / 2);
    const r = Math.round(p.z / SQUARE_SIZE + (BOARD_SIZE - 1) / 2);
    if (f >= 0 && f < 8 && r >= 0 && r < 8) return indexOf(f, r);
  }
  return null;
}

function updateHighlightsForSelection() {
  clearHighlights();
  refreshLastMoveHighlight();
  if (selectedIndex != null) {
    for (const m of legalTargets) addSquareHighlight(m.to, highlightMat);
  }
  if (hoveredSquare != null && selectedIndex == null) addSquareHighlight(hoveredSquare, hoverMat);
}

function onClick(event) {
  const sq = pickSquare(event.clientX, event.clientY);
  if (sq == null) return;
  const piece = state.board[sq];
  if (gameOver) return;

  if (selectedIndex != null) {
    const found = legalTargets.find((m) => m.to === sq);
    if (found) {
      // Promotion workflow and unified apply
      const needsPromotion = (p) => p.type === Piece.Pawn && (rankOf(found.to) === 7 || rankOf(found.to) === 0);
      const moving = state.board[found.from];
      if (moving && needsPromotion(moving) && !found.promotion) {
        promoModal.style.display = 'flex';
        const choose = (pieceCode) => {
          promoModal.style.display = 'none';
          const moveWithPromo = { ...found, promotion: pieceCode };
          applyMoveAndUpdate(moveWithPromo);
        };
        promoButtons.Q.onclick = () => choose('Q');
        promoButtons.R.onclick = () => choose('R');
        promoButtons.B.onclick = () => choose('B');
        promoButtons.N.onclick = () => choose('N');
      } else {
        applyMoveAndUpdate(found);
      }
      lastMoveFrom = found.from; lastMoveTo = found.to;
      selectedIndex = null; legalTargets = [];
      return;
    }
  }

  if (piece && piece.color === state.sideToMove) {
    selectedIndex = sq;
    legalTargets = generateLegalMoves(state, sq);
  } else {
    selectedIndex = null; legalTargets = [];
  }
  updateHighlightsForSelection();
}
window.addEventListener('click', onClick);

function appendMoveToList(prevState, move) {
  const san = moveToSAN(prevState, move);
  const ply = prevState.history.length + 1;
  const moveNumber = Math.ceil(ply / 2);
  if (ply % 2 === 1) {
    const line = document.createElement('div');
    line.innerHTML = `<span style="opacity:.75">${moveNumber}.</span> ${san}`;
    line.dataset.line = moveNumber;
    moveListEl.appendChild(line);
  } else {
    const last = moveListEl.lastElementChild;
    if (last) last.innerHTML = `${last.innerHTML}  ${san}`;
    else {
      const line = document.createElement('div');
      line.innerHTML = `<span style=\"opacity:.75\">${moveNumber}.</span> … ${san}`;
      moveListEl.appendChild(line);
    }
  }
  moveListEl.scrollTop = moveListEl.scrollHeight;
}

function applyMoveAndUpdate(move) {
  const before = state;
  state = makeMove(state, move);
  appendMoveToList(before, move);
  // Smooth animation: move or capture
  const movingPrevMesh = pieceMeshes.get(move.from);
  const capturedMesh = pieceMeshes.get(move.to);
  const targetPos = squareCenterPosition(move.to).add(new THREE.Vector3(0, 0.35, 0));
  const startPos = movingPrevMesh ? movingPrevMesh.position.clone() : null;
  // Remove captured with fade/scale
  if (capturedMesh) {
    const startScale = capturedMesh.scale.clone();
    const startOpacity = 1.0;
    let t = 0;
    const fade = () => {
      t += 0.06;
      const k = Math.min(t, 1);
      capturedMesh.scale.setScalar(THREE.MathUtils.lerp(startScale.x, 0.1, k));
      capturedMesh.material.transparent = true;
      capturedMesh.material.opacity = THREE.MathUtils.lerp(startOpacity, 0, k);
      if (k < 1) requestAnimationFrame(fade); else { scene.remove(capturedMesh); }
    };
    requestAnimationFrame(fade);
  }
  // Move anim
  if (movingPrevMesh && startPos) {
    let t = 0;
    const dur = 0.18;
    const startY = startPos.y;
    const endY = targetPos.y;
    const elev = 0.15;
    const animateMove = () => {
      t += 1 / 60;
      const k = Math.min(t / dur, 1);
      const ease = k < 0.5 ? 2*k*k : -1 + (4 - 2*k) * k; // easeInOutQuad
      movingPrevMesh.position.lerpVectors(startPos, targetPos, ease);
      // arc elevation
      const midBoost = Math.sin(ease * Math.PI) * elev;
      movingPrevMesh.position.y = THREE.MathUtils.lerp(startY, endY, ease) + midBoost;
      if (k < 1) requestAnimationFrame(animateMove);
      else syncPiecesFromState();
    };
    requestAnimationFrame(animateMove);
  } else {
    syncPiecesFromState();
  }
  updateHighlightsForSelection();
  const status = gameStatus(state);
  checkSquare = null;
  if (status.check) {
    for (let i = 0; i < 64; i += 1) {
      const p = state.board[i];
      if (p && p.type === Piece.King && p.color === state.sideToMove) { checkSquare = i; break; }
    }
  }
  if (status.type === 'checkmate') {
    statusEl.textContent = `Échec et mat — Vainqueur: ${status.winner === Color.White ? 'Blanc' : 'Noir'}`;
    gameOver = true;
  } else if (status.type === 'stalemate') {
    statusEl.textContent = 'Pat — Nulle';
    gameOver = true;
  } else if (status.type === 'draw_threefold') {
    statusEl.textContent = 'Nulle — Répétition triple';
    gameOver = true;
  } else if (status.type === 'draw_fifty') {
    statusEl.textContent = 'Nulle — Règle des 50 coups';
    gameOver = true;
  } else {
    const turn = state.sideToMove === Color.White ? 'Blanc' : 'Noir';
    statusEl.textContent = `Tour: ${turn}${status.check ? ' (Échec)' : ''}`;
  }
  // Update last move text
  try {
    const san = moveToSAN(before, move);
    if (lastMoveTextEl) lastMoveTextEl.textContent = san;
  } catch {}
  persistState();
}

if (copyPgnBtn) {
  copyPgnBtn.addEventListener('click', async () => {
    try {
      const pgn = historyToPGN(state);
      await navigator.clipboard.writeText(pgn);
      copyPgnBtn.textContent = 'Copié !';
      setTimeout(() => { copyPgnBtn.textContent = 'Copier PGN'; }, 1500);
    } catch (e) {
      copyPgnBtn.textContent = 'Erreur';
      setTimeout(() => { copyPgnBtn.textContent = 'Copier PGN'; }, 1500);
    }
  });
}

function persistState() {
  try {
    const data = { state };
    localStorage.setItem('chess3d_state', JSON.stringify(data));
  } catch {}
}

function restoreState() {
  try {
    const raw = localStorage.getItem('chess3d_state');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data || !data.state) return;
    state = data.state;
    selectedIndex = null; legalTargets = [];
    lastMoveFrom = null; lastMoveTo = null;
    syncPiecesFromState();
    clearHighlights();
    // rebuild move list
    if (moveListEl) {
      moveListEl.innerHTML = '';
      let replay = createInitialState();
      for (const mv of state.history) {
        const before = replay;
        replay = makeMove(replay, mv);
        const san = moveToSAN(before, mv);
        const ply = before.history.length + 1;
        const num = Math.ceil(ply / 2);
        if (ply % 2 === 1) {
          const line = document.createElement('div');
          line.innerHTML = `<span style="opacity:.75">${num}.</span> ${san}`;
          moveListEl.appendChild(line);
        } else {
          const last = moveListEl.lastElementChild;
          if (last) last.innerHTML = `${last.innerHTML}  ${san}`;
        }
      }
      if (lastMoveTextEl) {
        if (state.history.length) {
          let lastBefore = createInitialState();
          for (let i = 0; i < state.history.length - 1; i += 1) lastBefore = makeMove(lastBefore, state.history[i]);
          const sanLast = moveToSAN(lastBefore, state.history[state.history.length - 1]);
          lastMoveTextEl.textContent = sanLast;
        } else lastMoveTextEl.textContent = '—';
      }
    }
    const status = gameStatus(state);
    const turn = state.sideToMove === Color.White ? 'Blanc' : 'Noir';
    if (status.type === 'checkmate') { statusEl.textContent = `Échec et mat — Vainqueur: ${status.winner === Color.White ? 'Blanc' : 'Noir'}`; gameOver = true; }
    else if (status.type === 'stalemate') { statusEl.textContent = 'Pat — Nulle'; gameOver = true; }
    else if (status.type === 'draw_threefold') { statusEl.textContent = 'Nulle — Répétition triple'; gameOver = true; }
    else if (status.type === 'draw_fifty') { statusEl.textContent = 'Nulle — Règle des 50 coups'; gameOver = true; }
    else { statusEl.textContent = `Tour: ${turn}${status.check ? ' (Échec)' : ''}`; gameOver = false; }
  } catch {}
}

restoreState();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  composer.render();
}
animate();


