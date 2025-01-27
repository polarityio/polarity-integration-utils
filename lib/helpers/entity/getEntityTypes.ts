import { toLower, map, filter, some } from 'lodash/fp';

import type { Entity, EntityType } from '../../types';

/**
 * @public
 * @param typesToGet - a single type of list of types to return from the entities list
 * @param entities - list of entities to return specific types from
 */
const getEntityTypes = (
  typesToGet: EntityType | EntityType[],
  entities: Entity[]
): Entity[] => {
  const lowerTypesToGet: string[] =
    typeof typesToGet === 'string' ? [toLower(typesToGet)] : map(toLower, typesToGet);

  const entitiesOfTypesToGet: Entity[] = filter((entity: Entity): boolean => {
    const lowerEntityTypes: string[] = map(toLower, entity.types);

    const entityTypesAreInTypesToGet: boolean = some(
      (typeToGet: string): boolean => lowerEntityTypes.includes(typeToGet),
      lowerTypesToGet
    );

    return entityTypesAreInTypesToGet;
  }, entities);

  return entitiesOfTypesToGet;
};

export default getEntityTypes;
