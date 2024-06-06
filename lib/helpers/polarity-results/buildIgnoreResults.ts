import { map } from 'lodash/fp';
import { DoLookupResponse } from './types';
import { Entity } from '../../types';

const buildIgnoreResults = (entities: Entity[]): DoLookupResponse[] =>
  map(
    (entity: Entity): DoLookupResponse => ({
      entity,
      data: null
    }),
    entities
  );

export default buildIgnoreResults;