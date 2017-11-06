const e = require('../escape');

test('escape an empty value', () => {
  expect(e()).toBe('');
});

test('escape null value', () => {
  expect(e(null)).toBe('null');
});

test('escape string value', () => {
  expect(e('*test')).toBe('\\*test')
});

test('escape int value', () => {
  expect(e(2)).toBe('2');
});

