const createClient = require('./redis');
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
  }

  get db() {
    if (createClient.defaultDB === null) {
      throw new Error('Attempt to access db before connection');
    }
    return createClient.defaultDB;
  }

  create(data) {
    const entity = filterEntity(data, this[fieldsProp], this[schemaProp]);
    entity[entityMetaProp] = {
      origin: { ...entity },
    };
    return entity;
  }

  getIndexKeys() {
    return this[indexesProp].slice();
  }

  async get(id) {
    return this.create(await this.db.get(this[nameProp], id));
  }

  async getMany(ids) {
    return (await this.db.getMany(this[nameProp], ids)).map(data => this.create(data));
  }

  async find(query) {
    const data = this[indexesProp].reduce((result, indexKey) => {
      if (indexKey in query) {
        result[indexKey] = query[indexKey];
      }
      return result;
    }, {
      [queryMetaProp]: {},
    });
    return this.db.find(this[nameProp], this[indexesProp], data);
  }

  async add(data) {
    return this.db.add(this[nameProp], this[indexesProp], this.create(data));
  }

  async addMany(dataSet) {
    return this.db.addMany(this[nameProp], this[indexesProp], dataSet.map(data => this.create(data)));
  }

  async set(data) {
    return this.db.set(this[nameProp], this[indexesProp], this.create(data));
  }

  async setMany(dataSet) {
    return this.db.setMany(this[nameProp], this[indexesProp], dataSet.map(data => this.create(data)));
  }

  async del(...ids) {
    return this.db.del(this[nameProp], ...ids);
  }
}

module.exports = function (name, schema) {
  return new Model(name, schema);
};