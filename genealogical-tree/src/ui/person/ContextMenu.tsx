import React from 'react';
import { usePeople } from '../../state/PeopleStore';

export function ContextMenu({ personId }: { personId: string }): React.ReactElement {
  const { addParentChild, addPartners, state } = usePeople();
  const [targetId, setTargetId] = React.useState('');
  const options = state.data.people.filter((p) => p.id !== personId);
  return (
    <div style={{ display: 'flex', gap: 8, padding: '8px 12px' }}>
      <select aria-label="Cible" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
        <option value="">Choisir…</option>
        {options.map((p) => (
          <option key={p.id} value={p.id}>{`${p.firstName} ${p.lastName}`}</option>
        ))}
      </select>
      <button disabled={!targetId} onClick={() => targetId && addParentChild(personId, targetId)}>Ajouter enfant</button>
      <button disabled={!targetId} onClick={() => targetId && addParentChild(targetId, personId)}>Ajouter parent</button>
      <button disabled={!targetId} onClick={() => targetId && addPartners(personId, targetId)}>Ajouter partenaire</button>
    </div>
  );
}


