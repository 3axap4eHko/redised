const createClient = require('../redis');
const Schema = require('../Schema');
const Model = require('../Model');

const MODEL_NAME = 'testModel';

const schema = Schema({
  id: Number,
  flag1: { type: Number, index: true },
  flag2: { type: Number, index: true },
  flag3: { type: Number, index: true },
  number: Number,
  string: String,
  boolean: Boolean,
});

const data = {
  id: 1,
  flag1: 1,
  flag2: 2,
  flag3: 3,
  number: '123.456',
  string: 123.456,
  boolean: 0,
};

const client = createClient();

beforeEach(async () => {
  await client.connection;
  client.drop();
});

afterAll(() => client.close());

test('create model', async () => {
  const TestModel = Model(MODEL_NAME, schema);

  expect(TestModel.create).toBeA('function');
  expect(TestModel.get).toBeA('function');
  expect(TestModel.getMany).toBeA('function');
  expect(TestModel.find).toBeA('function');
  expect(TestModel.set).toBeA('function');
  expect(TestModel.setMany).toBeA('function');
  expect(TestModel.del).toBeA('function');
});

test('create entity', async () => {
  const TestModel = Model(MODEL_NAME, schema);
  const entity = TestModel.create(data);

  expect(entity.id).toBeA('number');
  expect(entity.flag1).toBeA('number');
  expect(entity.flag2).toBeA('number');
  expect(entity.flag3).toBeA('number');
  expect(entity.number).toBeA('number');
  expect(entity.string).toBeA('string');
  expect(entity.boolean).toBeA('boolean');
});

test('set and get entity', async () => {
  const TestModel = Model(MODEL_NAME, schema);
  const entity = TestModel.create(data);
  await TestModel.set(entity);
  expect(await TestModel.get(1)).toMatchObject(entity);
});

test('setMany and getMany entities', async () => {
  const TestModel = Model(MODEL_NAME, schema);
  const ids = Array.from({ length: 1000 }).map((v, id) => id);
  const entities = ids.map((v, id) => TestModel.create({
      ...data,
    id,
    flag1: id % 2,
    flag2: id % 3,
    flag3: id % 4,
  }));
  await TestModel.setMany(entities);
  const restoredEntities = await TestModel.getMany(ids);
  expect(restoredEntities).toHaveLength(ids.length);
  restoredEntities.forEach(entity => expect(entity).toMatchObject(entities[entity.id]));
});

test('setMany and find entities', async () => {
  jest.setTimeout(100000);
  const TestModel = Model(MODEL_NAME, schema);
  const ids = Array.from({ length: 100000 }).map((v, id) => id);
  const entities = ids.map((v, id) => TestModel.create({
    ...data,
    id,
    flag1: id % 2,
    flag2: id % 3,
    flag3: id % 4,
  }));

  await TestModel.setMany(entities);

  return Promise.all(Array.from({ length: 3 }).map(async (v, id) => {
    const flagKey = `flag${id + 1}`;
    const restoredEntities = await TestModel.find({ [flagKey]: id });
    expect(restoredEntities).toHaveLength(entities.filter(e => e[flagKey] === id).length);
    restoredEntities.forEach(entity => expect(entity).toMatchObject(entities[entity.id]));
  }));
});
