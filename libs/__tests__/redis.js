const createClient = require('../redis');

const NAMESPACE = 'test';

const INDEX_KEYS = ['index1', 'index2'];

const db = createClient();

beforeEach(async () => {
  await db.connection;
});

afterAll(() => db.close());

test('test create and delete index keys', async () => {
});
