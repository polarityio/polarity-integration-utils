import { some } from 'lodash/fp';
import { zeroTo255Range } from './common';

/*
`isPrivateIpv6Regexs` are base on: https://github.com/frenchbread/private-ip/blob/master/src/index.ts#L44-L58
*/
const isPrivateIpv6Regexs: RegExp[] = [
  /^::$/,
  /^::1$/,
  /^::f{4}:([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/,
  /^::f{4}:0.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/,
  /^64:ff9b::([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/,
  /^100::([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4})$/,
  /^2001::([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4})$/,
  /^2001:2[0-9a-fA-F]:([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4})$/,
  /^2001:db8:([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4})$/,
  /^2002:([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4}):?([0-9a-fA-F]{0,4})$/,
  /^f[c-d]([0-9a-fA-F]{2,2}):/i,
  /^fe[8-9a-bA-B][0-9a-fA-F]:/i,
  /^ff([0-9a-fA-F]{2,2}):/i
];
const ipv6IsPrivate = (ip: string): boolean =>
  some((regex: RegExp): boolean => regex.test(ip), isPrivateIpv6Regexs);

/*
`createIsPrivateIpv4Regex` builds the following Regex: 
const isPrivateIpv4Regex =
  /((^0\.)|(^10\.)|(^((24[0-9])|(25[0-5]))\.))((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.){2}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])|((^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.)|(^169\.254\.)|(^192\.168\.)|(^198\.1[89]\.)|(^172\.(1[6-9]|2[0-9]|3[0-1])\.))((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.)(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])|((^192\.((0\.[02]\.)|(31\.196\.)|(52\.193\.)|(88\.99\.)|(175\.48\.)))|(198\.51\.100\.)|(203\.0\.113\.))(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])/;
> Base on: https://github.com/frenchbread/private-ip/blob/master/src/index.ts#L7C1-L32C2
*/

const createIsPrivateIpv4Regex = (): RegExp => {
  const firstSectionRangesRegex = /((^0\.)|(^10\.)|(^((24[0-9])|(25[0-5]))\.))/;
  const everythingAfterFirstSectionRanges = new RegExp(
    `${firstSectionRangesRegex.source}(${zeroTo255Range.source}.){2}${zeroTo255Range.source}`
  );

  const secondSectionRangesRegex =
    /((^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.)|(^192\.168\.)|(^198\.1[89]\.)|(^172\.(1[6-9]|2[0-9]|3[0-1])\.))/;
  const everythingAfterSecondSectionRanges = new RegExp(
    `${secondSectionRangesRegex.source}(${zeroTo255Range.source}.)${zeroTo255Range.source}`
  );
  const thirdSectionRangesRegex =
    /((^192\.((0\.[02]\.)|(31\.196\.)|(52\.193\.)|(88\.99\.)|(175\.48\.)))|(198\.51\.100\.)|(203\.0\.113\.))/;
  const everythingAfterThirdSectionRanges = new RegExp(
    `${thirdSectionRangesRegex.source}${zeroTo255Range.source}`
  );

  const isPrivateIpv4Regex = new RegExp(
    `${everythingAfterFirstSectionRanges.source}|${everythingAfterSecondSectionRanges.source}|${everythingAfterThirdSectionRanges.source}`
  );

  return isPrivateIpv4Regex;
};
const isPrivateIpv4Regex: RegExp = createIsPrivateIpv4Regex();

/*
The regex involved in checking the IPv4 Private IPs (`isPrivateIpv4Regex`) covers all of the following ranges:
0.0.0.0 to 0.255.255.255
10.0.0.0 to 10.255.255.255
100.64.0.0 to 100.127.255.255
172.16.0.0 to 172.31.255.255
192.0.0.0 to 192.0.0.255
192.0.2.0 to 192.0.2.255
192.31.196.0 to 192.31.196.255
192.52.193.0 to 192.52.193.255
192.88.99.0 to 192.88.99.255
192.168.0.0 to 192.168.255.255
192.175.48.0 to 192.175.48.255
198.18.0.0 to 198.19.255.255
198.51.100.0 to 198.51.100.255
203.0.113.0 to 203.0.113.255
240.0.0.0 to 255.255.255.255

We exclude the following ranges to enable them to be toggled on and off is use of the lib
- 169.254.0.0 to 169.254.255.255 to separate it out into `isLoopBackIp` in `./common.ts`
- 127.0.0.0 to 127.255.255.255 to separate it out into `isLinkLocalAddress` in `./common.ts`

> Base on: https://github.com/frenchbread/private-ip/blob/master/src/index.ts#L7C1-L32C2
*/
const ipv4IsPrivate = (ip: string): boolean => isPrivateIpv4Regex.test(ip);

const isPrivateIp = (ip: string): boolean => ipv4IsPrivate(ip) || ipv6IsPrivate(ip);

export default isPrivateIp;
