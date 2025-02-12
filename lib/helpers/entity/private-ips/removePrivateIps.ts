import { filter } from 'lodash/fp';
import type { Entity } from '../../../types';
import { IpManipulationParameters, isLinkLocalAddress, isLoopBackIp } from './common';
import isPrivateIp from './isPrivateIp';

/**
 * @alpha
 * @param entities - list of entities to return private IPs from
 * @param dontGetLoopBackIps - true if you don't want loop back IPs returned
 * @param dontGetLinkLocalAddresses - true if you don't want link local addresses returned
 * @param dontGetTheseIps - list of IPs to not return
 * @param dontGetIpsMatchingThisRegex - regex to match against IPs.  Matched IPs won't be returned
 */
const removePrivateIps = (
  entities: Entity[],
  {
    dontRemoveLoopBackIps = false,
    dontRemoveLinkLocalAddresses = false,
    dontRemoveTheseIps = [],
    dontRemoveIpsMatchingThisRegex = /^$/
  }: IpManipulationParameters
): Entity[] =>
  filter(
    (entity: Entity): boolean =>
      !entity.isIP ||
      isExcludedFromFilter(
        entity.value,
        dontRemoveTheseIps,
        dontRemoveIpsMatchingThisRegex
      ) ||
      isValidIp(entity, dontRemoveLoopBackIps, dontRemoveLinkLocalAddresses),
    entities
  );

const isExcludedFromFilter = (
  ip: string,
  dontRemoveTheseIps: string[],
  dontRemoveIpsMatchingThisRegex: RegExp
): boolean => dontRemoveTheseIps.includes(ip) || dontRemoveIpsMatchingThisRegex.test(ip);

const isValidIp = (
  entity: Entity,
  dontRemoveLoopBackIps: boolean,
  dontRemoveLinkLocalAddresses: boolean
): boolean => {
  const ip = entity.value;
  const isNotPrivateIp = !(isPrivateIp(ip) || entity.isPrivateIP);
  const isNotLookBackIp = dontRemoveLoopBackIps || !isLoopBackIp(ip);
  const isNotLinkLocalAddresses = dontRemoveLinkLocalAddresses || !isLinkLocalAddress(ip);

  return isNotPrivateIp && isNotLookBackIp && isNotLinkLocalAddresses;
};

export default removePrivateIps;
