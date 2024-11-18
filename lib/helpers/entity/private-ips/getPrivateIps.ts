import { filter } from 'lodash/fp';
import { Entity } from '../../../types';
import { IpManipulationParameters, isLinkLocalAddress, isLoopBackIp } from './common';
import isPrivateIp from './isPrivateIp';

const getPrivateIps = (
  entities: Entity[],
  {
    dontGetLoopBackIps = false,
    dontGetLinkLocalAddresses = false,
    dontGetTheseIps = [],
    dontGetIpsMatchingThisRegex = /^$/
  }: IpManipulationParameters
): Entity[] =>
  filter(
    (entity: Entity): boolean =>
      entity.isIP &&
      isNotInIgnoreLists(entity.value, dontGetTheseIps, dontGetIpsMatchingThisRegex) &&
      isValidIp(entity, dontGetLoopBackIps, dontGetLinkLocalAddresses),
    entities
  );

const isNotInIgnoreLists = (
  ip: string,
  dontGetTheseIps: string[],
  dontGetIpsMatchingThisRegex: RegExp
): boolean => !(dontGetTheseIps.includes(ip) || dontGetIpsMatchingThisRegex.test(ip));

const isValidIp = (
  entity: Entity,
  dontGetLoopBackIps: boolean,
  dontGetLinkLocalAddresses: boolean
): boolean => {
  const ip = entity.value;
  const isPrivateIP = isPrivateIp(ip) || entity.isPrivateIP;
  const isLookBackIp = !dontGetLoopBackIps && isLoopBackIp(ip);
  const isALinkLocalAddress = !dontGetLinkLocalAddresses && isLinkLocalAddress(ip);

  return isPrivateIP || isLookBackIp || isALinkLocalAddress;
};

export default getPrivateIps;
