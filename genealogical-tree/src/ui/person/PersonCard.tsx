import React from 'react';
import { usePeople } from '../../state/PeopleStore';
import { EditPersonModal } from './EditPersonModal';
import { ContextMenu } from './ContextMenu';

export function PersonCard({ personId, x, y }: { personId: string; x: number; y: number }): React.ReactElement | null {
  const { state } = usePeople();
  const person = state.data.people.find((p) => p.id === personId);
  const [open, setOpen] = React.useState(false);
  if (!person) return null;
  const fullName = `${person.firstName} ${person.lastName}`;
  const photo = person.photoUrl || 'https://picsum.photos/400/300?grayscale';

  return (
    <article className="personCard" style={{ left: x, top: y }}>
      <div className="personHeader">
        <img src={photo} alt={fullName} />
        <button className="editBtn" aria-label={`Éditer ${fullName}`} onClick={() => setOpen(true)}>
          ✏️
        </button>
      </div>
      <div className="personBody">
        <div className="name">{fullName}</div>
        <div className="muted">ID: {person.id}</div>
        <ContextMenu personId={person.id} />
      </div>
      {open && <EditPersonModal personId={person.id} onClose={() => setOpen(false)} />}
    </article>
  );
}


