import { get, filter, flow, eq, flatMap, uniqWith, isEqual, identity } from 'lodash/fp';
import { Entity } from '../../types';

const getResultForThisEntity = (
  entity: Entity,
  results: any[],
  onlyReturnUniqueResults: boolean = false
): any =>
  flow(
    filter(flow(get('resultId'), eq(entity.value))),
    flatMap(get('result')),
    onlyReturnUniqueResults ? uniqWith(isEqual) : identity
  )(results);

export default getResultForThisEntity;
