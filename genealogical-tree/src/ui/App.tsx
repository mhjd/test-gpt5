import React from 'react';
import { Toolbar } from './Toolbar';
import { TreeView } from './TreeView';
import { PeopleProvider } from '../state/PeopleStore';

export function App(): React.ReactElement {
  return (
    <PeopleProvider>
      <div className="app">
        <Toolbar />
        <main className="content">
          <TreeView />
        </main>
      </div>
    </PeopleProvider>
  );
}


