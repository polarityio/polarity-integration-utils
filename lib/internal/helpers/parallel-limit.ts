import { LibraryUsageError } from '../../errors';

/**
 * Execute an array of async tasks while ensuring that no more than `limit`
 * tasks are running at the same time.  Results preserve task order.
 *
 * @param tasks  Array of thunked async tasks (`() => Promise<T>`).
 * @param limit  Maximum number of concurrent tasks (positive integer).
 */
export async function parallelLimit<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<T[]> {
  // ─── Validation ──────────────────────────────────────────────────────────────
  if (!Array.isArray(tasks)) {
    throw new LibraryUsageError('parallelLimit: `tasks` must be an array');
  }
  if (tasks.length === 0) return [];
  if (
    typeof limit !== 'number' ||
    !Number.isInteger(limit) ||
    limit <= 0
  ) {
    throw new LibraryUsageError(
      'parallelLimit: `limit` must be a positive integer'
    );
  }

  const results: T[] = new Array(tasks.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (true) {
      const current = next++;
      if (current >= tasks.length) break;
      results[current] = await tasks[current]();
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, () => worker())
  );

  return results;
}
