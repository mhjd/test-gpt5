import React from 'react';
import { usePeople, Person } from '../../state/PeopleStore';

export function EditPersonModal({ personId, onClose }: { personId: string; onClose: () => void }): React.ReactElement | null {
  const { state, upsertPerson, deletePerson } = usePeople();
  const person = state.data.people.find((p) => p.id === personId);
  const [local, setLocal] = React.useState<Person | null>(person ?? null);
  const [confirm, setConfirm] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  React.useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => prev?.focus();
  }, []);

  if (!person || !local) return null;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertPerson(local);
    onClose();
  };

  const onDelete = () => {
    if (!confirm) { setConfirm(true); return; }
    deletePerson(person.id);
    onClose();
  };

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" aria-label={`Éditer ${person.firstName} ${person.lastName}`}> 
      <div className="modal" tabIndex={-1} ref={ref}>
        <h2>Éditer</h2>
        <form onSubmit={onSubmit}>
          <label>
            <span>Prénom</span>
            <input
              value={local.firstName}
              onChange={(e) => setLocal({ ...local, firstName: e.target.value })}
              required
            />
          </label>
          <label>
            <span>Nom</span>
            <input
              value={local.lastName}
              onChange={(e) => setLocal({ ...local, lastName: e.target.value })}
              required
            />
          </label>
          <label>
            <span>URL Photo</span>
            <input
              value={local.photoUrl ?? ''}
              onChange={(e) => setLocal({ ...local, photoUrl: e.target.value })}
              type="url"
              placeholder="https://…"
            />
          </label>
          <div className="modalActions">
            <button type="button" className="btnGhost" onClick={onClose}>Annuler</button>
            <button type="button" className="btnDanger" onClick={onDelete}>{confirm ? 'Confirmer la suppression' : 'Supprimer'}</button>
            <button type="submit" className="btnPrimary">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  );
}


