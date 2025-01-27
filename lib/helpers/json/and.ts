import { Predicate } from './types';

/**
 * Combines multiple predicate functions into a single predicate function that returns true
 * only if all the provided predicate functions return true for a given argument.
 *
 * @public
 * @param func - The first predicate function.
 * @param funcs - Additional predicate functions.
 * @returns A combined predicate function.
 */
export function and<T>(func: Predicate<T>, ...funcs: Predicate<T>[]): Predicate<T> {
  return (x: T) =>
    !!func(x) && (funcs.length ? !!and(funcs[0], ...funcs.slice(1))(x) : true);
}
