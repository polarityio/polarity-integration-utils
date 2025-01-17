type Predicate<T> = (x: T) => unknown;

/**
 * Combines multiple predicate functions into a single predicate function that returns true
 * if at least one of the provided predicate functions returns true for a given input.
 *
 * @template T - The type of the input to the predicate functions.
 * @param {Predicate<T>} func - The first predicate function.
 * @param {...Predicate<T>[]} funcs - Additional predicate functions.
 * @returns {Predicate<T>} A predicate function that returns true if at least one of the provided predicate functions returns true.
 */
export function or<T>(func: Predicate<T>, ...funcs: Predicate<T>[]): Predicate<T> {
  return (x: T) => !!func(x) || (!!funcs.length && !!or(funcs[0], ...funcs.slice(1))(x));
}

export default or;
