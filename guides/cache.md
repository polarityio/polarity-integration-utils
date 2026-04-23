---
title: Polarity Cache
group: Documents
category: Guides
---

# Cache Interface Guide

The Polarity server provides a hierarchical caching system with three scopes: global, integration, and user. The cache object is passed to your integration via the server context. This guide explains how to use the cache interfaces effectively in your integrations.

## Cache Hierarchy

The caching system is organized in three levels, from most general to most specific:

```typescript
interface PolarityCache {
  global: GlobalCache; // System-wide shared cache
  integration: IntegrationCache; // Integration-specific cache
  user: UserCache; // User-specific cache within integration
}
```

### Global Cache

- **Scope**: Shared across all integrations and users
- **Use cases**: Feature flags, system statistics, shared configuration
- **Key namespace**: Global (use descriptive prefixes to avoid conflicts)

### Integration Cache

- **Scope**: Shared among all users of a specific integration
- **Use cases**: API responses, configuration, lookup results
- **Key namespace**: Per integration ID

### User Cache

- **Scope**: Specific to individual users within an integration
- **Use cases**: User preferences, recent activity, personalized data
- **Key namespace**: Per integration ID and user ID

## Usage Examples

### Basic API Response Caching

```typescript
import type { Entity, IntegrationContext } from '@polarityio/integration-types';

interface LookupResult {
  title: string;
  description: string;
}

async function doLookup(entity: Entity, context: IntegrationContext): Promise<LookupResult> {
  const cache = context?.cache;
  if (!cache) return fetchFreshData(entity);

  try {
    const cacheKey = `lookup_${entity.value}`;
    const cached = await cache.integration.get<LookupResult>(cacheKey);
    if (cached) return cached;

    const result = await fetchFreshData(entity);
    await cache.integration.set(cacheKey, result, { ttl: 300 }); // 5 minutes
    return result;
  } catch (error) {
    logger.error({ err: error }, 'Cache error');
    return fetchFreshData(entity); // Graceful fallback
  }
}
```

### User Preferences

```typescript
import type { IntegrationContext } from '@polarityio/integration-types';

interface UserPreferences {
  theme: string;
  pageSize: number;
}

const DEFAULT_PREFERENCES: UserPreferences = { theme: 'dark', pageSize: 25 };

async function getUserPreferences(context: IntegrationContext): Promise<UserPreferences> {
  const cache = context?.cache;
  if (!cache) return DEFAULT_PREFERENCES;

  try {
    const prefs = await cache.user.get<UserPreferences>('ui_preferences');
    return prefs ?? DEFAULT_PREFERENCES;
  } catch (error) {
    return DEFAULT_PREFERENCES;
  }
}

async function updateUserPreferences(
  preferences: UserPreferences,
  context: IntegrationContext
): Promise<void> {
  const cache = context?.cache;
  if (!cache) return;

  try {
    await cache.user.set('ui_preferences', preferences, { ttl: 86400 }); // 24 hours
  } catch (error) {
    logger.error({ err: error }, 'Failed to save preferences');
  }
}
```

### Global Statistics

```typescript
import type { IntegrationContext } from '@polarityio/integration-types';

async function trackGlobalUsage(context: IntegrationContext): Promise<void> {
  const cache = context?.cache;
  if (!cache) return;

  try {
    const current = (await cache.global.get<number>('total_lookups')) ?? 0;
    await cache.global.set('total_lookups', current + 1, { ttl: 86400 });
  } catch (error) {
    logger.warn({ err: error }, 'Failed to update global stats');
  }
}
```

## Cache Hierarchy Pattern

Use this pattern to check caches from most specific to most general:

