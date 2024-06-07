export const zeroTo255Range: RegExp = /(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])/;


const lookBackIpStartingRegex = /(^127\.)/;
const isLookBackIpRegex = new RegExp(
  `${lookBackIpStartingRegex.source}(${zeroTo255Range.source}\.){2}${zeroTo255Range.source}`
);
export const isLoopBackIp = (ip: string): boolean => isLookBackIpRegex.test(ip);

const linkLocalAddressStartingRegex: RegExp = /(^169\.254\.)/;
const isLinkLocalAddressRegex: RegExp = new RegExp(
  `${linkLocalAddressStartingRegex.source}(${zeroTo255Range.source}\.)${zeroTo255Range.source}`
);
export const isLinkLocalAddress = (ip: string): boolean =>
  isLinkLocalAddressRegex.test(ip);

export type IpManipulationParameters = {
  dontRemoveLoopBackIps?: boolean;
  dontRemoveLinkLocalAddresses?: boolean;
  dontRemoveTheseIps?: string[];
  dontRemoveIpsMatchingThisRegex?: RegExp;
  dontGetLoopBackIps?: boolean;
  dontGetLinkLocalAddresses?: boolean;
  dontGetTheseIps?: string[];
  dontGetIpsMatchingThisRegex?: RegExp;
};
