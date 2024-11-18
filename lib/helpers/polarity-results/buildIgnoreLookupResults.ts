import { map } from 'lodash/fp';
import { DoLookupResponse } from './types';
import { Entity } from '../../types';

const buildIgnoreLookupResults = (entities: Entity[]): DoLookupResponse[] =>
  map(
    (entity: Entity): DoLookupResponse => ({
      entity,
      data: null
    }),
    entities
  );

export default buildIgnoreLookupResults;