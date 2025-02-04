import { Predicate } from './types';

/**
 * Combines multiple predicate functions into a single predicate function that returns true
 * if at least one of the provided predicate functions returns true for a given input.
 *
 * @public
 * @param func - The first predicate function.
 * @param funcs - Additional predicate functions.
 * @returns A predicate function that returns true if at least one of the provided predicate functions returns true.
 */
export function or<T>(func: Predicate<T>, ...funcs: Predicate<T>[]): Predicate<T> {
  return (x: T) => !!func(x) || (!!funcs.length && !!or(funcs[0], ...funcs.slice(1))(x));
}

export default or;
