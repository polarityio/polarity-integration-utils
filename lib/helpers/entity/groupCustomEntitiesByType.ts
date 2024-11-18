import { reduce, flow, filter, includes, map, split, last } from 'lodash/fp';

import { Entity } from '../../types';

const groupCustomEntitiesByType = (
  customEntities: Entity[],
  customTypesKeys: string[]
): CustomEntitiesByCustomTypesKey => {
  const customEntitiesByCustomTypesKeyDefault: CustomEntitiesByCustomTypesKey = reduce(
    (agg: CustomEntitiesByCustomTypesKey, customTypeKey: string) => ({
      ...agg,
      [`${customTypeKey}Entities`]: []
    }),
    {},
    customTypesKeys
  );

  const groupedCustomTypes: CustomEntitiesByCustomTypesKey =
    addEntityToRelevantCustomTypeGroups(
      customEntities,
      customEntitiesByCustomTypesKeyDefault
    );

  return groupedCustomTypes;
};

const addEntityToRelevantCustomTypeGroups = (
  customEntities: Entity[],
  customEntitiesByCustomTypesKeyDefault: CustomEntitiesByCustomTypesKey
): CustomEntitiesByCustomTypesKey =>
  reduce(
    (
      agg: CustomEntitiesByCustomTypesKey,
      entity: Entity
    ): CustomEntitiesByCustomTypesKey => {
      const customTypeGroupLabelsForThisEntity: GroupLabel[] =
        getCustomTypeGroupLabels(entity);

      const resultWithEntityAddedToGroups: CustomEntitiesByCustomTypesKey =
        addEntityToGroupsByLabels(entity, customTypeGroupLabelsForThisEntity, agg);

      return resultWithEntityAddedToGroups;
    },
    customEntitiesByCustomTypesKeyDefault,
    customEntities
  );

const getCustomTypeGroupLabels = (entity: Entity): GroupLabel[] =>
  flow(
    filter(includes('custom')),
    map(
      flow(
        split('.'),
        last,
        (customEntityTypeWithoutPrefix: string): GroupLabel =>
          `${customEntityTypeWithoutPrefix}Entities`
      )
    )
  )(entity.types);

const addEntityToGroupsByLabels = (
  entity: Entity,
  customTypeGroupLabelsForThisEntity: GroupLabel[],
  customEntitiesByCustomTypesKey: CustomEntitiesByCustomTypesKey
): CustomEntitiesByCustomTypesKey =>
  reduce(
    (
      agg: CustomEntitiesByCustomTypesKey,
      customTypeGroupLabelForThisEntity: GroupLabel
    ): CustomEntitiesByCustomTypesKey => ({
      ...agg,
      [customTypeGroupLabelForThisEntity]:
        agg[customTypeGroupLabelForThisEntity].concat(entity)
    }),
    customEntitiesByCustomTypesKey,
    customTypeGroupLabelsForThisEntity
  );

type CustomEntitiesByCustomTypesKey = { [key: GroupLabel]: Entity[] };
type GroupLabel = `${string}Entities`;

export default groupCustomEntitiesByType;