```typescript
import type { Entity, IntegrationContext } from '@polarityio/integration-types';

interface CachedLookup {
  source: 'user_cache' | 'integration_cache' | 'global_cache' | 'fresh' | 'fallback';
  data: unknown;
}

async function getLookupData(entity: Entity, context: IntegrationContext): Promise<CachedLookup> {
  const cache = context?.cache;
  if (!cache) return { source: 'fallback', data: await fetchFreshData(entity) };

  try {
    const key = `lookup_${entity.value}`;

    // 1. Check user-specific cache first
    let result = await cache.user.get(key);
    if (result) return { source: 'user_cache', data: result };

    // 2. Check integration cache
    result = await cache.integration.get(key);
    if (result) return { source: 'integration_cache', data: result };

    // 3. Check global cache for known entities
    result = await cache.global.get(`known_entity_${entity.value}`);
    if (result) return { source: 'global_cache', data: result };

    // 4. Fetch fresh data and cache in integration scope for all users
    const freshData = await fetchFreshData(entity);
    await cache.integration.set(key, freshData, { ttl: 3600 });

    return { source: 'fresh', data: freshData };
  } catch (error) {
    logger.error({ err: error }, 'Cache error');
    return { source: 'fallback', data: await fetchFreshData(entity) };
  }
}
```

## Cache Options

All cache operations support optional configuration:

```typescript
interface CacheOptions {
  ttl?: number; // Time-to-live in seconds
}

// Examples
await cache.global.set('key', 'value'); // No expiration
await cache.global.set('key', 'value', { ttl: 300 }); // 5 minutes
await cache.global.set('key', 'value', { ttl: 86400 }); // 24 hours
```

## Best Practices

### 1. Always Handle Cache Failures

```typescript
try {
  const cached = await cache.integration.get<MyData>(key);
  return cached ?? (await fetchFreshData());
} catch (error) {
  logger.error({ err: error }, 'Cache error');
  return await fetchFreshData(); // Always provide fallback
}
```

### 2. Use Descriptive Cache Keys

```typescript
// Good — descriptive and unlikely to conflict
'config_api_endpoints';
'lookup_192.168.1.1';
'user_preferences_dashboard';
'rate_limit_counter_2024-01-15';

// Bad — vague and likely to conflict
'config';
'data';
'temp';
'result';
```

### 3. Choose Appropriate TTL Values

```typescript
// Short-lived data (5–15 minutes)
{ ttl: 300 }   // API responses that change frequently
{ ttl: 900 }   // Rate limiting counters

// Medium-lived data (1–6 hours)
{ ttl: 3600 }  // Lookup results
{ ttl: 21600 } // Configuration data

// Long-lived data (24+ hours)
{ ttl: 86400 } // User preferences
{ ttl: 604800 } // Weekly statistics
```

### 4. Namespace Your Keys

```typescript
// Use consistent prefixes to organize keys
await cache.integration.set('config:api_endpoint', endpoint);
await cache.integration.set('config:timeout', timeout);
await cache.integration.set('stats:daily_lookups', count);
await cache.integration.set('temp:processing_batch_001', batch);
```

### 5. Handle Null Returns Gracefully

```typescript
const cached = await cache.integration.get<MyData>(key);
const data = cached ?? getDefaultValue(); // Always provide fallback

// Or use a typed default for objects
interface AppConfig {
  timeout: number;
  retries: number;
}

const config: AppConfig = (await cache.integration.get<AppConfig>('app_config')) ?? {
  timeout: 30000,
  retries: 3
};
```

## Error Handling

Cache operations can fail for various reasons (network issues, storage limits, etc.). Always implement proper error handling:

```typescript
import type { IntegrationContext } from '@polarityio/integration-types';

async function robustCacheOperation(context: IntegrationContext): Promise<unknown> {
  const cache = context?.cache;

  // Graceful degradation if no cache available
  if (!cache) {
    return await fallbackOperation();
  }

  try {
    const result = await cache.integration.get('key');
    if (result) return result;

    const freshData = await fetchData();

    // Don't fail the operation if caching fails
    try {
      await cache.integration.set('key', freshData, { ttl: 300 });
    } catch (cacheError) {
      logger.warn({ err: cacheError }, 'Failed to cache result');
    }

    return freshData;
  } catch (error) {
    logger.error({ err: error }, 'Cache operation failed');
    return await fallbackOperation();
  }
}
```

## Performance Considerations

1. **Cache appropriate data sizes** — Avoid caching very large objects
2. **Use reasonable TTL values** — Balance freshness vs performance
3. **Implement cache warming** for frequently accessed data
4. **Monitor cache hit rates** in production
5. **Clean up expired data** with appropriate TTL values

The cache interfaces provide a powerful way to improve integration performance while maintaining data consistency and user experience.
