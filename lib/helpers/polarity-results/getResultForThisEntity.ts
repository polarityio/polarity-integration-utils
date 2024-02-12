import { get, filter, flow, eq, flatMap, uniqWith, isEqual } from 'lodash/fp';
import { Entity } from '../../types';

const getResultForThisEntity = (entity: Entity, results: any[]) =>
  flow(
    filter(flow(get('resultId'), eq(entity.value))),
    flatMap(get('result')),
    uniqWith(isEqual)
  )(results);

export default getResultForThisEntity;
