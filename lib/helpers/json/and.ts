type Predicate<T> = (x: T) => unknown;

/**
 * Combines multiple predicate functions into a single predicate function that returns true
 * only if all the provided predicate functions return true for a given argument.
 *
 * @template T - The type of the argument.
 * @param {Predicate<T>} func - The first predicate function.
 * @param {...Predicate<T>[]} funcs - Additional predicate functions.
 * @returns {Predicate<T>} - A combined predicate function.
 */
export function and<T>(func: Predicate<T>, ...funcs: Predicate<T>[]): Predicate<T> {
  return (x: T) =>
    !!func(x) && (funcs.length ? !!and(funcs[0], ...funcs.slice(1))(x) : true);
}

export default and;
