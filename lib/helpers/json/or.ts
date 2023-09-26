const or =
  (...[func, ...funcs]) =>
  (x) =>
    !!func(x) || (!!funcs.length && !!or.apply(null, funcs)(x));

export default or;
