const diff = require('../diff');

test('find no changes diff ', () => {
  expect(diff({}, {})).toMatchObject({});
});

test('find deleted properties diff', () => {
  expect(diff({ a: 1 }, {})).toMatchObject({});
});

test('find added properties diff', () => {
  expect(diff({}, { a: 1 })).toMatchObject({ a: 1 });
});
