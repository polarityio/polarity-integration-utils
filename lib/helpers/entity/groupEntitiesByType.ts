import { reduce, some, flow, get, filter, negate, includes, map } from 'lodash/fp';

import type { Entity, EntityType, StandardEntityType } from '../../types';

/**
 * @alpha
 * @param entities - list of entities to group by type
 */
export const groupEntitiesByType = (entities: Entity[]): EntitiesByType =>
  reduce(
    (entitiesByType: EntitiesByType, entity: Entity): EntitiesByType => {
      const resultWithEntityAddedToStandardTypeGroups: EntitiesByType =
        addEntityToRelevantStandardTypeGroups(entity, entitiesByType);

      const resultWithEntityAddedToAllRelevantTypeGroups: EntitiesByType =
        addEntityToCustomGroupIfCustom(entity, resultWithEntityAddedToStandardTypeGroups);

      return resultWithEntityAddedToAllRelevantTypeGroups;
    },
    entitiesByTypeDefault,
    entities
  );

const addEntityToRelevantStandardTypeGroups = (
  entity: Entity,
  entitiesByType: EntitiesByType
): EntitiesByType => {
  const groupLabelsForThisEntity: StandardEntityTypeGroupLabel[] =
    getStandardTypeGroupLabels(entity);

  const entityAddedToRelevantStandardGroups: EntitiesByType = addEntityToGroupsByLabels(
    entity,
    groupLabelsForThisEntity,
    entitiesByType
  );
  return entityAddedToRelevantStandardGroups;
};

const getStandardTypeGroupLabels = (entity: Entity): StandardEntityTypeGroupLabel[] =>
  flow(
    get('types'),
    filter(negate(includes('custom'))),
    map((standardEntityType: StandardEntityType) =>
      get(standardEntityType, standardEntityTypeByGroupLabel)
    )
  )(entity);

const addEntityToGroupsByLabels = (
  entity: Entity,
  groupLabelsForThisEntity: StandardEntityTypeGroupLabel[],
  entitiesByType: EntitiesByType
): EntitiesByType =>
  reduce(
    (agg: EntitiesByType, groupLabel: StandardEntityTypeGroupLabel): EntitiesByType => ({
      ...agg,
      [groupLabel]: agg[groupLabel].concat(entity)
    }),
    entitiesByType,
    groupLabelsForThisEntity
  );

const addEntityToCustomGroupIfCustom = (
  entity: Entity,
  entitiesByType: EntitiesByType
): EntitiesByType => {
  const entityIsCustomType = some(
    (entityType: EntityType) => entityType.includes('custom'),
    entity.types
  );

  return entityIsCustomType
    ? {
        ...entitiesByType,
        customEntities: entitiesByType.customEntities.concat(entity)
      }
    : entitiesByType;
};

const entitiesByTypeDefault: EntitiesByType = {
  ipEntities: [],
  ipv4Entities: [],
  ipv4CidrEntities: [],
  ipv6Entities: [],
  macEntities: [],
  md5Entities: [],
  sha1Entities: [],
  sha256Entities: [],
  cveEntities: [],
  domainEntities: [],
  emailEntities: [],
  hashEntities: [],
  stringEntities: [],
  urlEntities: [],
  customEntities: []
};

const standardEntityTypeByGroupLabel: StandardEntityTypeByGroupLabel = {
  IP: 'ipEntities',
  IPv4: 'ipv4Entities',
  IPv4CIDR: 'ipv4CidrEntities',
  IPv6: 'ipv6Entities',
  MAC: 'macEntities',
  MD5: 'md5Entities',
  SHA1: 'sha1Entities',
  SHA256: 'sha256Entities',
  cve: 'cveEntities',
  domain: 'domainEntities',
  email: 'emailEntities',
  hash: 'hashEntities',
  string: 'stringEntities',
  url: 'urlEntities'
};

/**
 * @alpha
 */
export type EntitiesByType = { [key in EntityTypeLabel]: Entity[] };

/**
 * @alpha
 */
export type EntityTypeLabel = StandardEntityTypeGroupLabel | 'customEntities';

/**
 * @alpha
 */
export type StandardEntityTypeByGroupLabel = {
  [key in StandardEntityType]: StandardEntityTypeGroupLabel;
};

/**
 * @alpha
 */
export type StandardEntityTypeGroupLabel =
  | 'ipEntities'
  | 'ipv4Entities'
  | 'ipv4CidrEntities'
  | 'ipv6Entities'
  | 'macEntities'
  | 'md5Entities'
  | 'sha1Entities'
  | 'sha256Entities'
  | 'cveEntities'
  | 'domainEntities'
  | 'emailEntities'
  | 'hashEntities'
  | 'stringEntities'
  | 'urlEntities';
