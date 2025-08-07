import { describe, it, expect } from 'vitest';
import { PeopleProvider, usePeople } from '../../state/PeopleStore';
import React from 'react';
import { renderHook, act } from '@testing-library/react';

describe('model ops', () => {
  it('adds parent-child and prevents cycles', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <PeopleProvider>{children}</PeopleProvider>;
    const { result } = renderHook(() => usePeople(), { wrapper });

    const root = result.current.state.selectedRootId;
    const child = result.current.state.data.people.find((p) => !(p.childIds ?? []).includes(root) && p.id !== root)?.id!;

    act(() => result.current.addParentChild(root, child));
    expect(result.current.state.data.people.find((p) => p.id === root)?.childIds).toContain(child);

    // cycle: trying to make child an ancestor of its ancestor
    expect(() => act(() => result.current.addParentChild(child, root))).toThrowError();
  });
});


