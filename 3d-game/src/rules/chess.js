// Chess rules engine (no rendering). Board is 0..63, file = x 0..7 (a..h), rank = z 0..7 (1..8)

export const Piece = {
  Pawn: 'P',
  Knight: 'N',
  Bishop: 'B',
  Rook: 'R',
  Queen: 'Q',
  King: 'K',
};

export const Color = { White: 'w', Black: 'b' };

export function fileOf(index) { return index % 8; }
export function rankOf(index) { return Math.floor(index / 8); }
export function indexOf(file, rank) { return rank * 8 + file; }

export function otherColor(color) { return color === Color.White ? Color.Black : Color.White; }

export function createInitialState() {
  const empty = Array(64).fill(null);
  const board = empty.slice();
  // Place pieces: rank 0 = white back rank (from white perspective), rank 1 = white pawns
  const place = (idx, type, color) => { board[idx] = { type, color }; };
  // White
  place(indexOf(0,0), Piece.Rook, Color.White);
  place(indexOf(1,0), Piece.Knight, Color.White);
  place(indexOf(2,0), Piece.Bishop, Color.White);
  place(indexOf(3,0), Piece.Queen, Color.White);
  place(indexOf(4,0), Piece.King, Color.White);
  place(indexOf(5,0), Piece.Bishop, Color.White);
  place(indexOf(6,0), Piece.Knight, Color.White);
  place(indexOf(7,0), Piece.Rook, Color.White);
  for (let f = 0; f < 8; f += 1) place(indexOf(f,1), Piece.Pawn, Color.White);
  // Black
  for (let f = 0; f < 8; f += 1) place(indexOf(f,6), Piece.Pawn, Color.Black);
  place(indexOf(0,7), Piece.Rook, Color.Black);
  place(indexOf(1,7), Piece.Knight, Color.Black);
  place(indexOf(2,7), Piece.Bishop, Color.Black);
  place(indexOf(3,7), Piece.Queen, Color.Black);
  place(indexOf(4,7), Piece.King, Color.Black);
  place(indexOf(5,7), Piece.Bishop, Color.Black);
  place(indexOf(6,7), Piece.Knight, Color.Black);
  place(indexOf(7,7), Piece.Rook, Color.Black);

  return {
    board,
    sideToMove: Color.White,
    // Castling rights: KQkq
    castling: { K: true, Q: true, k: true, q: true },
    enPassant: null, // index or null
    halfmoveClock: 0,
    fullmoveNumber: 1,
    history: [],
  };
}

export function cloneState(state) {
  return {
    board: state.board.map((p) => (p ? { ...p } : null)),
    sideToMove: state.sideToMove,
    castling: { ...state.castling },
    enPassant: state.enPassant,
    halfmoveClock: state.halfmoveClock,
    fullmoveNumber: state.fullmoveNumber,
    history: state.history.slice(),
  };
}

export function findKingIndex(state, color) {
  for (let i = 0; i < 64; i += 1) {
    const p = state.board[i];
    if (p && p.type === Piece.King && p.color === color) return i;
  }
  return -1;
}

