import { filter } from 'lodash/fp';
import is_ip_private from 'private-ip';

import { Entity } from '../../types';

const getPrivateIps = (entities: Entity[]): Entity[] =>
  filter(({ isIP, value }: Entity) => isIP && is_ip_private(value), entities);

export default getPrivateIps;
