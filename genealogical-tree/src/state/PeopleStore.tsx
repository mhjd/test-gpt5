import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { z } from 'zod';
import { getSeed } from './seedLoader';

// Schema
export const PersonSchema = z.object({
  id: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  photoUrl: z.string().url().optional().or(z.literal('')),
  gender: z.enum(['male', 'female']).optional(),
  parentIds: z.array(z.string()).default([]),
  partnerIds: z.array(z.string()).default([]),
  childIds: z.array(z.string()).default([]),
});

export type Person = z.infer<typeof PersonSchema>;

const DataSchema = z.object({
  version: z.number().default(1),
  rootPersonId: z.string(),
  people: z.array(PersonSchema),
});

export type DataModel = z.infer<typeof DataSchema>;

// Seed minimal par défaut (remplacé si fichier JSON fourni)
const defaultData: DataModel = getSeed();

type Mode = 'ancestors' | 'descendants';

export type AppState = {
  data: DataModel;
  mode: Mode;
  depth: 1 | 2 | 3;
  selectedRootId: string; // racine courante
};

type Action =
  | { type: 'load'; payload: DataModel }
  | { type: 'setMode'; payload: Mode }
  | { type: 'setDepth'; payload: 1 | 2 | 3 }
  | { type: 'setRoot'; payload: string }
  | { type: 'updateData'; payload: DataModel };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'load':
      return { ...state, data: action.payload, selectedRootId: action.payload.rootPersonId };
    case 'setMode':
      return { ...state, mode: action.payload };
    case 'setDepth':
      return { ...state, depth: action.payload };
    case 'setRoot':
      return { ...state, selectedRootId: action.payload };
    case 'updateData':
      return { ...state, data: action.payload };
    default:
      return state;
  }
}

const STORAGE_KEY = 'genealogical-tree/state/v1';

function loadFromStorage(): DataModel | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return DataSchema.parse(parsed);
  } catch {
    return null;
  }
}

function saveToStorage(data: DataModel): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

type ContextValue = {
  state: AppState;
  setMode: (mode: Mode) => void;
  setDepth: (depth: 1 | 2 | 3) => void;
  setRoot: (id: string) => void;
  importData: (json: unknown) => void;
  exportData: () => string;
  resetData: () => void;
  upsertPerson: (person: Person) => void;
  deletePerson: (id: string) => void;
  addParentChild: (parentId: string, childId: string) => void;
  addPartners: (aId: string, bId: string) => void;
  unlinkAllReferencesOf: (id: string) => void;
};

const PeopleContext = createContext<ContextValue | null>(null);

export function PeopleProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const initialData = loadFromStorage() ?? defaultData;
  const [state, dispatch] = useReducer(reducer, {
    data: initialData,
    mode: 'descendants',
    depth: 3,
    selectedRootId: initialData.rootPersonId,
  });

  useEffect(() => {
    saveToStorage(state.data);
  }, [state.data]);

  const setMode = useCallback((mode: Mode) => dispatch({ type: 'setMode', payload: mode }), []);
  const setDepth = useCallback((depth: 1 | 2 | 3) => dispatch({ type: 'setDepth', payload: depth }), []);
  const setRoot = useCallback((id: string) => dispatch({ type: 'setRoot', payload: id }), []);

  const importData = useCallback((json: unknown) => {
    const parsed = DataSchema.parse(json);
    dispatch({ type: 'load', payload: parsed });
  }, []);

  const exportData = useCallback(() => JSON.stringify(state.data, null, 2), [state.data]);
  const resetData = useCallback(() => dispatch({ type: 'load', payload: defaultData }), []);

  function getById(id: string): Person | undefined {
    return state.data.people.find((p) => p.id === id);
  }

  function assertNoCycle(parentId: string, childId: string): void {
    // Interdit: faire d'un descendant un parent de son ancêtre
    const visited = new Set<string>();
    const stack = [parentId];
    while (stack.length) {
      const cur = stack.pop()!;
      if (cur === childId) {
        throw new Error('Opération invalide: crée un cycle dans la généalogie.');
      }
      if (visited.has(cur)) continue;
      visited.add(cur);
      const person = getById(cur);
      if (person) {
        for (const pid of person.parentIds) stack.push(pid);
      }
    }
  }

  const upsertPerson = useCallback((person: Person) => {
    const people = state.data.people;
    const idx = people.findIndex((p) => p.id === person.id);
    const nextPeople = [...people];
    if (idx >= 0) nextPeople[idx] = { ...nextPeople[idx], ...person };
    else nextPeople.push({ ...person, parentIds: person.parentIds ?? [], partnerIds: person.partnerIds ?? [], childIds: person.childIds ?? [] });
    const nextData = { ...state.data, people: nextPeople };
    dispatch({ type: 'updateData', payload: nextData });
  }, [state.data]);

  const unlinkAllReferencesOf = useCallback((id: string) => {
    const nextPeople = state.data.people.map((p) => ({
      ...p,
      parentIds: p.parentIds?.filter((x) => x !== id) ?? [],
      partnerIds: p.partnerIds?.filter((x) => x !== id) ?? [],
      childIds: p.childIds?.filter((x) => x !== id) ?? [],
    }));
    const nextData = { ...state.data, people: nextPeople.filter((p) => p.id !== id) };
    dispatch({ type: 'updateData', payload: nextData });
  }, [state.data]);

  const deletePerson = useCallback((id: string) => {
    unlinkAllReferencesOf(id);
  }, [unlinkAllReferencesOf]);

  const addParentChild = useCallback((parentId: string, childId: string) => {
    if (!getById(parentId) || !getById(childId)) return;
    assertNoCycle(parentId, childId);
    const nextPeople = state.data.people.map((p) => {
      if (p.id === parentId) return { ...p, childIds: Array.from(new Set([...(p.childIds ?? []), childId])) };
      if (p.id === childId) return { ...p, parentIds: Array.from(new Set([...(p.parentIds ?? []), parentId])) };
      return p;
    });
    dispatch({ type: 'updateData', payload: { ...state.data, people: nextPeople } });
  }, [state.data]);

  const addPartners = useCallback((aId: string, bId: string) => {
    if (!getById(aId) || !getById(bId)) return;
    const nextPeople = state.data.people.map((p) => {
      if (p.id === aId) return { ...p, partnerIds: Array.from(new Set([...(p.partnerIds ?? []), bId])) };
      if (p.id === bId) return { ...p, partnerIds: Array.from(new Set([...(p.partnerIds ?? []), aId])) };
      return p;
    });
    dispatch({ type: 'updateData', payload: { ...state.data, people: nextPeople } });
  }, [state.data]);

  const value = useMemo<ContextValue>(
    () => ({
      state,
      setMode,
      setDepth,
      setRoot,
      importData,
      exportData,
      resetData,
      upsertPerson,
      deletePerson,
      addParentChild,
      addPartners,
      unlinkAllReferencesOf,
    }),
    [state, setMode, setDepth, setRoot, importData, exportData, resetData, upsertPerson, deletePerson, addParentChild, addPartners, unlinkAllReferencesOf]
  );

  return <PeopleContext.Provider value={value}>{children}</PeopleContext.Provider>;
}

export function usePeople(): ContextValue {
  const ctx = useContext(PeopleContext);
  if (!ctx) throw new Error('usePeople must be used within PeopleProvider');
  return ctx;
}


