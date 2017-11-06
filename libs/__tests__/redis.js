const createClient = require('../redis');

const NAMESPACE = 'test';

const INDEX_KEYS = ['index1', 'index2'];

const db = createClient();

beforeEach(async () => {
  await db.connection;
});

afterAll(() => db.close());

test('test create and delete index keys', async () => {
  await db.createNamespaceIndexKeys(NAMESPACE, INDEX_KEYS);
  const indexKeys = await db.getNamespaceIndexKeys(NAMESPACE);
  expect(indexKeys.sort()).toMatchObject(INDEX_KEYS.sort());
  await db.deleteNamespaceIndexKeys(NAMESPACE, INDEX_KEYS);
  const noIndexKeys = await db.getNamespaceIndexKeys(NAMESPACE);
  expect(noIndexKeys).toMatchObject([]);
});


