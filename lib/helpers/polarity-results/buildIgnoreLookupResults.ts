import { map } from 'lodash/fp';
import type { Entity } from '../../types';

/**
 * @alpha
 */
export type DoLookupResponse = {
  entity: Entity,
  displayValue?: string,
  isVolatile?: boolean,
  data: null | {
    summary?: string[],
    details: unknown
  }
};

/**
 * @alpha
 * @param entities - list of entities to create ignore objects for 
 */
export const buildIgnoreLookupResults = (entities: Entity[]): DoLookupResponse[] =>
  map(
    (entity: Entity): DoLookupResponse => ({
      entity,
      data: null
    }),
    entities
  );
