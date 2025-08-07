import React from 'react';
import { usePeople, Person } from '../state/PeopleStore';
import { PersonCard } from './person/PersonCard';

type Positioned = Person & { x: number; y: number };

function layoutTree(
  people: Person[],
  rootId: string,
  mode: 'ancestors' | 'descendants',
  depth: 1 | 2 | 3
): { nodes: Positioned[]; width: number; height: number; links: Array<{ from: string; to: string }> } {
  // Layout en couches simple: chaque profondeur = rang vertical, placement horizontal par ordre BFS
  const nodes: Positioned[] = [];
  const links: Array<{ from: string; to: string }> = [];
  const byId = new Map(people.map((p) => [p.id, p] as const));
  const queue: Array<{ id: string; d: number }> = [{ id: rootId, d: 0 }];
  const seen = new Set<string>();
  const levels: Array<string[]> = [[], [], [], []];
  const ensureLevel = (idx: number): string[] => {
    if (!levels[idx]) levels[idx] = [];
    return levels[idx]!;
  };
  while (queue.length) {
    const n = queue.shift()!;
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    const present = byId.get(n.id);
    if (!present) continue;
    const level = ensureLevel(n.d);
    level.push(n.id);
    if (n.d < depth) {
      const p = present;
      const neighbors = mode === 'descendants' ? p.childIds ?? [] : p.parentIds ?? [];
      for (const nb of neighbors) {
        queue.push({ id: nb, d: (n.d + 1) as 1 | 2 | 3 | 0 });
        links.push({ from: n.id, to: nb });
      }
      // Partenaires: même niveau que la personne
      for (const partner of p.partnerIds ?? []) {
        if (!seen.has(partner)) ensureLevel(n.d).push(partner);
      }
    }
  }
  const cardW = 200;
  const cardH = 210;
  const gapX = 40;
  const gapY = 120;
  const width = Math.max(...levels.map((lv) => lv.length)) * (cardW + gapX) + gapX;
  const height = (Math.min(depth, 3) + 1) * (cardH + gapY) + gapY;

  levels.forEach((lv, lvlIndex) => {
    const totalW = lv.length * (cardW + gapX);
    const startX = (width - totalW) / 2 + gapX / 2;
    lv.forEach((id, idx) => {
      const p = byId.get(id);
      if (!p) return;
      const x = startX + idx * (cardW + gapX);
      const y = gapY + lvlIndex * (cardH + gapY);
      nodes.push({ ...p, x, y });
    });
  });

  return { nodes, width, height, links };
}

export function TreeView(): React.ReactElement {
  const { state } = usePeople();
  const { nodes, width, height, links } = React.useMemo(
    () => layoutTree(state.data.people, state.selectedRootId, state.mode, state.depth),
    [state.data.people, state.selectedRootId, state.mode, state.depth]
  );

  return (
    <div className="treeCanvas" style={{ minHeight: height }}>
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {links.map((l, i) => {
          const from = nodes.find((n) => n.id === l.from);
          const to = nodes.find((n) => n.id === l.to);
          if (!from || !to) return null;
          const x1 = from.x + 100;
          const y1 = from.y + 210;
          const x2 = to.x + 100;
          const y2 = to.y;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.3)" strokeWidth={2} />;
        })}
      </svg>
      {nodes.map((n) => (
        <PersonCard key={n.id} personId={n.id} x={n.x} y={n.y} />
      ))}
    </div>
  );
}