export function isSquareAttacked(state, square, byColor) {
  // Knights
  const knightDeltas = [
    [+1, +2], [+2, +1], [-1, +2], [-2, +1],
    [+1, -2], [+2, -1], [-1, -2], [-2, -1],
  ];
  for (const [df, dr] of knightDeltas) {
    const f = fileOf(square) + df; const r = rankOf(square) + dr;
    if (f < 0 || f > 7 || r < 0 || r > 7) continue;
    const idx = indexOf(f, r);
    const p = state.board[idx];
    if (p && p.color === byColor && p.type === Piece.Knight) return true;
  }
  // Pawns
  const dir = byColor === Color.White ? +1 : -1;
  for (const df of [-1, +1]) {
    const f = fileOf(square) + df;
    const r = rankOf(square) - dir; // inverse because we check attackers moving towards square
    if (f < 0 || f > 7 || r < 0 || r > 7) continue;
    const idx = indexOf(f, r);
    const p = state.board[idx];
    if (p && p.color === byColor && p.type === Piece.Pawn) return true;
  }
  // King
  for (let df = -1; df <= 1; df += 1) {
    for (let dr = -1; dr <= 1; dr += 1) {
      if (df === 0 && dr === 0) continue;
      const f = fileOf(square) + df; const r = rankOf(square) + dr;
      if (f < 0 || f > 7 || r < 0 || r > 7) continue;
      const idx = indexOf(f, r);
      const p = state.board[idx];
      if (p && p.color === byColor && p.type === Piece.King) return true;
    }
  }
  // Sliding attackers: rook/queen (orthogonal)
  const orth = [[1,0],[-1,0],[0,1],[0,-1]];
  for (const [df, dr] of orth) {
    let f = fileOf(square) + df; let r = rankOf(square) + dr;
    while (f >= 0 && f < 8 && r >= 0 && r < 8) {
      const idx = indexOf(f, r);
      const p = state.board[idx];
      if (p) {
        if (p.color === byColor && (p.type === Piece.Rook || p.type === Piece.Queen)) return true;
        break;
      }
      f += df; r += dr;
    }
  }
  // Sliding attackers: bishop/queen (diagonals)
  const diag = [[1,1],[1,-1],[-1,1],[-1,-1]];
  for (const [df, dr] of diag) {
    let f = fileOf(square) + df; let r = rankOf(square) + dr;
    while (f >= 0 && f < 8 && r >= 0 && r < 8) {
      const idx = indexOf(f, r);
      const p = state.board[idx];
      if (p) {
        if (p.color === byColor && (p.type === Piece.Bishop || p.type === Piece.Queen)) return true;
        break;
      }
      f += df; r += dr;
    }
  }
  return false;
}

