const e = require('../escape');

test('escape an empty values', () => {
  expect(e()).toBe('');
});

test('escape values', () => {
  expect(e(':test', ':test2')).toBe(`%3Atest${e.SEPARATOR}%3Atest2`);
});

