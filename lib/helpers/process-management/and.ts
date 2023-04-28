const and =
  (...[func, ...funcs]) =>
  (x) =>
    !!func(x) && (funcs.length ? !!and(...funcs)(x) : true);

module.exports = and;
