expect.extend({
  toBeA(received, argument) {
    const pass = typeof received === argument;
    return {
      message: () => `expected value '${received}' to be of ${argument} type`,
      pass,
    };
  },
});