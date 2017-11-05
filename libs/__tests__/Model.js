const RDB = require('../RDB');
const Schema = require('../Schema');
const Model = require('../Model');

const schema = Schema({
  id: Number,
  flag: { type: Number, index: true },
  number: Number,
  string: String,
  boolean: Boolean,
});

const data = {
  id: 1,
  flag: 2,
  number: '123.456',
  string: 123.456,
  boolean: 0,
};

const connecting = RDB.connect();

beforeEach(async () => {
  await connecting;
  RDB.api.drop();
});

afterAll(() => RDB.api.close());

test('create model', async () => {
  const TestModel = Model('test', schema);

  expect(TestModel.create).toBeA('function');
  expect(TestModel.createQuery).toBeA('function');
  expect(TestModel.get).toBeA('function');
  expect(TestModel.getMany).toBeA('function');
  expect(TestModel.find).toBeA('function');
  expect(TestModel.set).toBeA('function');
  expect(TestModel.setMany).toBeA('function');
  expect(TestModel.del).toBeA('function');
});

test('create entity', async () => {
  const TestModel = Model('test', schema);
  const entity = TestModel.create(data);

  expect(entity.id).toBeA('number');
  expect(entity.flag).toBeA('number');
  expect(entity.number).toBeA('number');
  expect(entity.string).toBeA('string');
  expect(entity.boolean).toBeA('boolean');
});

test('set and get entity', async () => {
  const TestModel = Model('test', schema);
  const entity = TestModel.create(data);
  await TestModel.set(entity);
  expect(await TestModel.get(1)).toMatchObject(entity);
});

test('setMany and getMany entities', async () => {
  const TestModel = Model('test', schema);
  const ids = Array.from({ length: 100 }).map((v, id) => id);
  const entities = ids.map((v, id) => TestModel.create({
    data,
    id,
    flag: id % 3,
  }));

  await TestModel.setMany(entities);
  const restoredEntities = await TestModel.getMany(ids);
  expect(restoredEntities).toHaveLength(ids.length);
  restoredEntities.forEach(entity => expect(entity).toMatchObject(entities[entity.id]));
});

test('setMany and find entities', async () => {
  const TestModel = Model('test', schema);
  const ids = Array.from({ length: 100 }).map((v, id) => id);
  const entities = ids.map((v, id) => TestModel.create({
      ...data,
    id,
    flag: id % 2,
  }));

  await TestModel.setMany(entities);
  const restoredEntities = await TestModel.find({ flag: 1 });
  expect(restoredEntities).toHaveLength(ids.length / 2);
  restoredEntities.forEach(entity => expect(entity).toMatchObject(entities[entity.id]));
});
