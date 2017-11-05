const Schema = require('../Schema');

test('create an empty schema', () => {
  const schema = Schema({});
  expect(schema).toMatchObject({});
});

test('create a schema', () => {
  const schema = Schema({
    number: Number,
    string: String,
    boolean: Boolean,
  });
  expect(schema).toHaveProperty('number');
  expect(schema).toHaveProperty('string');
  expect(schema).toHaveProperty('boolean');
  Object.keys(schema).forEach(fieldName => {
    const field = schema[fieldName];
    expect(field).toHaveProperty('name');
    expect(field.name).toBeA('string');
    expect(field).toHaveProperty('type');
    expect(field.type).toBeA('function');
    expect(field).toHaveProperty('index');
    expect(field.index).toBeA('boolean');
    expect(field).toHaveProperty('filter');
    expect(field.filter).toBeA('function');
  });
});

test('create invalid schema', () => {
  expect(() => Schema({ invalid: {} })).toThrow();
});