export function generatePseudoLegalMoves(state, fromIndex) {
  const piece = state.board[fromIndex];
  if (!piece) return [];
  const moves = [];
  const color = piece.color;
  const file = fileOf(fromIndex);
  const rank = rankOf(fromIndex);

  const push = (to, extras = {}) => { moves.push({ from: fromIndex, to, ...extras }); };

  switch (piece.type) {
    case Piece.Pawn: {
      const forward = color === Color.White ? +1 : -1;
      const startRank = color === Color.White ? 1 : 6;
      const promoRank = color === Color.White ? 7 : 0;
      // Single step
      const oneRank = rank + forward;
      if (oneRank >= 0 && oneRank < 8) {
        const oneIdx = indexOf(file, oneRank);
        if (!state.board[oneIdx]) {
          if (oneRank === promoRank) {
            push(oneIdx, { promotion: Piece.Queen }); // default queen
          } else {
            push(oneIdx);
            // Double step
            if (rank === startRank) {
              const twoIdx = indexOf(file, rank + 2 * forward);
              if (!state.board[twoIdx]) push(twoIdx, { pawnDouble: true });
            }
          }
        }
      }
      // Captures
      for (const df of [-1, +1]) {
        const cf = file + df; const cr = rank + forward;
        if (cf < 0 || cf > 7 || cr < 0 || cr > 7) continue;
        const cIdx = indexOf(cf, cr);
        const target = state.board[cIdx];
        if (target && target.color !== color) {
          if (cr === promoRank) push(cIdx, { capture: true, promotion: Piece.Queen });
          else push(cIdx, { capture: true });
        }
      }
      // En passant
      if (state.enPassant != null) {
        const epFile = fileOf(state.enPassant);
        const epRank = rankOf(state.enPassant);
        if (epRank === rank + forward && Math.abs(epFile - file) === 1) {
          push(state.enPassant, { enPassant: true, capture: true });
        }
      }
      break;
    }
    case Piece.Knight: {
      const deltas = [
        [+1, +2], [+2, +1], [-1, +2], [-2, +1],
        [+1, -2], [+2, -1], [-1, -2], [-2, -1],
      ];
      for (const [df, dr] of deltas) {
        const f = file + df; const r = rank + dr;
        if (f < 0 || f > 7 || r < 0 || r > 7) continue;
        const idx = indexOf(f, r);
        const t = state.board[idx];
        if (!t || t.color !== color) push(idx, { capture: !!t });
      }
      break;
    }
    case Piece.Bishop:
    case Piece.Rook:
    case Piece.Queen: {
      const dirs = [];
      if (piece.type !== Piece.Rook) dirs.push([1,1],[1,-1],[-1,1],[-1,-1]);
      if (piece.type !== Piece.Bishop) dirs.push([1,0],[-1,0],[0,1],[0,-1]);
      for (const [df, dr] of dirs) {
        let f = file + df; let r = rank + dr;
        while (f >= 0 && f < 8 && r >= 0 && r < 8) {
          const idx = indexOf(f, r);
          const t = state.board[idx];
          if (!t) push(idx);
          else { if (t.color !== color) push(idx, { capture: true }); break; }
          f += df; r += dr;
        }
      }
      break;
    }
    case Piece.King: {
      for (let df = -1; df <= 1; df += 1) {
        for (let dr = -1; dr <= 1; dr += 1) {
          if (df === 0 && dr === 0) continue;
          const f = file + df; const r = rank + dr;
          if (f < 0 || f > 7 || r < 0 || r > 7) continue;
          const idx = indexOf(f, r);
          const t = state.board[idx];
          if (!t || t.color !== color) push(idx, { capture: !!t });
        }
      }
      // Castling
      const inCheck = (sq) => isSquareAttacked(state, sq, otherColor(color));
      const kingStart = color === Color.White ? indexOf(4,0) : indexOf(4,7);
      const rookH = color === Color.White ? indexOf(7,0) : indexOf(7,7);
      const rookA = color === Color.White ? indexOf(0,0) : indexOf(0,7);
      const rightsK = color === Color.White ? state.castling.K : state.castling.k;
      const rightsQ = color === Color.White ? state.castling.Q : state.castling.q;
      if (fromIndex === kingStart && !inCheck(fromIndex)) {
        // King-side: squares f,g empty and not attacked; rook present
        if (rightsK && !state.board[indexOf(5, rank)] && !state.board[indexOf(6, rank)]) {
          if (!inCheck(indexOf(5, rank)) && !inCheck(indexOf(6, rank))) {
            const rookPiece = state.board[rookH];
            if (rookPiece && rookPiece.type === Piece.Rook && rookPiece.color === color) {
              push(indexOf(6, rank), { castle: 'K' });
            }
          }
        }
        // Queen-side: squares b,c,d empty and not attacked; rook present
        if (rightsQ && !state.board[indexOf(1, rank)] && !state.board[indexOf(2, rank)] && !state.board[indexOf(3, rank)]) {
          if (!inCheck(indexOf(3, rank)) && !inCheck(indexOf(2, rank))) {
            const rookPiece = state.board[rookA];
            if (rookPiece && rookPiece.type === Piece.Rook && rookPiece.color === color) {
              push(indexOf(2, rank), { castle: 'Q' });
            }
          }
        }
      }
      break;
    }
    default: break;
  }
  return moves;
}

