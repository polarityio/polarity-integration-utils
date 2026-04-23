import { createEntity } from '../../lib/testing';

describe('createEntity', () => {
  it('should map IP type to IPv4 EntityTypeIdentifier', () => {
    const entity = createEntity('IP', '8.8.8.8');
    expect(entity.type).toBe('IPv4');
    expect(entity.types).toEqual(['IP']);
  });

  it('should map custom.* type to custom EntityTypeIdentifier', () => {
    const entity = createEntity('custom.myCustomType', 'some-value');
    expect(entity.type).toBe('custom');
    expect(entity.types).toEqual(['custom.myCustomType']);
  });

  it('should pass through standard types unchanged', () => {
    const entity = createEntity('domain', 'example.com');
    expect(entity.type).toBe('domain');
    expect(entity.types).toEqual(['domain']);
  });

  it('should detect domain values', () => {
    const entity = createEntity('domain', 'example.com');
    expect(entity.isDomain).toBe(true);
    expect(entity.isIPv4).toBe(false);
  });

  it('should detect IPv4 values', () => {
    const entity = createEntity('IP', '192.168.1.1');
    expect(entity.isIPv4).toBe(true);
    expect(entity.isIP).toBe(true);
    expect(entity.IPType).toBe('IPv4');
  });

  it('should detect IPv6 values', () => {
    const entity = createEntity('IPv6', '::1');
    expect(entity.isIPv6).toBe(true);
    expect(entity.isIP).toBe(true);
    expect(entity.isIPv4).toBe(false);
    expect(entity.IPType).toBe('IPv6');
  });

  it('should detect full IPv6 addresses', () => {
    const entity = createEntity('IPv6', '2001:0db8:85a3:0000:0000:8a2e:0370:7334');
    expect(entity.isIPv6).toBe(true);
    expect(entity.isIP).toBe(true);
    expect(entity.IPType).toBe('IPv6');
  });

  it('should set default entity properties', () => {
    const entity = createEntity('hash', 'abc123');
    expect(entity.value).toBe('abc123');
    expect(entity.rawValue).toBe('abc123');
    expect(entity.displayValue).toBe('abc123');
    expect(entity.requestContext).toEqual({
      requestType: 'OnDemand',
      isUserInitiated: true
    });
    expect(entity.IPLong).toBe(0);
    expect(entity.channels).toEqual([]);
  });
});
