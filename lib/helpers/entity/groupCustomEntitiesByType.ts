import { reduce, flow, filter, includes, map, split, last } from 'lodash/fp';

import type { Entity } from '../../types';

/**
 * @alpha
 * @param customEntities - list of custom entities (type=custom) to group
 * @param customTypesKeys - list of custom type keys to group by
 */
export const groupCustomEntitiesByType = (
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

/**
 * @alpha
 */
export type CustomEntitiesByCustomTypesKey = { [key: GroupLabel]: Entity[] };

/**
 * @alpha
 */
export type GroupLabel = `${string}Entities`;
