import { parallelLimit } from '../../lib/internal/helpers/parallel-limit';
import { LibraryUsageError } from '../../lib/errors';

describe('parallelLimit', () => {
  it('runs tasks and preserves order', async () => {
    const tasks = [1, 2, 3, 4].map((n) => async () => n * 2);
    const result = await parallelLimit(tasks, 2);
    expect(result).toEqual([2, 4, 6, 8]);
  });

  it('handles limit larger than tasks length', async () => {
    const tasks = [() => Promise.resolve('a')];
    const result = await parallelLimit(tasks, 10);
    expect(result).toEqual(['a']);
  });

  it('serial execution with limit = 1 maintains order', async () => {
    const order: number[] = [];
    const tasks = [0, 1, 2].map(
      (n) => async () => {
        order.push(n);
        return n;
      }
    );
    const result = await parallelLimit(tasks, 1);
    expect(order).toEqual([0, 1, 2]);
    expect(result).toEqual([0, 1, 2]);
  });

  it('throws when a task rejects', async () => {
    const tasks = [
      () => Promise.resolve(1),
      () => Promise.reject(new Error('boom'))
    ];
    await expect(parallelLimit(tasks, 2)).rejects.toThrow('boom');
  });

  it('concurrency never exceeds limit', async () => {
    let active = 0;
    let peak = 0;
    const makeTask = () => async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 25));
      active--;
      return true;
    };

    const tasks = Array.from({ length: 10 }, makeTask);
    await parallelLimit(tasks, 3);
    expect(peak).toBeLessThanOrEqual(3);
  });

  it('invalid arguments throw LibraryUsageError', async () => {
    // @ts-expect-error
    await expect(parallelLimit('notArray', 2)).rejects.toBeInstanceOf(
      LibraryUsageError
    );
    const tasks = [() => Promise.resolve()];
    // @ts-expect-error
    await expect(parallelLimit(tasks, 0)).rejects.toBeInstanceOf(
      LibraryUsageError
    );
  });
});
