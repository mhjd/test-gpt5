import React from 'react';
import { usePeople } from '../state/PeopleStore';

export function Toolbar(): React.ReactElement {
  const { state, setMode, setDepth, setRoot, exportData, importData, resetData } = usePeople();
  const [query, setQuery] = React.useState('');

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return state.data.people.slice(0, 10);
    return state.data.people
      .filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q))
      .slice(0, 10);
  }, [query, state.data.people]);

  const onImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        importData(JSON.parse(text));
      } catch (e) {
        alert('JSON invalide: ' + (e as Error).message);
      }
    };
    input.click();
  };

  const onExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'people.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="toolbar">
      <label>
        <span className="srOnly">Recherche</span>
        <input
          placeholder="Rechercher…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Rechercher une personne"
        />
      </label>

      <select
        aria-label="Sélection racine"
        value={state.selectedRootId}
        onChange={(e) => setRoot(e.target.value)}
      >
        {filtered.map((p) => (
          <option key={p.id} value={p.id}>{`${p.firstName} ${p.lastName}`}</option>
        ))}
      </select>

      <select aria-label="Mode" value={state.mode} onChange={(e) => setMode(e.target.value as any)}>
        <option value="descendants">Descendants</option>
        <option value="ancestors">Ascendants</option>
      </select>

      <select aria-label="Profondeur" value={state.depth} onChange={(e) => setDepth(Number(e.target.value) as 1 | 2 | 3)}>
        <option value={1}>1</option>
        <option value={2}>2</option>
        <option value={3}>3</option>
      </select>

      <button onClick={onImport}>Importer JSON</button>
      <button onClick={onExport}>Exporter JSON</button>
      <button onClick={resetData}>Réinitialiser</button>
    </header>
  );
}


