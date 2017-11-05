const createClient = require('../redis');

const NAMESPACE = 'test';
const INDEX_KEY = 'flag';

const data = {
  id: 1,
  flag: 2,
  number: '123.456',
  string: 123.456,
  boolean: 0,
};

const client = createClient();

beforeAll(async () => {
  await client.connection;
  return client.drop();
});

afterAll(() => client.close());

test('test index key', async () => {
  await client.createNamespaceIndexKeys(NAMESPACE, [INDEX_KEY]);
  const [indexKey] = await client.getNamespaceIndexKeys(NAMESPACE, [INDEX_KEY]);
  expect(indexKey).toBe(INDEX_KEY);
});
