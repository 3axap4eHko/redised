const { createClient } = require('promise-redis')();
const diff = require('./diff');
const e = require('./escape');

const SCHEMA_PREFIX = `--schema`;
const INDEX_PREFIX = [SCHEMA_PREFIX, 'index'].join(e.SEPARATOR);

function getIndexed(...args) {
  return [INDEX_PREFIX, e(...args)].join(e.SEPARATOR);
}

function getIndexesKey(namespace) {
  return getIndexed(namespace);
}

function getPrimaryKey(namespace, id) {
  return e(namespace, id);
}

function getFullIndexKey(namespace, indexKeys, data) {
  const values = indexKeys.map(key => data[key]);
  return getIndexed(namespace, data.id, ...values);
}

function indexKeyToId(key) {
  return key.split(e.SEPARATOR)[5];
}

module.exports = function (options) {

  const client = createClient(options);

  const c = new Promise(resolve => client.on('connect', () => resolve(client)));

  async function getIndexKeys(namespace) {
    return (await c).smembers(getIndexesKey(namespace));
  }

  async function createIndexKeys(namespace, keys) {
    return (await c).sadd(getIndexesKey(namespace), ...keys);
  }

  async function deleteIndexKeys(namespace, keys) {
    return (await c).srem(getIndexesKey(namespace), ...keys);
  }

  async function setIndexes(namespace, indexKeys, data) {
    const fullIndexRef = getFullIndexKey(namespace, indexKeys, data);
    const primaryKey = getPrimaryKey(namespace, data.id);
    return (await c).set(fullIndexRef, primaryKey);
  }

  async function unsetIndexes(namespace, indexKeys, data) {
    const fullIndexKey = getFullIndexKey(namespace, indexKeys, data);
    return (await c).del(fullIndexKey);
  }

  async function updateIndexes(namespace, data) {
    if (!data) {
      return null;
    }
    const indexKeys = await getIndexKeys(namespace);
    const prevData = await get(namespace, data.id);
    const unDiff = diff(data, prevData);
    await unsetIndexes(namespace, indexKeys, unDiff);
    const upDiff = diff(prevData, data);
    return setIndexes(namespace, indexKeys, upDiff);
  }

  async function keys(namespace, subPattern) {
    const pattern = [getIndexed(namespace), '*', subPattern].join(e.SEPARATOR);
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

  async function find(namespace, values) {
    const subPattern = values.map(value => value === null ? '*' : e(value)).join(e.SEPARATOR);
    const matchedKeys = await keys(namespace, subPattern);
    const ids = matchedKeys.map(indexKeyToId);
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

  return {
    client,
    connection: c,

    getIndexKeys,
    createIndexKeys,
    deleteIndexKeys,

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
};