export function makeMove(state, move) {
  // Returns a new state with the move applied
  const s = cloneState(state);
  const moving = s.board[move.from];
  const target = s.board[move.to];
  const color = moving.color;

  // Update halfmove clock
  if (moving.type === Piece.Pawn || target) s.halfmoveClock = 0; else s.halfmoveClock += 1;

  // Handle special moves
  // En passant capture removal
  if (move.enPassant) {
    const dir = color === Color.White ? -1 : +1; // captured pawn is behind the to-square
    const capIdx = indexOf(fileOf(move.to), rankOf(move.to) + dir);
    s.board[capIdx] = null;
  }

  // Move piece
  s.board[move.to] = { ...moving };
  s.board[move.from] = null;

  // Promotion
  if (moving.type === Piece.Pawn && (rankOf(move.to) === 7 || rankOf(move.to) === 0)) {
    s.board[move.to].type = move.promotion || Piece.Queen;
  }

  // Castling: move rook
  if (moving.type === Piece.King && move.castle) {
    const r = rankOf(move.to);
    if (move.castle === 'K') {
      const rookFrom = indexOf(7, r);
      const rookTo = indexOf(5, r);
      s.board[rookTo] = s.board[rookFrom];
      s.board[rookFrom] = null;
    } else if (move.castle === 'Q') {
      const rookFrom = indexOf(0, r);
      const rookTo = indexOf(3, r);
      s.board[rookTo] = s.board[rookFrom];
      s.board[rookFrom] = null;
    }
  }

  // Update castling rights
  const revokeWhiteKing = () => { s.castling.K = false; s.castling.Q = false; };
  const revokeBlackKing = () => { s.castling.k = false; s.castling.q = false; };
  const revokeWhiteRook = (fromIdx) => {
    if (fromIdx === indexOf(7,0)) s.castling.K = false;
    if (fromIdx === indexOf(0,0)) s.castling.Q = false;
  };
  const revokeBlackRook = (fromIdx) => {
    if (fromIdx === indexOf(7,7)) s.castling.k = false;
    if (fromIdx === indexOf(0,7)) s.castling.q = false;
  };

  if (moving.type === Piece.King) {
    if (color === Color.White) revokeWhiteKing(); else revokeBlackKing();
  }
  if (moving.type === Piece.Rook) {
    if (color === Color.White) revokeWhiteRook(move.from); else revokeBlackRook(move.from);
  }
  // If a rook is captured, update rights too
  if (target && target.type === Piece.Rook) {
    const idx = move.to;
    if (target.color === Color.White) revokeWhiteRook(idx); else revokeBlackRook(idx);
  }

  // Update en passant square
  if (moving.type === Piece.Pawn && move.pawnDouble) {
    const dir = color === Color.White ? +1 : -1;
    s.enPassant = indexOf(fileOf(move.from), rankOf(move.from) + dir);
  } else {
    s.enPassant = null;
  }

  // Side to move
  s.sideToMove = otherColor(s.sideToMove);
  if (s.sideToMove === Color.White) s.fullmoveNumber += 1;

  s.history.push(move);
  return s;
}

export function isLegalMove(state, move) {
  // Ensure after the move own king is not in check
  const s = cloneState(state);
  const moving = s.board[move.from];
  if (!moving) return false;
  const pseudoMoves = generatePseudoLegalMoves(s, move.from);
  if (!pseudoMoves.find((m) => m.to === move.to && (!!m.promotion === !!move.promotion) && (!!m.castle === !!move.castle) && (!!m.enPassant === !!move.enPassant))) return false;
  const applied = makeMove(s, move);
  const kingIdx = findKingIndex(applied, moving.color);
  return !isSquareAttacked(applied, kingIdx, otherColor(moving.color));
}

export function generateLegalMoves(state, fromIndex) {
  const pseudo = generatePseudoLegalMoves(state, fromIndex);
  const legal = [];
  for (const m of pseudo) {
    if (isLegalMove(state, m)) legal.push(m);
  }
  return legal;
}

export function inCheck(state, color) {
  const k = findKingIndex(state, color);
  return isSquareAttacked(state, k, otherColor(color));
}

export function hasAnyLegalMove(state, color) {
  for (let i = 0; i < 64; i += 1) {
    const p = state.board[i];
    if (p && p.color === color) {
      const moves = generateLegalMoves(state, i);
      if (moves.length > 0) return true;
    }
  }
  return false;
}

export function gameStatus(state) {
  const color = state.sideToMove;
  const check = inCheck(state, color);
  // Draw claims (50-move rule or threefold repetition)
  if (fiftyMoveAvailable(state)) return { type: 'draw_fifty' };
  if (threefoldAvailable(state)) return { type: 'draw_threefold' };
  const any = hasAnyLegalMove(state, color);
  if (!any && check) return { type: 'checkmate', winner: otherColor(color) };
  if (!any && !check) return { type: 'stalemate' };
  return { type: 'ongoing', check };
}

