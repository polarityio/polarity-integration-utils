const or =
  (...[func, ...funcs]) =>
  (x) =>
    !!func(x) || (!!funcs.length && !!or(...funcs)(x));

module.exports = or;
