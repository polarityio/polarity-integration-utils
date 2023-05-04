const and =
  (...[func, ...funcs]) =>
  (x) =>
    !!func(x) && (funcs.length ? !!and.apply(null, funcs)(x) : true);

export default and;