export function indexToAlgebraic(index) {
  const f = 'abcdefgh'[fileOf(index)];
  const r = (rankOf(index) + 1).toString();
  return `${f}${r}`;
}

export function moveToSAN(state, move) {
  // Minimal SAN: piece letter (none for pawn), capture x, destination, promotion, check/mate symbol
  // Ambiguity resolution omitted for brevity (acceptable MVP). Roque uses O-O / O-O-O.
  const s = cloneState(state);
  const moving = s.board[move.from];
  if (moving.type === Piece.King && move.castle) return move.castle === 'K' ? 'O-O' : 'O-O-O';
  const pieceLetter = moving.type === Piece.Pawn ? '' : moving.type;
  const capture = move.capture ? 'x' : '';
  const dest = indexToAlgebraic(move.to);
  const promo = move.promotion ? `=${move.promotion}` : '';
  const after = makeMove(s, move);
  const status = gameStatus(after);
  const suffix = status.type === 'checkmate' ? '#' : (status.check ? '+' : '');
  // For pawns capturing, include file of origin as per SAN convention
  if (moving.type === Piece.Pawn && move.capture) {
    return `${'abcdefgh'[fileOf(move.from)]}x${dest}${promo}${suffix}`;
  }
  return `${pieceLetter}${capture}${dest}${promo}${suffix}`;
}

export function historyToPGN(state, metadata = {}) {
  // Minimal PGN exporter using current state's history and SAN reconstruction
  let s = createInitialState();
  const sans = [];
  for (const m of state.history) {
    const san = moveToSAN(s, m);
    sans.push(san);
    s = makeMove(s, m);
  }
  const lines = [];
  const headers = {
    Event: metadata.Event || 'Casual Game',
    Site: metadata.Site || 'Local',
    Date: metadata.Date || new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
    Round: metadata.Round || '1',
    White: metadata.White || 'White',
    Black: metadata.Black || 'Black',
    Result: metadata.Result || '*',
  };
  for (const [k, v] of Object.entries(headers)) lines.push(`[${k} "${v}"]`);
  const moves = [];
  for (let i = 0; i < sans.length; i += 2) {
    const num = i / 2 + 1;
    const white = sans[i] || '';
    const black = sans[i + 1] || '';
    moves.push(`${num}. ${white}${black ? ' ' + black : ''}`);
  }
  lines.push('', moves.join(' '), headers.Result);
  return lines.join('\n');
}

export function computePositionKey(state) {
  // Key includes: piece placement with colors, side to move, castling rights, en passant square
  const parts = [];
  for (let i = 0; i < 64; i += 1) {
    const p = state.board[i];
    if (!p) { parts.push('-'); continue; }
    parts.push(p.color + p.type);
  }
  // Castling string KQkq filtered by rights
  const cr = `${state.castling.K ? 'K' : ''}${state.castling.Q ? 'Q' : ''}${state.castling.k ? 'k' : ''}${state.castling.q ? 'q' : ''}` || '-';
  const ep = state.enPassant != null ? indexToAlgebraic(state.enPassant) : '-';
  return `${parts.join('')}_${state.sideToMove}_${cr}_${ep}`;
}

export function threefoldAvailable(state) {
  // Recompute positions by replaying history from initial
  let s = createInitialState();
  const counts = new Map();
  const bump = (key) => counts.set(key, (counts.get(key) || 0) + 1);
  bump(computePositionKey(s));
  for (const mv of state.history) {
    s = makeMove(s, mv);
    bump(computePositionKey(s));
  }
  const currentKey = computePositionKey(state);
  return (counts.get(currentKey) || 0) >= 3;
}

export function fiftyMoveAvailable(state) {
  return state.halfmoveClock >= 100; // 50 moves each side = 100 plies without pawn move or capture
}


