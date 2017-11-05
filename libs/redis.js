const redis = require('promise-redis')();
const diff = require('./diff');
const e = require('./escape');

const SCHEMA_PREFIX = `--schema`;
const KEY_INDEX_PREFIX = [SCHEMA_PREFIX, 'index-key'].join(e.SEPARATOR);
const FULL_INDEX_PREFIX = [SCHEMA_PREFIX, 'full-index-key'].join(e.SEPARATOR);

function getKey(prefix, ...args) {
  return [prefix, e(...args)].join(e.SEPARATOR);
}

function getPrimaryKey(namespace, id) {
  return e(namespace, id);
}

function getIndexValueKey(namespace, indexKey, data) {
  return getKey(KEY_INDEX_PREFIX, namespace, indexKey, data[indexKey]);
}

function getFullIndexKey(namespace, indexKeys, data) {
  const values = indexKeys.map(key => data[key]);
  return getKey(FULL_INDEX_PREFIX, namespace, data.id, ...values);
}

function fullIndexKeyToId(key) {
  return key.split(e.SEPARATOR)[7];
}
function indexKeyToId(key) {
  return key.split(e.SEPARATOR)[5];
}
function primaryKeyToId(key) {
  return key.split(e.SEPARATOR)[1];
}

function createClient(options) {

  const client = redis.createClient(options);

  const c = new Promise(resolve => client.on('connect', () => resolve(client)));

  async function getNamespaceIndexKeys(namespace) {
    return (await (await c).smembers(getKey(KEY_INDEX_PREFIX, namespace)));
  }

  async function createNamespaceIndexKeys(namespace, keys) {
    return (await c).sadd(getKey(KEY_INDEX_PREFIX, namespace), ...keys);
  }

  async function deleteNamespaceIndexKeys(namespace, keys) {
    return (await c).srem(getKey(KEY_INDEX_PREFIX, namespace), ...keys);
  }

  async function setIndexes(namespace, indexKeys, data) {
    const primaryKey = getPrimaryKey(namespace, data.id);
    const indexKeyRefs = indexKeys.map(indexKey => getIndexValueKey(namespace, indexKey, data));
    return Promise.all(indexKeyRefs.map(async indexKeyRef => (await c).sadd(indexKeyRef, primaryKey)));
  }
  async function unsetIndexes(namespace, indexKeys, data) {
    const primaryKey = getPrimaryKey(namespace, data.id);
    const indexKeyRefs = indexKeys.map(indexKey => getIndexValueKey(namespace, indexKey, data));
    return Promise.all(indexKeyRefs.map(async indexKeyRef => (await c).srem(indexKeyRef, primaryKey)));
  }
  async function updateIndexes(namespace, data) {
    if (!data) {
      return null;
    }
    const indexKeys = await getNamespaceIndexKeys(namespace);
    const prevData = await get(namespace, data.id);
    const unDiff = diff(data, prevData);
    await unsetIndexes(namespace, indexKeys, unDiff);
    const upDiff = diff(prevData, data);
    return setIndexes(namespace, indexKeys, upDiff);
  }

  async function keys(namespace, subPattern) {
    const pattern = [getKey(FULL_INDEX_PREFIX, namespace), '*', subPattern].join(e.SEPARATOR);
    return (await c).keys(pattern);
  }

  async function get(namespace, id) {
    const primaryKey = getPrimaryKey(namespace, id);
    return JSON.parse(await (await c).get(primaryKey));
  }

  async function getMany(namespace, ids) {
    const primaryKeys = ids.map(id => getPrimaryKey(namespace, id));
    const values = await (await c).mget(primaryKeys);
    return JSON.parse(`[ ${values.join(',')} ]`);
  }

  async function find(namespace, query) {
    const indexKeys = Object.keys(query).map(key => getIndexValueKey(namespace, key, query));
    const [resultSet, ...primaryKeysSets] = await Promise.all(indexKeys.map(async indexKey => new Set(await (await c).smembers(indexKey))));
    const tempKeys = new Set(resultSet);
    tempKeys.forEach(primaryKey => {
      const isCommon = primaryKeysSets.every(primaryKeysSet => primaryKeysSet.has(primaryKey));
      if (!isCommon) {
        resultSet.delete(primaryKey);
      }
    });
    const ids = Array.from(tempKeys).map(primaryKeyToId);
    return getMany(namespace, ids);
  }

  async function set(namespace, data) {
    await updateIndexes(namespace, data);
    const primaryKey = getPrimaryKey(namespace, data.id);
    return (await c).set(primaryKey, JSON.stringify(data));
  }

  async function setMany(namespace, dataSet, reindex = true) {
    const pairs = await Promise.all(dataSet.map(async data => {
      await updateIndexes(namespace, reindex ? data : null);
      return [
        getPrimaryKey(namespace, data.id),
        JSON.stringify(data),
      ];
    }));
    return (await c).mset(...pairs.reduce((result, pair) => result.concat(pair), []));
  }

  async function del(namespace, ...ids) {
    await updateIndexes(namespace, {});
    return (await c).del(getPrimaryKey(namespace, ...ids));
  }

  async function drop() {
    return (await c).flushall();
  }

  async function close() {
    return (await c).quit();
  }

  const db = {
    client,
    connection: c,

    getNamespaceIndexKeys,
    createNamespaceIndexKeys,
    deleteNamespaceIndexKeys,

    setIndexes,
    unsetIndexes,
    updateIndexes,

    keys,

    get,
    getMany,
    find,

    set,
    setMany,

    del,
    drop,
    close,
  };

  c.then(() => createClient.defaultClient = db);

  return db;
}

createClient.defaultClient = null;

module.exports = createClient;