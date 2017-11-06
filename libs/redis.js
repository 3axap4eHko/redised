const redis = require('promise-redis')();
const e = require('./escape');

function getPrimaryKey(namespace, id) {
  return e(namespace, id);
}

function getIndexKey(namespace, indexKeys, data) {
  return e(namespace, data.id, ...indexKeys.map(indexKey => data[indexKey]));
}

function getIndexMask(namespace, indexKeys, data) {

  return [e(namespace), '*', ...indexKeys.map(indexKey => indexKey in data ? e(data[indexKey]) : '*')].join(e.SEPARATOR);
}

function indexKeyToId(key) {
  return key.split(e.SEPARATOR)[1];
}

function createClient(options) {

  const client = redis.createClient(options);

  const c = new Promise(resolve => client.on('connect', () => resolve(client)));

  async function keys(pattern) {
    return (await c).keys(pattern);
  }

  async function get(namespace, id) {
    const primaryKey = getPrimaryKey(namespace, id);
    return JSON.parse(await (await c).get(primaryKey));
  }

  async function getMany(namespace, ids) {
    if (!ids || !ids.length) {
      return [];
    }
    const primaryKeys = ids.map(id => getPrimaryKey(namespace, id));
    const values = (await (await c).mget(primaryKeys)).filter(value => value !== null);
    return JSON.parse(`[ ${values.join(',')} ]`);
  }

  async function find(namespace, indexKeys, data) {
    const indexMask = getIndexMask(namespace, indexKeys, data);
    const tempKeys = await keys(indexMask);
    const ids = tempKeys.map(indexKeyToId);
    return getMany(namespace, ids);
  }

  async function set(namespace, indexKeys, data) {
    const primaryKey = getPrimaryKey(namespace, data.id);
    const indexKey = getIndexKey(namespace, indexKeys, data);
    return (await c).mset(primaryKey, JSON.stringify(data), indexKey, primaryKey);
  }

  async function setMany(namespace, indexKeys, dataSet) {
    if (!dataSet || !dataSet.length) {
      return [];
    }
    const values = [];
    dataSet.forEach(data => {
      const primaryKey = getPrimaryKey(namespace, data.id);
      const indexKey = getIndexKey(namespace, indexKeys, data);
      values.push(primaryKey, JSON.stringify(data), indexKey, primaryKey);
    });
    return (await c).mset(values);
  }

  async function del(namespace, ...ids) {
    return (await c).del(ids.map(id => getPrimaryKey(namespace, id)));
  }

  async function drop() {
    return (await c).flushdb();
  }

  async function close() {
    return (await c).quit();
  }

  const db = {
    client,
    connection: c,

    get,
    getMany,
    find,

    set,
    setMany,

    del,
    drop,
    close,
  };

  c.then(() => createClient.defaultDB = db);

  return db;
}

createClient.defaultDB = null;

module.exports = createClient;