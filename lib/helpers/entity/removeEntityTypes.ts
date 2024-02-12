import { toLower, map, filter, every } from 'lodash/fp';

import { Entity, EntityType } from '../../types';

const removeEntityTypes = (
  typesToRemove: EntityType | EntityType[],
  entities: Entity[]
): Entity[] => {
  const lowerTypesToRemove: string[] =
    typeof typesToRemove === 'string'
      ? [toLower(typesToRemove)]
      : map(toLower, typesToRemove);

  const entitiesNotOfTypesToRemove = filter((entity: Entity): boolean => {
    const lowerEntityTypes: string[] = map(toLower, entity.types);

    const entityTypesAreNotInTypesToRemove: boolean = every(
      (typeToRemove: string): boolean => !lowerEntityTypes.includes(typeToRemove),
      lowerTypesToRemove
    );

    return entityTypesAreNotInTypesToRemove;
  }, entities);

  return entitiesNotOfTypesToRemove;
};

export default removeEntityTypes;
