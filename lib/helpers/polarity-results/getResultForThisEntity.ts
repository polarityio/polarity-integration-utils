import { get, filter, flow, eq, flatMap, uniqWith, isEqual, identity } from 'lodash/fp';
import type { Entity } from '../../types';


// REVIEW: Need to consider case sensitivity issues here where the entity 
// casing of resultId does not match the entity casing of the entity
// Also, should we rename resultId to make it more obvious it's just the entity
// value associated with the lookup?
/**
 * @public
 * @param entity - entity to get results for
 * @param results - results to search through
 * @param onlyReturnUniqueResults - if true, only unique result objects are returned
 */
export const getResultForThisEntity = (
  entity: Entity,
  results: unknown[],
  onlyReturnUniqueResults: boolean = false
): unknown =>
  flow(
    filter(flow(get('resultId'), eq(entity.value))),
    flatMap(get('result')),
    onlyReturnUniqueResults ? uniqWith(isEqual) : identity
  )(results);

