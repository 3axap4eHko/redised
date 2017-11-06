const redis = require('promise-redis')();
const e = require('./escape');

const SCHEMA_PREFIX = `--schema`;
const KEY_INDEX_PREFIX = [SCHEMA_PREFIX, 'index'].join(e.SEPARATOR);

function getKey(prefix, ...args) {
  return [prefix, e(...args)].join(e.SEPARATOR);
}

function getPrimaryKey(namespace, id) {
  return e(namespace, id);
}

function getIndexValueKey(namespace, indexKey, data) {
  return getKey(KEY_INDEX_PREFIX, namespace, indexKey, data[indexKey]);
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

  async function setDataIndexes(namespace, indexKeys, data) {
    const primaryKey = getPrimaryKey(namespace, data.id);
    const indexKeyRefs = indexKeys.map(indexKey => getIndexValueKey(namespace, indexKey, data));
    return Promise.all(indexKeyRefs.map(async indexKeyRef => (await c).sadd(indexKeyRef, primaryKey)));
  }

  async function setDataSetIndexes(namespace, indexKeys, dataSet) {
    const indexes = {};
    dataSet.forEach(data => {
      const primaryKey = getPrimaryKey(namespace, data.id);
      indexKeys.forEach(indexKey => {
        const key = getIndexValueKey(namespace, indexKey, data);
        if (!indexes[key]) {
          indexes[key] = [];
        }
        indexes[key].push(primaryKey);
      });
    });

    return Promise.all(Object.entries(indexes).map(([key, values]) => db.client.sadd(key, values)));
  }

  async function unsetDataIndexes(namespace, indexKeys, data) {
    const primaryKey = getPrimaryKey(namespace, data.id);
    const indexKeyRefs = indexKeys.map(indexKey => getIndexValueKey(namespace, indexKey, data));
    return Promise.all(indexKeyRefs.map(async indexKeyRef => (await c).srem(indexKeyRef, primaryKey)));
  }

  async function unsetDataSetIndexes(namespace, indexKeys, dataSet) {
    const indexes = {};
    dataSet.forEach(data => {
      const primaryKey = getPrimaryKey(namespace, data.id);
      indexKeys.forEach(indexKey => {
        const key = getIndexValueKey(namespace, indexKey, data);
        if (!indexes[key]) {
          indexes[key] = [];
        }
        indexes[key].push(primaryKey);
      });
    });

    return Promise.all(Object.entries(indexes).map(([key, values]) => db.client.srem(key, values)));
  }

  async function updateDataIndexes(namespace, indexKeys, data) {
    if (!data) {
      return null;
    }
    const prevData = await get(namespace, data.id);
    await unsetDataIndexes(namespace, indexKeys, prevData);
    return setDataIndexes(namespace, indexKeys, data);
  }

  async function updateDataSetIndexes(namespace, indexKeys, dataSet) {
    if (!dataSet || !dataSet.length) {
      return null;
    }
    const ids = dataSet.map(data => data.id);
    const prevDataSet = await getMany(namespace, ids);
    await unsetDataSetIndexes(namespace, indexKeys, prevDataSet);
    return setDataSetIndexes(namespace, indexKeys, dataSet);
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

  async function add(namespace, indexKeys, data) {
    await setDataIndexes(namespace, indexKeys, data);
    const primaryKey = getPrimaryKey(namespace, data.id);
    return (await c).set(primaryKey, JSON.stringify(data));
  }

  async function addMany(namespace, indexKeys, dataSet) {
    if (!dataSet || !dataSet.length) {
      return [];
    }
    await setDataSetIndexes(namespace, indexKeys, dataSet);
    const values = [];
    dataSet.forEach(data => {
      const primaryKey = getPrimaryKey(namespace, data.id);
      values.push(primaryKey, JSON.stringify(data));
    });
    return (await c).mset(values);
  }

  async function set(namespace, indexKeys, data) {
    await updateDataIndexes(namespace, indexKeys, data);
    const primaryKey = getPrimaryKey(namespace, data.id);
    return (await c).set(primaryKey, JSON.stringify(data));
  }

  async function setMany(namespace, indexKeys, dataSet) {
    if (!dataSet || !dataSet.length) {
      return [];
    }
    await updateDataSetIndexes(namespace, indexKeys, dataSet);
    const values = [];
    dataSet.forEach(data => {
      const primaryKey = getPrimaryKey(namespace, data.id);
      values.push(primaryKey, JSON.stringify(data));
    });
    return (await c).mset(values);
  }

  async function del(namespace, ...ids) {
    await updateDataSetIndexes(namespace, ids.map(id => ({ id })));
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

    getNamespaceIndexKeys,
    createNamespaceIndexKeys,
    deleteNamespaceIndexKeys,

    setDataIndexes,
    setDataSetIndexes,

    unsetDataIndexes,
    unsetDataSetIndexes,

    updateDataIndexes,
    updateDataSetIndexes,

    get,
    getMany,
    find,

    add,
    addMany,

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