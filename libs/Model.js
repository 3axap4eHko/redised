const RDB = require('./RDB');
const sanitize = require('./sanitize');

const nameProp = Symbol('namespace');
const schemaProp = Symbol('schema');
const fieldsProp = Symbol('fields');
const indexesProp = Symbol('indexes');

const entityMetaProp = Symbol('entityMeta');
const queryMetaProp = Symbol('queryMeta');

function filterEntity(data, fields, schema) {
  const entity = sanitize(data, fields, (value, field) => schema[field].filter(value));
  if (!('id' in entity)) {
    throw new Error('Entity must have id property');
  }
  entity[entityMetaProp] = {
    origin: { ...entity },
  };
  return entity;
}

class Model extends Function {
  constructor(name, schema) {
    super();
    this[nameProp] = name;
    this[schemaProp] = schema;
    this[fieldsProp] = Object.keys(schema);
    this[indexesProp] = this[fieldsProp].filter(key => schema[key].index);
    RDB.api.createIndexKeys(name, this[indexesProp]);
  }

  create(data) {
    const entity = filterEntity(data, this[fieldsProp], this[schemaProp]);
    entity[entityMetaProp] = {
      origin: { ...entity },
    };
    return entity;
  }

  createQuery(data) {
    const query = this[indexesProp].map(indexKey => indexKey in data ? data[indexKey] : null);
    query[queryMetaProp] = {};
    return query;
  }

  async get(id) {
    return this.create(await RDB.api.get(this[nameProp], id));
  }

  async getMany(ids) {
    return (await RDB.api.getMany(this[nameProp], ids)).map(data => this.create(data));
  }

  async find(query) {
    const values = this.createQuery(query);
    return RDB.api.find(this[nameProp], values);
  }

  async set(data) {
    return RDB.api.set(this[nameProp], this.create(data));
  }

  async setMany(dataSet) {
    return RDB.api.setMany(this[nameProp], dataSet.map(data => this.create(data)));
  }

  async del(...ids) {
    return RDB.api.del(this[nameProp], ...ids);
  }
}

module.exports = function (name, schema) {
  return new Model(name, schema);
};