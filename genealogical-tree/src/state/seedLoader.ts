import seed from '../data';
import type { DataModel } from './PeopleStore';

export function getSeed(): DataModel {
  return seed as unknown as DataModel;
}


