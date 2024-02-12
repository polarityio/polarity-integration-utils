import { toLower, map, filter, some } from 'lodash/fp';

import { Entity, EntityType } from '../../types';

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
